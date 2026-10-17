import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "./errors";

export const MAX_MB = 10;
export const MAX_CHUNKS = 1500; // caps embedding cost per upload

// extension -> canonical mime + mimetypes browsers commonly send for it
const TYPES: Record<string, { mime: string; accepts: string[] }> = {
  ".pdf": { mime: "application/pdf", accepts: ["application/pdf"] },
  ".txt": { mime: "text/plain", accepts: ["text/plain"] },
  ".md": {
    mime: "text/markdown",
    accepts: ["text/markdown", "text/x-markdown", "text/plain", "application/octet-stream"],
  },
};

const UNSUPPORTED = "Only PDF, TXT and Markdown files are supported.";

// multer decodes filenames as latin1, so restore UTF-8 names
const fixEncoding = (name: string) => Buffer.from(name, "latin1").toString("utf8");

export function sanitizeFilename(name: string): string {
  const base = path
    .basename(fixEncoding(name).replace(/\\/g, "/"))
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .trim();
  return (base || "document").slice(-120); // slice from the end to keep the extension
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(fixEncoding(file.originalname)).toLowerCase();
    const type = TYPES[ext];
    if (!type || !type.accepts.includes(file.mimetype)) {
      return cb(new AppError(415, UNSUPPORTED) as any);
    }
    cb(null, true);
  },
});

// Runs after multer: checks the real bytes, not just what the client claims
export function validateUpload(req: Request, _res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) throw new AppError(400, 'No file received. Send multipart field "file".');
  if (file.size === 0) throw new AppError(400, "The file is empty.");

  const ext = path.extname(fixEncoding(file.originalname)).toLowerCase();
  const type = TYPES[ext];
  if (!type) throw new AppError(415, UNSUPPORTED);

  if (ext === ".pdf") {
    if (!file.buffer.subarray(0, 1024).includes("%PDF-")) {
      throw new AppError(415, "This file isn't a valid PDF.");
    }
  } else {
    if (file.buffer.subarray(0, 8192).includes(0)) {
      throw new AppError(415, "This looks like a binary file, not text.");
    }
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
    } catch {
      throw new AppError(422, "Text files must be UTF-8 encoded.");
    }
  }

  file.originalname = sanitizeFilename(file.originalname);
  file.mimetype = type.mime; // normalize so extractText gets a canonical value
  next();
}