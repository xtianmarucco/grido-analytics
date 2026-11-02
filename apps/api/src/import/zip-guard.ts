import { ErrorCode } from '@grido/shared';

import { ImportError, unreadableFile } from './errors.js';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_RECORD_SIZE = 22;
const CENTRAL_HEADER_SIZE = 46;
const MAX_COMMENT_SIZE = 0xffff;
const ZIP64_MARKER = 0xffffffff;
const MAX_ENTRIES = 10_000;

/**
 * Reads the ZIP central directory and rejects archives whose declared uncompressed size exceeds
 * `maxUncompressedBytes`, before any entry is inflated. exceljs inflates every entry in memory,
 * so this bounds memory for "zip bomb" style uploads. ZIP64 archives are not valid `.xlsx` here.
 * Sizes are as declared by the archive; this is a cheap guard, not a full validator.
 */
export function assertZipWithinLimits(buffer: Buffer, maxUncompressedBytes: number): void {
  const end = findEndOfCentralDirectory(buffer);
  if (end < 0) throw unreadableFile();

  const entries = buffer.readUInt16LE(end + 10);
  const directoryOffset = buffer.readUInt32LE(end + 16);
  if (entries > MAX_ENTRIES || directoryOffset === ZIP64_MARKER) throw unreadableFile();

  let position = directoryOffset;
  let total = 0;
  for (let index = 0; index < entries; index += 1) {
    if (position + CENTRAL_HEADER_SIZE > buffer.length) throw unreadableFile();
    if (buffer.readUInt32LE(position) !== CENTRAL_DIRECTORY_HEADER) throw unreadableFile();
    const size = buffer.readUInt32LE(position + 24);
    if (size === ZIP64_MARKER) throw unreadableFile();
    total += size;
    if (total > maxUncompressedBytes) {
      throw new ImportError(
        ErrorCode.FileTooLarge,
        'El contenido del archivo es demasiado grande para procesarlo.',
        { maxUncompressedBytes },
      );
    }
    const nameLength = buffer.readUInt16LE(position + 28);
    const extraLength = buffer.readUInt16LE(position + 30);
    const commentLength = buffer.readUInt16LE(position + 32);
    position += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
  }
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const lowest = Math.max(0, buffer.length - END_RECORD_SIZE - MAX_COMMENT_SIZE);
  for (let position = buffer.length - END_RECORD_SIZE; position >= lowest; position -= 1) {
    if (buffer.readUInt32LE(position) === END_OF_CENTRAL_DIRECTORY) return position;
  }
  return -1;
}
