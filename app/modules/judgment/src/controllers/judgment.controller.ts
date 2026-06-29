import type { Request, Response } from "express";
import { createLogger } from "~/lib/logger";
import {
  PARSE_CONFIG_ENVELOPE_SCHEMA,
  SINGLE_CONFIG_SCHEMA,
  createConfigRecord,
  findConfigById,
  listConfigs,
  updateConfigRecord,
  parseConfig,
} from "../services/judgment-config.service";
import {
  completeTaskRecord,
  getConfigDashboardRecord,
  resolveIssueRecord,
  submitConfigRecord,
} from "../services/judgment-submission.service";

const logger = createLogger("JudgmentController");

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function parseConfigHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    const result = await parseConfig(req.file, req);
    return res.json(result);
  } catch (err: any) {
    logger.error("parseConfig failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export function getParseConfigSchema(req: Request, res: Response) {
  return res.json({
    mode: "file-parse",
    request: {
      contentType: "multipart/form-data",
      fields: [{ name: "file", type: "binary", required: true }],
    },
    llmResponseSchema: PARSE_CONFIG_ENVELOPE_SCHEMA,
    normalizedApiResponse: {
      type: "array",
      items: SINGLE_CONFIG_SCHEMA,
    },
  });
}

export function getDirectConfigSchema(req: Request, res: Response) {
  return res.json({
    mode: "direct-create",
    contentType: "application/json",
    bodySchema: SINGLE_CONFIG_SCHEMA,
  });
}



export async function getConfigs(req: Request, res: Response) {
  try {
    return res.json(await listConfigs());
  } catch (err: any) {
    logger.error("getConfigs failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createConfig(req: Request, res: Response) {
  try {
    return res.status(201).json(await createConfigRecord(req.body));
  } catch (err: any) {
    logger.error("createConfig failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createConfigDirect(req: Request, res: Response) {
  try {
    return res.status(201).json(await createConfigRecord(req.body));
  } catch (err: any) {
    logger.error("createConfigDirect failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getConfig(req: Request, res: Response) {
  try {
    const config = await findConfigById(firstParam(req.params.configId));
    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }
    return res.json(config);
  } catch (err: any) {
    logger.error("getConfig failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateConfig(req: Request, res: Response) {
  try {
    const config = await updateConfigRecord(firstParam(req.params.configId), req.body);
    if (!config) {
      return res.status(404).json({ error: "Config not found" });
    }
    return res.json(config);
  } catch (err: any) {
    logger.error("updateConfig failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function submitConfig(req: Request, res: Response) {
  try {
    const result = await submitConfigRecord(req, firstParam(req.params.configId));
    return res.status(result.status).json(result.body);
  } catch (err: any) {
    logger.error("submitConfig failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getConfigDashboard(req: Request, res: Response) {
  try {
    const record = await getConfigDashboardRecord(firstParam(req.params.configId));
    if (!record) {
      return res.status(404).json({ error: "Config not found" });
    }
    return res.json(record);
  } catch (err: any) {
    logger.error("getConfigDashboard failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function completeTask(req: Request, res: Response) {
  try {
    const task = await completeTaskRecord(firstParam(req.params.taskId));
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    return res.json({ success: true, task });
  } catch (err: any) {
    logger.error("completeTask failed", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function resolveIssue(req: Request, res: Response) {
  try {
    const issue = await resolveIssueRecord(firstParam(req.params.issueId));
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }
    return res.json({ success: true, issue });
  } catch (err: any) {
    logger.error("resolveIssue failed", err);
    return res.status(500).json({ error: err.message });
  }
}
