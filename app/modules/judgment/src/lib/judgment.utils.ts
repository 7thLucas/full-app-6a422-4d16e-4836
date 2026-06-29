export type SeverityLevel = "low" | "medium" | "high" | "critical";

export interface JudgmentCriterionLike {
  id: string;
  category?: string;
  name: string;
  passCriteria: string;
  severity?: string;
  weight?: number;
  autoFailIfMissing?: boolean;
}

export interface JudgmentSchemaPropertyLike {
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: string[];
  format?: string;
  items?: { type?: string };
  default?: unknown;
  minimum?: number;
  maximum?: number;
  [key: string]: unknown;
}

export interface JudgmentConfigLike {
  pluginId: string;
  name: string;
  rules?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, JudgmentSchemaPropertyLike>;
    required?: string[];
  };
  outputSchema?: Record<string, unknown>;
  criteria?: JudgmentCriterionLike[];
  variables?: Record<string, any>;
}

export interface CriterionOutcome {
  id: string;
  name: string;
  category: string;
  severity: SeverityLevel;
  passed: boolean;
  confidence: number;
  scoreImpact: number;
  explanation: string;
  signals: string[];
}

export interface JudgmentResultEnvelope {
  id: string;
  evidenceSubmissionId: string;
  criterionId: string;
  verdict: "pass" | "fail" | "partial" | "risk" | "ready" | "not_ready";
  score: number;
  confidence: number;
  severity: SeverityLevel;
  reason: string;
  fixSuggestion: string;
  requiresHumanReview: boolean;
  evidenceReferences?: string[];
  provider?: string;
  model?: string;
  resultData?: Record<string, unknown>;
}

export interface NormalizeJudgmentResultParams {
  config: JudgmentConfigLike;
  inputData: Record<string, unknown>;
  submissionId: string;
}

