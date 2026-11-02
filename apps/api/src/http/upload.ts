import path from 'node:path';

import { ErrorCode, fileTooLargeMessage, MAX_UPLOAD_BYTES } from '@grido/shared';
import type { RequestHandler } from 'express';
import multer from 'multer';

import { HttpError } from './errors.js';

/** MIME types browsers and CLI tools send for `.xlsx`. Anything else is rejected. */
const ACCEPTED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
  '',
]);

const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export function unsupportedFileType(): HttpError {
  return new HttpError(
    415,
    ErrorCode.UnsupportedFileType,
    'El archivo debe ser un Excel .xlsx (el reporte de cierre de turnos).',
  );
}

/** `.xlsx` files are ZIP archives: they start with `PK\x03\x04`. Catches renamed files. */
export function hasZipSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE);
}

/**
 * Parses a single `.xlsx` from the multipart field `file` into `req.file.buffer`. Memory storage
 * only: nothing is written to disk. Every multer/busboy failure becomes an `HttpError`.
 */
export function xlsxUpload(maxBytes: number = MAX_UPLOAD_BYTES): RequestHandler {
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 10, fieldSize: 1024, parts: 20 },
    fileFilter: (_req, file, accept) => {
      const isXlsxName = path.extname(file.originalname).toLowerCase() === '.xlsx';
      if (isXlsxName && ACCEPTED_MIME_TYPES.has(file.mimetype.toLowerCase())) accept(null, true);
      else accept(unsupportedFileType());
    },
  }).single('file');

  return (req, res, next) => {
    parse(req, res, (error: unknown) => {
      if (error === undefined || error === null) next();
      else next(toHttpError(error, maxBytes));
    });
  };
}

function toHttpError(error: unknown, maxBytes: number): HttpError {
  if (error instanceof HttpError) return error;
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return new HttpError(413, ErrorCode.FileTooLarge, fileTooLargeMessage(maxBytes), {
      maxBytes,
    });
  }
  // Other limits, unexpected fields and malformed multipart bodies are client errors.
  return new HttpError(
    400,
    ErrorCode.InvalidUpload,
    'La carga no es válida. Envíe un único archivo Excel en el campo "file".',
  );
}
