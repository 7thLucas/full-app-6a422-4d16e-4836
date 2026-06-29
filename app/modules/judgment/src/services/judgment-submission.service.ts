import type { Request } from "express";
import mongoose from "mongoose";
import { uploadFile } from "../../../uploader/src/services/uploader.service";
import {
  buildErroredJudgmentResult,
  buildGenericJudgmentResult,
  buildSystemPrompt,
  getConfigLabels,
  getSeverityFromVerdict,
  getTaskDueHours,
  type JudgmentConfigLike,
  normalizeJudgmentResult,
  validateConfigPayload,
} from "../lib/judgment.utils";
import { ActionTaskModel } from "../models/task.model";
import { AuditLogModel } from "../models/audit.model";
import { IssueModel } from "../models/issue.model";
import { JudgmentSubmissionModel } from "../models/submission.model";
import { findConfigById } from "./judgment-config.service";
import { randomUUID } from "crypto";

function parseInputData(req: Request) {
  try {
    const rawBody = typeof req.body.inputData === "string" ? JSON.parse(req.body.inputData) : req.body.inputData || req.body;
    return rawBody?.inputData || rawBody || {};
  } catch {
    throw new Error("Invalid inputData JSON payload.");
  }
}

async function persistUploadFiles(files: Express.Multer.File[] | undefined) {
  const uploadedFiles: Array<{ filename: string; fileUrl: string }> = [];
  const fileList = files && Array.isArray(files) ? files : [];

  for (const file of fileList) {
    const fileReq = {
      file: {
        buffer: file.buffer,
        fieldname: file.fieldname,
        filename: file.originalname,
        mimetype: file.mimetype,
      },
      keyspace: process.env._KEYSPACE || "",
    };

    const result = await uploadFile(fileReq);
    if (result?.data?.url) {
      uploadedFiles.push({
        filename: file.originalname,
        fileUrl: result.data.url,
      });
    }
  }

  return uploadedFiles;
}

function buildOpenIssuePayload(config: JudgmentConfigLike, submissionId: mongoose.Types.ObjectId, result: any) {
  const verdict = result?.verdict === "pass" ? "pass" : result?.verdict === "partial" ? "partial" : "fail";
  const severity = getSeverityFromVerdict(verdict, config.criteria ?? []);
  const reason = typeof result?.reason === "string" && result.reason.trim() ? result.reason : "Review required.";
  const fixSuggestion = typeof result?.fixSuggestion === "string" && result.fixSuggestion.trim() ? result.fixSuggestion : "Address the submission gaps.";

  return {
    configId: config.pluginId,
    submissionId: submissionId.toString(),
    severity,
    status: "open" as const,
    title: `${config.name}: ${reason}`,
    description: `${reason} Suggested action: ${fixSuggestion}`,
  };
}

async function invokeLocalAgenticLLM(
  req: Request,
  config: JudgmentConfigLike,
  inputData: Record<string, unknown>,
  files: Express.Multer.File[],
  submissionId: string,
) {
  const form = new FormData();
  form.set("message", JSON.stringify(inputData));
  const outputSchema =
    config.outputSchema && typeof config.outputSchema === "object"
      ? JSON.parse(JSON.stringify(config.outputSchema))
      : {};
  const hasCriterionInput = Boolean(config.inputSchema?.properties?.criterionId);
  if (!hasCriterionInput && outputSchema && typeof outputSchema === "object") {
    const required = Array.isArray((outputSchema as { required?: unknown }).required)
      ? ((outputSchema as { required?: string[] }).required ?? []).filter((field) => field !== "criterionId")
      : undefined;
    if (required) {
      (outputSchema as { required?: string[] }).required = required;
    }
  }
  form.set("schema", JSON.stringify(outputSchema));
  
  const systemPrompt = buildSystemPrompt(config);
  if (systemPrompt) {
    form.set("system_prompt", systemPrompt);
  }

  for (const file of files) {
    const fileBlob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    form.append("files", fileBlob, file.originalname);
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto =
    typeof forwardedProto === "string" && forwardedProto.length > 0
      ? forwardedProto.split(",")[0].trim()
      : req.protocol;
  const host = req.get("host") || `localhost:${process.env.PORT || 3000}`;
  const baseUrl = `${proto}://${host}`;
  const url = `${baseUrl}/api/agents/llm`;
  const idempotencyKey = `submit-${Date.now()}-${randomUUID()}`;

  const headers: Record<string, string> = {};
  if (submissionId) {
    headers["idempotency-key"] = idempotencyKey ;
  }

  const response = await fetch(url, {
    method: "POST",
    body: form,
    headers,
  });

  const payload = (await response.json()) as {
    success?: boolean;
    message?: string;
    data?: any;
  };

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message ?? "Failed to invoke LLM");
  }

  return payload.data;
}

