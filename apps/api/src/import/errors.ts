import { ErrorCode } from '@grido/shared';

/** Codes that reject a whole workbook. The HTTP layer maps each one to a status. */
export type ImportErrorCode =
  | typeof ErrorCode.UnreadableFile
  | typeof ErrorCode.FileTooLarge
  | typeof ErrorCode.EmptyFile
  | typeof ErrorCode.MissingColumns
  | typeof ErrorCode.MultiplePeriods
  | typeof ErrorCode.TooManyRows
  | typeof ErrorCode.NoValidRows;

/** The workbook cannot be imported. `message` is Spanish and safe to show to the user. */
export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

export function unreadableFile(): ImportError {
  return new ImportError(
    ErrorCode.UnreadableFile,
    'No se pudo leer el archivo. Verifique que sea un Excel (.xlsx) válido y que no esté dañado.',
  );
}
