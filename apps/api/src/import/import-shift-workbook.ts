import type { ImportResult } from '@grido/shared';

import { normalizeShifts } from './normalize-shifts.js';
import { readShiftRows, type ReadLimits } from './read-workbook.js';

/** Entry point of the import: `.xlsx` buffer → normalized shifts and warnings. In memory only. */
export async function importShiftWorkbook(
  buffer: Buffer,
  limits: Partial<ReadLimits> = {},
): Promise<ImportResult> {
  return normalizeShifts(await readShiftRows(buffer, limits));
}