export async function submitConfigRecord(req: Request, configId: string) {
  const config = await findConfigById(configId);
  if (!config) {
    return { status: 404 as const, body: { error: "Config not found" } };
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const uploadedFiles = await persistUploadFiles(files);
  let inputData: Record<string, unknown>;
  try {
    inputData = parseInputData(req);
  } catch (error) {
    return { status: 400 as const, body: { error: error instanceof Error ? error.message : "Invalid inputData JSON payload." } };
  }

  const submission = await JudgmentSubmissionModel.create({
    configId: config.pluginId,
    inputData,
    files: uploadedFiles,
    status: "PENDING",
  });

  await AuditLogModel.create({
    configId: config.pluginId,
    eventType: "submitted",
    payload: { submissionId: submission._id },
    timestamp: new Date(),
  });

  const configLike = config.toObject ? (config.toObject() as JudgmentConfigLike) : (config as JudgmentConfigLike);

  try {
    validateConfigPayload(configLike as unknown as Record<string, unknown>);
    if (process.env.QB_SCAFFOLDER_KEY) {
      const llmResponse = await invokeLocalAgenticLLM(req, configLike, inputData, files, submission._id.toString());
      const rawResult = (llmResponse.response as Record<string, unknown> | undefined) ?? llmResponse;
      submission.rawResult = rawResult;
      submission.result = normalizeJudgmentResult(rawResult, {
        config: configLike,
        inputData,
        submissionId: submission._id.toString(),
      });
    } else {
      const fallbackResult = buildGenericJudgmentResult(configLike, inputData);
      submission.rawResult = {
        provider: "local-fallback",
        result: fallbackResult,
      };
      submission.result = {
        ...fallbackResult,
        id: submission._id.toString(),
        evidenceSubmissionId: submission._id.toString(),
        provider: "local-fallback",
      };
    }

    submission.status = "DONE";
  } catch (error) {
    submission.status = "ERROR";
    submission.error = error instanceof Error ? error.message : "Failed to review";
    submission.rawResult = {
      error: submission.error,
    };
    submission.result = buildErroredJudgmentResult(
      configLike,
      inputData,
      submission._id.toString(),
      submission.error,
    );
  }

  await submission.save();

  await AuditLogModel.create({
    configId: config.pluginId,
    eventType: "judgment_generated",
    payload: {
      submissionId: submission._id,
      verdict: submission.result?.verdict || "fail",
      score: submission.result?.score || 0,
    },
    timestamp: new Date(),
  });

  const verdict = submission.result?.verdict;
  if (submission.status !== "ERROR" && verdict !== "pass") {
    const issue = await IssueModel.create(
      buildOpenIssuePayload(configLike, submission._id as mongoose.Types.ObjectId, submission.result),
    );

    const labels = getConfigLabels(configLike);
    const defaultTaskDueHours = getTaskDueHours(configLike);
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + defaultTaskDueHours);

    const task = await ActionTaskModel.create({
      configId: config.pluginId,
      issueId: issue._id.toString(),
      title: `${config.name}: follow up on submission`,
      assigneeRole: labels.assigneeRole,
      dueDate,
      status: "open",
      description: `${submission.result?.reason || "Review required."} Suggested action: ${submission.result?.fixSuggestion || "Address the submission gaps."}`,
    });

    await AuditLogModel.create({
      configId: config.pluginId,
      eventType: "task_created",
      payload: { taskId: task._id, assigneeRole: labels.assigneeRole },
      timestamp: new Date(),
    });
  }

  return { status: 200 as const, body: submission };
}

export async function getConfigDashboardRecord(configId: string) {
  const config = await findConfigById(configId);
  if (!config) return null;

  const submissions = await JudgmentSubmissionModel.find({ configId: config.pluginId }).sort({ createdAt: -1 }).limit(100);

  return {
    config,
    labels: getConfigLabels(config.toObject ? (config.toObject() as JudgmentConfigLike) : (config as JudgmentConfigLike)),
    submissions,
  };
}

export async function completeTaskRecord(taskId: string) {
  const task = await ActionTaskModel.findById(taskId);
  if (!task) return null;

  task.status = "completed";
  await task.save();

  await AuditLogModel.create({
    configId: task.configId,
    eventType: "task_completed",
    payload: { taskId: task._id },
    timestamp: new Date(),
  });

  return task;
}

export async function resolveIssueRecord(issueId: string) {
  const issue = await IssueModel.findById(issueId);
  if (!issue) return null;

  issue.status = "resolved";
  await issue.save();

  await AuditLogModel.create({
    configId: issue.configId,
    eventType: "issue_resolved",
    payload: { issueId: issue._id },
    timestamp: new Date(),
  });

  return issue;
}
