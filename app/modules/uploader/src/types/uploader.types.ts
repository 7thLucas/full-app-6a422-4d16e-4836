export interface UploaderRequest {
  keyspace?: string;
  role?: string;
  jwtToken?: string;
  headers?: Record<string, string>;
  [key: string]: any;
}

export interface UploaderResponse<T = any> {
  statusCode: number;
  message: string;
  data: T | null;
}

export interface FileUploadRequest extends UploaderRequest {
  filename?: string;
  [key: string]: any;
}

export enum FileType {
  Pdf = "pdf",
  Image = "image",
  Video = "video",
  Office = "office",
}

export const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  "application/pdf": FileType.Pdf,
  "image/png": FileType.Image,
  "image/jpeg": FileType.Image,
  "image/gif": FileType.Image,
  "image/webp": FileType.Image,
  "image/svg+xml": FileType.Image,
  "video/mp4": FileType.Video,
  "video/webm": FileType.Video,
  "video/quicktime": FileType.Video,
};
