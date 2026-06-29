import { Router } from "express";
import { handleUpload, handleDelete, handleGet } from "../controllers/uploader.controller";

const router = Router();

router.post("/uploader/:type", handleUpload);
router.post("/uploader/delete/:filename", handleDelete);
router.get("/uploader/document/*", handleGet);

export default router;
