import { Router } from "express";
import multer from "multer";
import {
  getConfigs,
  createConfig,
  createConfigDirect,
  getConfig,
  updateConfig,
  submitConfig,
  getConfigDashboard,
  completeTask,
  resolveIssue,
  parseConfigHandler,
  getParseConfigSchema,
  getDirectConfigSchema,
} from "../controllers/judgment.controller";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get("/judgment/configs", getConfigs);
router.post("/judgment/configs", createConfig);
router.get("/judgment/configs/direct/schema", getDirectConfigSchema);
router.post("/judgment/configs/direct", createConfigDirect);
router.get("/judgment/configs/parse/schema", getParseConfigSchema);
router.post("/judgment/configs/parse", upload.single("file"), parseConfigHandler);
router.get("/judgment/configs/:configId", getConfig);
router.put("/judgment/configs/:configId", updateConfig);
router.post("/judgment/configs/:configId/submit", upload.array("files"), submitConfig);
router.get("/judgment/configs/:configId/dashboard", getConfigDashboard);
router.post("/judgment/tasks/:taskId/complete", completeTask);
router.post("/judgment/issues/:issueId/resolve", resolveIssue);

export default router;
