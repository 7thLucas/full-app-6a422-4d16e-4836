import { randomUUID } from "node:crypto";
import type { Request } from "express";
import mongoose from "mongoose";
import { createLogger } from "~/lib/logger";
import { AuditLogModel } from "../models/audit.model";
import { JudgmentConfigModel } from "../models/config.model";
import { normalizeGeneratedConfigPayload, validateConfigPayload } from "../lib/judgment.utils";

const logger = createLogger("JudgmentConfigService");

export const SINGLE_CONFIG_SCHEMA = {
  type: "object",
  properties: {
    pluginId: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    rules: { type: "string", minLength: 1 },
    outputSchema: { type: "object" },
    inputSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        type: { type: "string", minLength: 1 },
        properties: { type: "object", additionalProperties: { type: "object", additionalProperties: true } },
        required: { type: "array", items: { type: "string", minLength: 1 } },
      },
      required: ["type", "properties", "required"],
    },
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          id: { type: "string", minLength: 1 },
          category: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          passCriteria: { type: "string", minLength: 1 },
          severity: { type: "string", minLength: 1 },
          weight: { type: "number" },
          autoFailIfMissing: { type: "boolean" },
        },
        required: ["id", "category", "name", "passCriteria", "severity", "weight", "autoFailIfMissing"],
      },
    },
    variables: {
      type: "object",
      additionalProperties: true,
      properties: {
        labels: {
          type: "object",
          additionalProperties: true,
          properties: {
            unitLabel: { type: "string", minLength: 1 },
            workerLabel: { type: "string", minLength: 1 },
            managerLabel: { type: "string", minLength: 1 },
          },
          required: ["unitLabel", "workerLabel", "managerLabel"],
        },
        actions: {
          type: "object",
          additionalProperties: true,
          properties: { defaultTaskDueHours: { type: "number" } },
          required: ["defaultTaskDueHours"],
        },
        dashboard: {
          type: "object",
          additionalProperties: true,
          properties: {
            title: { type: "string", minLength: 1 },
            company: { type: "string", minLength: 1 },
          },
          required: ["title", "company"],
        },
      },
      required: ["labels", "actions", "dashboard"],
    },
  },
  required: ["pluginId", "name", "rules", "inputSchema", "criteria", "variables"],
} as const;

export const PARSE_CONFIG_ENVELOPE_SCHEMA = {
  type: "object",
  properties: {
    configs: {
      type: "array",
      items: SINGLE_CONFIG_SCHEMA,
    },
  },
  required: ["configs"],
} as const;

function buildConfigLookupQuery(configId: string | string[]) {
  const configKey = Array.isArray(configId) ? configId[0] : configId;
  const query: Record<string, unknown>[] = [{ pluginId: configKey }];
  if (mongoose.isValidObjectId(configKey)) {
    query.push({ _id: new mongoose.Types.ObjectId(configKey) });
  }
  return { $or: query };
}


