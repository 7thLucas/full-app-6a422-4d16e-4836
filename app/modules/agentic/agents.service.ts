import { apiGet, apiRequest } from "~/lib/api.client";
import type { AgentJobStatus } from "./agent-job.model";

export interface AgentJobView {
  jobId: string;
  prompt: string;
  status: AgentJobStatus;
  response: { reply?: string } | Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubmitResponse {
  jobId: string;
  status: "PENDING";
}

interface ListResponse {
  items: AgentJobView[];
  total: number;
  limit: number;
  skip: number;
}

export interface InvokeLLMInput {
  message: string;
  schema: Record<string, unknown>;
  systemPrompt?: string;
  files?: File[];
  idempotencyKey?: string;
}

export interface InvokeLLMOutput {
  job_id: string;
  status: "DONE" | "ERROR";
  model: string;
  response: Record<string, unknown> | null;
  usage: { input_tokens: number; output_tokens: number };
  attachments: Array<{
    filename: string;
    mime_type: string;
    file_id: string;
    provider: "anthropic";
  }>;
  idempotent_replay: boolean;
  error: string | null;
}

/**
 * Fire-and-forget submit. Returns the new jobId immediately. The result lands
 * in the database asynchronously when the microplatform's callback fires; read
 * it from the list (or from `AgentJobModel` server-side) when you need it.
 */
export async function submit(prompt: string): Promise<{ jobId: string }> {
  const res = await apiRequest<SubmitResponse>("/api/agents/call", {
    method: "POST",
    data: { prompt },
  });
  if (!res.success || !res.data?.jobId) {
    throw new Error(res.message ?? "Failed to submit agent call");
  }
  return { jobId: res.data.jobId };
}

/**
 * Read the agent-job list (most recent first) for the current keyspace.
 * The page lives in the database; submission and result are decoupled.
 */
export async function getList(
  options: { limit?: number; skip?: number } = {},
): Promise<ListResponse> {
  const params: Record<string, string> = {};
  if (options.limit != null) params.limit = String(options.limit);
  if (options.skip != null) params.skip = String(options.skip);

  const res = await apiGet<ListResponse>("/api/agents/list", params);
  if (!res.success || !res.data) {
    throw new Error(res.message ?? "Failed to load agent jobs");
  }
  return res.data;
}

/**
 * Direct LLM call through the scaffold server route.
 * Supports multipart uploads (files are forwarded to /api/llm).
 */
export async function invokeLLM(input: InvokeLLMInput): Promise<InvokeLLMOutput> {
  const form = new FormData();
  form.set("message", input.message);
  form.set("schema", JSON.stringify(input.schema));
  if (input.systemPrompt) form.set("system_prompt", input.systemPrompt);
  for (const file of input.files ?? []) {
    form.append("files", file);
  }

  const response = await fetch("/api/agents/llm", {
    method: "POST",
    body: form,
    headers: input.idempotencyKey
      ? {
          "idempotency-key": input.idempotencyKey,
        }
      : undefined,
  });

  const payload = (await response.json()) as {
    success?: boolean;
    message?: string;
    data?: InvokeLLMOutput;
  };

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message ?? "Failed to invoke LLM");
  }

  return payload.data;
}