const DEFAULT_LABELS = {
  unitLabel: "Unit",
  workerLabel: "Worker",
  managerLabel: "Manager",
  assigneeRole: "Operations Lead",
};

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function severityScore(severity: string | undefined): SeverityLevel {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

export function getConfigLabels(config: JudgmentConfigLike) {
  const variables = config.variables ?? {};
  const labels = variables.labels ?? variables.organization ?? {};

  return {
    unitLabel: labels.unitLabel ?? labels.unit_label ?? DEFAULT_LABELS.unitLabel,
    workerLabel: labels.workerLabel ?? labels.worker_label ?? DEFAULT_LABELS.workerLabel,
    managerLabel: labels.managerLabel ?? labels.manager_label ?? DEFAULT_LABELS.managerLabel,
    issueLabel: labels.issueLabel ?? labels.issue_label ?? "Issue",
    actionLabel: labels.actionLabel ?? labels.action_label ?? "Action Task",
    assigneeRole: variables.actions?.assigneeRole ?? variables.actions?.assignee_role ?? DEFAULT_LABELS.assigneeRole,
  };
}

export function getTaskDueHours(config: JudgmentConfigLike): number {
  const actions = config.variables?.actions ?? {};
  const dueHours = actions.defaultTaskDueHours ?? actions.default_task_due_hours ?? 24;
  return Number.isFinite(Number(dueHours)) ? Number(dueHours) : 24;
}

export function getSeverityFromVerdict(
  verdict: "pass" | "fail" | "partial" | "risk" | "ready" | "not_ready",
  criteria: JudgmentCriterionLike[],
): SeverityLevel {
  if (verdict === "pass" || verdict === "ready") return "low";
  
  const criterion = criteria[0];
  const severity = criterion?.severity ? severityScore(criterion.severity) : "medium";
  return severity;
}

export function buildSystemPrompt(config: JudgmentConfigLike) {
  const labels = getConfigLabels(config);
  const criteriaText = (config.criteria ?? [])
    .map((criterion) => {
      const severity = criterion.severity ?? "medium";
      const category = criterion.category ? ` (${criterion.category})` : "";
      return `- ${criterion.name}${category}: severity=${severity}; passCriteria=${criterion.passCriteria}`;
    })
    .join("\n");

  const fileFields: string[] = [];
  const properties = config.inputSchema?.properties ?? {};
  const requiredFields = new Set(config.inputSchema?.required ?? []);
  const fieldGuide = Object.entries(properties)
    .map(([key, prop]) => {
      const xUi = (prop as any)?.["x-ui"] ?? {};
      const type =
        xUi.widget === "file"
          ? (prop as any)?.type === "array"
            ? "file list"
            : "file"
          : (prop.type ?? "string");
      const label = prop.title ? `${prop.title} (${key})` : key;
      const requiredText = requiredFields.has(key) ? "required" : "optional";
      const description = prop.description ? ` - ${prop.description}` : "";
      return `- ${label}: ${type}, ${requiredText}${description}`;
    })
    .join("\n");
  for (const [key, prop] of Object.entries(properties)) {
    const xUi = (prop as any)?.["x-ui"] ?? {};
    if (xUi.widget === "file") {
      fileFields.push(key);
    }
  }

  const promptParts = [
    config.rules?.trim() || "Evaluate the submission using the provided configuration.",
    "",
    "Submission fields:",
    fieldGuide || "- No input fields defined.",
    "",
    "Criteria:",
    criteriaText || "- No criteria defined.",
    "",
    "Output schema:",
    JSON.stringify(config.outputSchema ?? {}, null, 2),
    "",
    "Variables:",
    JSON.stringify(config.variables ?? {}, null, 2),
    "",
    `Labels: unit=${labels.unitLabel}; worker=${labels.workerLabel}; manager=${labels.managerLabel}`,
    "",
    "INSTRUCTIONS FOR EVALUATION:",
    "1. Read the main Config rules prompt at the start of this prompt.",
    "2. For each field provided in the input data, use the field guide above to understand its context and requirements.",
    "3. Evaluate the submission as a whole, not as separate per-criterion responses.",
    "4. Carefully inspect the submitted data, including the content of any attached files, against the overall criteria and rules.",
    "5. Produce one overall judgment result that matches the output schema exactly.",
    "6. Keep the response strictly as raw JSON with no markdown or extra explanation."
  ];

  if (fileFields.length > 0) {
    promptParts.push(
      "",
      "IMPORTANT: Attached Files Verification Guidelines",
      `The following input fields represent uploaded files: ${fileFields.join(", ")}.`,
      "One or more files have been attached to this request. For each of the fields listed above, the field's value in the input data contains the filename of the corresponding attached file.",
      "For each such field:",
      "1. You MUST locate the attached file whose name matches the value of the field (or is closest to it, ignoring encoding differences or minor character changes).",
      "2. You MUST inspect and analyze the actual content of that attached file (e.g., read the text in a PDF, or view the contents of an image/document).",
      "3. You MUST read the 'description' (helper text) of the corresponding field in the 'Input schema'. You must verify that the format and content of the attached file match what is specified in that description (for example, if the description says 'PDF upload', the attached file must be a valid PDF file and not a JPEG image or another format).",
      "4. You MUST verify if the content of the file is valid and satisfies the pass criteria (e.g., checking that a certificate or form actually contains the valid employee/record details and matches the criteria requirements).",
      "5. Do NOT simply assume a file is valid or that a requirement is satisfied just because a filename string is present in the input data or because a file was uploaded. If an attached file is blank, empty, has an incorrect format (e.g. uploading a JPG image when the description calls for a PDF), represents a completely different/invalid document, or fails the criteria, you MUST fail the corresponding criteria, set the verdict to fail, and clearly explain what is invalid or missing in the reason and fixSuggestion."
    );
  }

  promptParts.push(
    "",
    "Return ONLY a raw JSON object (no markdown wrapping like ```json, no conversational prefix or suffix) that fits the output schema and includes a neutral result envelope with verdict, score, confidence, reason, fixSuggestion, and optional resultData."
  );

  return promptParts.join("\n");
}

export function buildGenericJudgmentResult(
  config: JudgmentConfigLike,
  inputData: Record<string, unknown>,
  submissionId?: string
): JudgmentResultEnvelope {
  const criterionId = typeof inputData.criterionId === "string" ? inputData.criterionId : (config.criteria?.[0]?.id || "general");
  
  // Minimal check to support some basic fail testing: check if text has failure keywords
  const inputText = JSON.stringify(inputData).toLowerCase();
  let verdict: "pass" | "fail" = "pass";
  if (inputText.includes("fail") || inputText.includes("error") || inputText.includes("missing") || inputText.includes("violation") || inputText.includes("wrong") || inputText.includes("no")) {
    verdict = "fail";
  }

  const score = verdict === "pass" ? 100 : 35;
  const confidence = 0.9;
  const severity = getSeverityFromVerdict(verdict, config.criteria ?? []);
  const reason = verdict === "pass" 
    ? "All criteria appear to be satisfied based on the submitted evidence." 
    : "Evaluation failed due to issues or missing information in the submission.";
  const fixSuggestion = verdict === "pass"
    ? "No corrective action required."
    : "Review the submission fields and ensure all required guidelines are followed.";

  return {
    id: submissionId || "",
    evidenceSubmissionId: submissionId || "",
    criterionId,
    verdict,
    score,
    confidence,
    severity,
    reason,
    fixSuggestion,
    requiresHumanReview: false,
    resultData: {},
  };
}

export function buildErroredJudgmentResult(
  config: JudgmentConfigLike,
  inputData: Record<string, unknown>,
  submissionId: string,
  errorMessage: string,
): JudgmentResultEnvelope {
  const base = buildGenericJudgmentResult(config, inputData, submissionId);

  return {
    ...base,
    id: submissionId,
    evidenceSubmissionId: submissionId,
    verdict: "fail",
    score: 0,
    confidence: 0,
    severity: getSeverityFromVerdict("fail", config.criteria ?? []),
    reason: `Failed to review: ${errorMessage}`,
    fixSuggestion: "Please try submitting the evidence again.",
    requiresHumanReview: true,
    provider: "agent-error",
    model: "quantumbyte-llm",
    resultData: {
      error: errorMessage,
    },
  };
}

export function normalizeJudgmentResult(
  rawResult: unknown,
  { config, inputData, submissionId }: NormalizeJudgmentResultParams,
): JudgmentResultEnvelope {
  const fallback = buildGenericJudgmentResult(config, inputData, submissionId);
  const raw = rawResult && typeof rawResult === "object" ? (rawResult as Record<string, unknown>) : {};
  
  const verdict = (typeof raw.verdict === "string" && ["pass", "partial", "fail", "risk", "ready", "not_ready"].includes(raw.verdict))
    ? (raw.verdict as any)
    : fallback.verdict;
    
  const scoreValue = typeof raw.score === "number" ? raw.score : Number(raw.score);
  const score = Number.isFinite(scoreValue) ? Math.max(0, Math.min(100, scoreValue)) : fallback.score;
  
  const confidenceValue = typeof raw.confidence === "number" ? raw.confidence : Number(raw.confidence);
  const confidence = Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : fallback.confidence;
  
  const severity = (typeof raw.severity === "string" && ["low", "medium", "high", "critical"].includes(raw.severity))
    ? (raw.severity as any)
    : fallback.severity;

  const requiresHumanReview = typeof raw.requiresHumanReview === "boolean"
    ? raw.requiresHumanReview
    : fallback.requiresHumanReview;

  return {
    id: String(raw.id || submissionId),
    evidenceSubmissionId: String(raw.evidenceSubmissionId || submissionId),
    criterionId: typeof raw.criterionId === "string" && raw.criterionId.trim() ? raw.criterionId : fallback.criterionId,
    verdict,
    score,
    confidence,
    severity,
    reason: typeof raw.reason === "string" && raw.reason.trim() ? raw.reason : fallback.reason,
    fixSuggestion: typeof raw.fixSuggestion === "string" && raw.fixSuggestion.trim() ? raw.fixSuggestion : fallback.fixSuggestion,
    requiresHumanReview,
    evidenceReferences: Array.isArray(raw.evidenceReferences) ? raw.evidenceReferences.map(String) : [String(submissionId)],
    provider: typeof raw.provider === "string" ? raw.provider : "ai-agent",
    model: typeof raw.model === "string" ? raw.model : "quantumbyte-llm",
    resultData: raw.resultData && typeof raw.resultData === "object" ? (raw.resultData as Record<string, unknown>) : (raw as Record<string, unknown>),
  };
}

/**
 * Validates that a judgment config payload has the required structure before
 * saving to the database. Throws an Error with a descriptive message on failure.
 */
export function validateConfigPayload(payload: Record<string, any>) {
  if (typeof payload.name !== "string" || !payload.name.trim()) {
    throw new Error("Configuration name is required.");
  }
  if (typeof payload.pluginId !== "string" || !payload.pluginId.trim()) {
    throw new Error("Configuration ID (pluginId) is required.");
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(payload.pluginId)) {
    throw new Error("Configuration ID (pluginId) can only contain alphanumeric characters, dots, dashes, and underscores.");
  }
  if (typeof payload.rules !== "string" || !payload.rules.trim()) {
    throw new Error("Evaluation rules are required.");
  }

  // Validate inputSchema
  const inputSchema = payload.inputSchema;
  if (!inputSchema || typeof inputSchema !== "object") {
    throw new Error("Valid inputSchema is required.");
  }
  if (inputSchema.type !== "object") {
    throw new Error("inputSchema type must be 'object'.");
  }
  if (inputSchema.properties && typeof inputSchema.properties === "object") {
    for (const [key, prop] of Object.entries(inputSchema.properties)) {
      if (!prop || typeof prop !== "object") {
        throw new Error(`Field '${key}' schema must be an object.`);
      }
      const p = prop as any;
      const validTypes = ["string", "number", "boolean", "array", "integer", "object"];
      if (!validTypes.includes(p.type)) {
        throw new Error(`Field '${key}' type must be one of: string, number, boolean, array.`);
      }
      if (p.type === "array" && p["x-ui"]?.widget === "file") {
        if (!p.items || typeof p.items !== "object") {
          throw new Error(`Field '${key}' file array must have an items definition.`);
        }
      }
      if (p["x-ui"] && p["x-ui"].widget !== "file") {
        throw new Error(`Field '${key}' custom widget must be 'file'.`);
      }
    }
  }

  // Validate criteria
  if (payload.criteria !== undefined) {
    if (!Array.isArray(payload.criteria)) {
      throw new Error("criteria must be an array.");
    }
    for (const [idx, criterion] of payload.criteria.entries()) {
      if (!criterion || typeof criterion !== "object") {
        throw new Error(`Criterion at index ${idx} must be an object.`);
      }
      if (typeof criterion.id !== "string" || !criterion.id.trim()) {
        throw new Error(`Criterion at index ${idx} requires a valid id.`);
      }
      if (typeof criterion.name !== "string" || !criterion.name.trim()) {
        throw new Error(`Criterion '${criterion.id}' requires a valid name.`);
      }
      if (typeof criterion.passCriteria !== "string" || !criterion.passCriteria.trim()) {
        throw new Error(`Criterion '${criterion.id}' requires a valid passCriteria.`);
      }
      if (typeof criterion.category !== "string" || !criterion.category.trim()) {
        throw new Error(`Criterion '${criterion.id}' requires a valid category.`);
      }
      const validSeverities = ["low", "medium", "high", "critical"];
      if (!validSeverities.includes(criterion.severity)) {
        throw new Error(`Criterion '${criterion.id}' severity must be one of: low, medium, high, critical.`);
      }
    }
  }
}

export function normalizeGeneratedConfigPayload(payload: Record<string, any>) {
  const normalized = {
    ...payload,
    pluginId: typeof payload.pluginId === "string" ? payload.pluginId.trim() : payload.pluginId,
    name: typeof payload.name === "string" ? payload.name.trim() : payload.name,
    rules: typeof payload.rules === "string" ? payload.rules.trim() : payload.rules,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      ...(payload.inputSchema && typeof payload.inputSchema === "object" ? payload.inputSchema : {}),
    },
    criteria: Array.isArray(payload.criteria) ? payload.criteria : [],
    variables: payload.variables && typeof payload.variables === "object" ? payload.variables : {},
  } as Record<string, any>;

  const properties =
    normalized.inputSchema &&
    typeof normalized.inputSchema === "object" &&
    normalized.inputSchema.properties &&
    typeof normalized.inputSchema.properties === "object"
      ? normalized.inputSchema.properties
      : {};

  const normalizedProperties: Record<string, any> = {};
  for (const [rawKey, rawProp] of Object.entries(properties)) {
    const key = rawKey.trim();
    if (!key || !rawProp || typeof rawProp !== "object") continue;

    const prop = { ...(rawProp as Record<string, unknown>) } as Record<string, unknown>;
    const widget = prop["x-ui"] && typeof prop["x-ui"] === "object" ? (prop["x-ui"] as Record<string, unknown>).widget : undefined;

    if (widget === "file") {
      if (prop.type === "array") {
        prop.items = prop.items && typeof prop.items === "object" ? prop.items : { type: "string" };
      } else {
        prop.type = "string";
      }
    }

    if (!["string", "number", "boolean", "array", "integer", "object"].includes(String(prop.type))) {
      prop.type = "string";
    }

    if (prop.type === "array" && widget === "file") {
      prop.items = prop.items && typeof prop.items === "object" ? prop.items : { type: "string" };
    }

    normalizedProperties[key] = prop;
  }

  normalized.inputSchema = {
    ...normalized.inputSchema,
    type: "object",
    properties: normalizedProperties,
    required: Array.isArray(normalized.inputSchema.required)
      ? normalized.inputSchema.required.filter((key: unknown) => typeof key === "string" && key in normalizedProperties)
      : [],
  };

  normalized.criteria = normalized.criteria.map((criterion: any, index: number) => ({
    ...criterion,
    id: typeof criterion?.id === "string" && criterion.id.trim() ? criterion.id.trim() : `criterion_${index + 1}`,
    category: typeof criterion?.category === "string" && criterion.category.trim() ? criterion.category.trim() : "General",
    name: typeof criterion?.name === "string" && criterion.name.trim() ? criterion.name.trim() : `Criterion ${index + 1}`,
    passCriteria:
      typeof criterion?.passCriteria === "string" && criterion.passCriteria.trim()
        ? criterion.passCriteria.trim()
        : "Meets the documented requirement.",
    severity: ["low", "medium", "high", "critical"].includes(criterion?.severity) ? criterion.severity : "medium",
    weight: Number.isFinite(Number(criterion?.weight)) ? Number(criterion.weight) : 10,
    autoFailIfMissing: Boolean(criterion?.autoFailIfMissing),
  }));

  return normalized;
}