export async function parseConfig(file: Express.Multer.File, req: Request) {
  if (!process.env.QB_SCAFFOLDER_KEY) {
    throw new Error("QB_SCAFFOLDER_KEY is not set. Cannot parse document without LLM access.");
  }

  const DOCUMENT_TO_CONFIG_PROMPT = [
    "You are an AI assistant specializing in insurance and financial services compliance. You read compliance SOPs, regulatory policy documents, and training materials for insurance/finance organizations (AML, KYC, FATCA, employee onboarding, license renewals, risk assessments, etc.) and convert them into structured evaluation configuration objects for an automated audit system.",
    "",
    "DOMAIN FOCUS: Any organizational compliance, regulatory, or policy domain. Analyze the document as-is and map it to the most appropriate compliance context.",
    "",
    "Your task:",
    "1. Analyze the uploaded document carefully.",
    "2. Identify EVERY distinct submission context — a 'submission context' is a separate form an employee would fill out independently.",
    "3. Generate ONE config object per identified submission context.",
    "4. Return a JSON OBJECT with a single key named 'configs'.",
    "5. The value of 'configs' must be an array of config objects — even if only one context is found, still return an array.",
    "6. Extract only what is explicitly supported by the source document.",
    "7. Keep fields and criteria concise. Prefer a shorter, more general config over speculative detail.",
    "",
    "CRITICAL — inputSchema rules:",
    "- ALWAYS include these 4 fields in EVERY config's inputSchema, regardless of document content:",
    "  - employeeName: { type: 'string', title: 'Employee Name', description: 'Full name of the employee submitting this form.' }",
    "  - employeeEmail: { type: 'string', title: 'Employee Email', description: 'Work email address of the submitting employee.' }",
    "  - department: { type: 'string', title: 'Department', description: 'Department the employee belongs to.' }",
    "  - evidenceText: { type: 'string', title: 'Evidence / Notes', description: 'Supporting notes, observations, or evidence related to this submission.' }",
    "- ALWAYS include all 4 of the above in the 'required' array.",
    "- DO NOT add any field for scores, numeric thresholds, ratings, grades, or pass/fail percentages as user input fields. If the document mentions thresholds (e.g. 'Minimum passing score: 80%', 'At least 3 out of 5 criteria must pass'), embed that threshold directly into the relevant criterion's passCriteria text so the AI evaluator can infer it — do NOT create a user-input field for it.",
    "- For additional document-specific fields beyond the 4 standard ones:",
    "  - For text: type 'string' with title and description.",
    "  - For checkboxes/acknowledgements: type 'boolean'.",
    "  - For a single file upload (certificates, signed forms, etc.): type 'string', add 'x-ui': {'widget': 'file'}.",
    "  - For multiple file uploads: type 'array', items {'type': 'string'}, add 'x-ui': {'widget': 'file'}.",
    "  - If the document requires uploading a certificate, signed document, or proof file, mark that file field as required.",
    "",
    "For each config object follow these rules:",
    "- pluginId: Unique URL-safe slug (lowercase, alphanumeric, underscores/hyphens/dots, e.g. 'aml-training-q2' or 'kyc.onboarding_check').",
    "- name: Official title for this specific submission context.",
    "- rules: A concise instruction prompt for an AI evaluator written in second person. Mention any numeric thresholds or minimum standards from the document (e.g. 'The employee must have scored at least 80% on the AML quiz'). Keep it focused on what to review and judge.",
    "- criteria: Extract key assessment rules for this context.",
    "  - id: unique string starting with 'criterion_'.",
    "  - category: compliance category (e.g. 'AML Training', 'KYC Documentation', 'License & Certification').",
    "  - name: short human-readable criterion name.",
    "  - passCriteria: precise condition to pass, including any numeric thresholds found in the document (e.g. 'Employee achieved a minimum score of 80% on the AML assessment.').",
    "  - severity: one of 'low', 'medium', 'high', 'critical'.",
    "  - weight: number 1-100.",
    "  - autoFailIfMissing: boolean.",
    "  - Keep criteria small and only include what is clearly grounded in the document.",
    "- variables:",
    "  - labels: unitLabel (e.g. 'Branch'), workerLabel: 'Employee', managerLabel: 'HR Manager'.",
    "  - actions: defaultTaskDueHours (number, default 72).",
    "  - dashboard: title (e.g. 'Training Compliance Dashboard'), company (extracted from document or 'Organization').",
    "",
    "Return ONLY a raw JSON object (no markdown, no code block, no extra text) that conforms exactly to the schema above.",
  ].join("\n");
  // const DOCUMENT_TO_CONFIG_PROMPT = 'what is capital of indonesia?'

  const form = new FormData();
  const parseMessage = "Analyze the uploaded document and generate evaluation configs for each distinct submission context found.";
  form.set("message", parseMessage);
  form.set("schema", JSON.stringify(PARSE_CONFIG_ENVELOPE_SCHEMA));
  form.set("system_prompt", DOCUMENT_TO_CONFIG_PROMPT);

  const blob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || "application/octet-stream",
  });
  form.append("files", blob, file.originalname || "file");

  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto =
    typeof forwardedProto === "string" && forwardedProto.length > 0
      ? forwardedProto.split(",")[0].trim()
      : req.protocol;
  const host = req.get("host") || `localhost:${process.env.PORT || 3000}`;
  const baseUrl = `${proto}://${host}`;
  const idempotencyKey = `parse-${Date.now()}-${randomUUID()}`;

  const response = await fetch(`${baseUrl}/api/agents/llm`, {
    method: "POST",
    body: form,
    headers: {
      "idempotency-key": idempotencyKey,
    },
  });

  const rawText = await response.text();
  let payload: {
    success?: boolean;
    message?: string | unknown;
    data?: {
      response?: unknown;
      [key: string]: unknown;
    };
  };

  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = { message: rawText || "Invalid JSON response from LLM service." };
  }

  logger.error("parseConfig LLM response", {
    status: response.status,
    ok: response.ok,
    idempotencyKey,
    rawText,
    payload,
    schemaPreview: PARSE_CONFIG_ENVELOPE_SCHEMA,
  });

  if (!response.ok || !payload.success || !payload.data) {
    const detail =
      typeof payload.message === "string"
        ? payload.message
        : payload.data && typeof payload.data === "object" && "error" in payload.data
          ? String((payload.data as { error?: unknown }).error)
          : rawText || "Failed to invoke LLM";

    throw new Error(detail);
  }

  const rawResult = (payload.data.response as unknown) ?? payload.data;
  const configsValue =
    rawResult && typeof rawResult === "object" && "configs" in (rawResult as Record<string, unknown>)
      ? (rawResult as { configs?: unknown }).configs
      : rawResult;

  // Keep compatibility with previous formats, but normalize current single-object mode to an array for the UI.
  const configsArray: any[] = Array.isArray(configsValue) ? configsValue : [configsValue];

  const OUTPUT_SCHEMA = {
    type: "object",
    properties: {
      id: { type: "string" },
      evidenceSubmissionId: { type: "string" },
      criterionId: { type: "string" },
      verdict: { type: "string", enum: ["pass", "partial", "fail", "risk", "ready", "not_ready"] },
      score: { type: "number", minimum: 0, maximum: 100 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
      reason: { type: "string" },
      fixSuggestion: { type: "string" },
      requiresHumanReview: { type: "boolean" },
      provider: { type: "string" },
      model: { type: "string" },
      resultData: {
        type: "object",
        properties: {
          complianceStatus: { type: "string", enum: ["Compliant", "Non-Compliant"] },
          missingItems: { type: "array", items: { type: "string" } },
          auditTrail: { type: "array", items: { type: "object" } }
        }
      }
    },
    required: ["id", "evidenceSubmissionId", "criterionId", "verdict", "score", "confidence", "severity", "reason", "fixSuggestion", "requiresHumanReview"]
  };

  return configsArray.map((cfg) => {
    const normalizedConfig = normalizeGeneratedConfigPayload({
      ...(cfg && typeof cfg === "object" ? cfg : {}),
      outputSchema: OUTPUT_SCHEMA,
    });
    validateConfigPayload(normalizedConfig);
    return normalizedConfig;
  });
}

export async function listConfigs() {
  return JudgmentConfigModel.find({}).sort({ createdAt: -1 });
}

export async function createConfigRecord(payload: Record<string, unknown>) {
  validateConfigPayload(payload);
  const config = await JudgmentConfigModel.create(payload);
  await AuditLogModel.create({
    configId: config.pluginId,
    eventType: "config_created",
    payload: { name: config.name, pluginId: config.pluginId },
    timestamp: new Date(),
  });
  return config;
}

export async function findConfigById(configId: string | string[]) {
  return JudgmentConfigModel.findOne(buildConfigLookupQuery(configId));
}

export async function updateConfigRecord(configId: string | string[], payload: Record<string, unknown>) {
  const config = await findConfigById(configId);
  if (!config) return null;

  validateConfigPayload({
    ...config.toObject(),
    ...payload,
  });

  const allowedFields = ["name", "rules", "inputSchema", "outputSchema", "criteria", "variables"];
  for (const key of allowedFields) {
    if (payload[key] !== undefined) {
      (config as any)[key] = payload[key];
    }
  }

  await config.save();
  return config;
}

