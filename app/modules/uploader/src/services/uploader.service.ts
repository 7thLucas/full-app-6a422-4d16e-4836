import axios, { AxiosRequestConfig } from "axios";
import https from "https";
import FormData from "form-data";
import type { UploaderResponse, FileUploadRequest } from "../types/uploader.types";
import type { Response } from "express";
import { UPLOADER_BASE_URL } from "../constants/uploader.constants";

export type UploadType = "image" | "document";

const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

const baseUrl = () => UPLOADER_BASE_URL;
const apiKey = () => process.env.QB_SCAFFOLDER_KEY || "";
const keyspace = (value?: string) => value || process.env._KEYSPACE || "";

function requireKeyspace(value?: string): string {
  const resolved = keyspace(value);
  if (!resolved) throw new Error("Uploader keyspace is not configured.");
  return resolved;
}

function handleAxiosError(err: any): never {
  if (err.code === "ECONNABORTED") throw new Error("Upload service timed out. Please try again.");
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND")
    throw new Error("Upload service is unreachable. Please try again later.");
  throw new Error(err.response?.data?.message || err.message || "Upload failed");
}

export async function uploadFile(
  req: FileUploadRequest,
): Promise<UploaderResponse<any>> {
  const url = `${baseUrl()}/files`;
  const resolvedKeyspace = requireKeyspace(req.keyspace);

  const form = new FormData();
  form.append("keyspace", resolvedKeyspace);
  if (req.file?.buffer) {
    form.append("file", req.file.buffer, {
      filename: req.file.filename || req.file.fieldname || "upload",
      contentType: req.file.mimetype || "application/octet-stream",
    });
  }

  const cfg: AxiosRequestConfig = {
    method: "POST",
    url,
    timeout: 120_000,
    headers: { "x-api-key": apiKey(), ...form.getHeaders(), "Content-Length": form.getLengthSync() },
    data: form,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    httpsAgent,
  };

  try {
    const res = await axios(cfg);
    const { file_id, url: fileUrl, size, mimeType } = res.data.result;
    return {
      statusCode: 201,
      message: "Uploaded successfully",
      data: {
        url: fileUrl,
        path: file_id,
        originalname: req.file?.filename || req.file?.fieldname || "upload",
        size,
        mimeType,
      },
    };
  } catch (err: any) {
    handleAxiosError(err);
  }
}

export async function deleteFile(req: FileUploadRequest): Promise<UploaderResponse<any>> {
  if (!req.filename) throw new Error("Filename is required for delete");

  const resolvedKeyspace = requireKeyspace(req.keyspace);
  const url = `${baseUrl()}/files/${encodeURIComponent(resolvedKeyspace)}/${encodeURIComponent(req.filename)}`;

  try {
    const res = await axios({ method: "DELETE", url, timeout: 60_000, headers: { "x-api-key": apiKey() }, httpsAgent });
    return { statusCode: res.status, message: "Deleted successfully", data: res.data };
  } catch (err: any) {
    handleAxiosError(err);
  }
}

export async function getFile(imageUrl: string, res: Response): Promise<void> {
  const resolvedKeyspace = requireKeyspace();
  const url = `${baseUrl()}/public/${encodeURIComponent(resolvedKeyspace)}/${encodeURIComponent(imageUrl)}`;

  try {
    const response = await axios({
      method: "GET", url, timeout: 120_000, responseType: "stream",
      maxBodyLength: Infinity, maxContentLength: Infinity, httpsAgent,
    });
    const contentTypeHeader = response.headers["content-type"];
    const contentType = typeof contentTypeHeader === "string" ? contentTypeHeader : "application/octet-stream";
    res.header("Content-Type", contentType);
    res.type(contentType.split(";")[0]);
    response.data.pipe(res);
  } catch (err: any) {
    handleAxiosError(err);
  }
}
