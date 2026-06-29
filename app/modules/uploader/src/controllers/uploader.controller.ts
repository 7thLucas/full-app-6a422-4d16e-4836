import type { Request, Response } from "express";
import multer from "multer";
import { uploadFile, deleteFile, getFile } from "../services/uploader.service";
import type { FileUploadRequest } from "../types/uploader.types";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export async function handleUpload(req: Request, res: Response): Promise<void> {
  upload.single("file")(req, res, async (err) => {
    if (err) { res.status(400).json({ success: false, message: err.message }); return; }
    if (!req.file) { res.status(400).json({ success: false, message: "No file provided." }); return; }
    try {
      const fileReq: FileUploadRequest = {
        file: { buffer: req.file.buffer, fieldname: req.file.fieldname, filename: req.file.originalname, mimetype: req.file.mimetype },
        keyspace: process.env._KEYSPACE || "",
      };
      const result = await uploadFile(fileReq);
      if (!result.data) { res.status(500).json({ success: false, message: "Upload failed: no data returned" }); return; }
      res.status(201).json({ success: true, data: result.data });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });
}

export async function handleDelete(req: Request, res: Response): Promise<void> {
  try {
    const { filename } = req.params as { filename: string };
    const result = await deleteFile({ filename, keyspace: process.env._KEYSPACE || "" });
    res.json({ success: true, data: result.data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}

export async function handleGet(req: Request, res: Response): Promise<void> {
  try {
    const imageUrl = (req.params as { 0: string })[0];
    await getFile(imageUrl, res);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
}
