import { describe, expect, it } from 'vitest';

import {
  analysisResponseSchema,
  ImportWarningCode,
  normalizedShiftSchema,
  wallClockDateTimeSchema,
} from './analysis.js';
import { ErrorCode } from './http-error.js';

const shift = {
  row: 2,
  turno: 101,
  branchCode: 1,
  branchName: 'Almirante',
  cashierKey: 'ana',
  cashierName: 'Ana',
  startedAt: '2026-10-19T13:38:00',
  closedAt: '2026-10-19T21:05:00',
  tickets: 40,
  noActivadas: 10,
  rechazadas: 20,
  aceptadas: 10,
  activadas: 30,
};

const response = {
  import: {
    period: { from: '2026-10-19', to: '2026-10-25' },
    branches: [{ code: 1, name: 'Almirante', shiftCount: 1 }],
    shifts: [shift],
    warnings: [
      {
        code: ImportWarningCode.InvalidValue,
        message: 'Fila 3: valor inválido en totaltiquets. La fila no se incluyó.',
        row: 3,
      },
    ],
    summary: { totalRows: 2, includedRows: 1, excludedRows: 1 },
  },
};

describe('wallClockDateTimeSchema', () => {
  it('accepts a local date-time without timezone', () => {
    expect(wallClockDateTimeSchema.parse('2026-10-19T13:38:00')).toBe('2026-10-19T13:38:00');
  });

  it.each(['2026-10-19T13:38:00Z', '2026-10-19T13:38:00.999', '2026-10-19 13:38', '19/10/2026'])(
    'rejects %s',
    (value) => {
      expect(wallClockDateTimeSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('normalizedShiftSchema', () => {
  it('accepts a normalized shift', () => {
    expect(normalizedShiftSchema.parse(shift)).toEqual(shift);
  });

  it('rejects negative or fractional counts', () => {
    expect(normalizedShiftSchema.safeParse({ ...shift, tickets: -1 }).success).toBe(false);
    expect(normalizedShiftSchema.safeParse({ ...shift, aceptadas: 1.5 }).success).toBe(false);
  });
});

describe('analysisResponseSchema', () => {
  it('accepts the import section', () => {
    expect(analysisResponseSchema.parse(response)).toEqual(response);
  });

  it('accepts a warning without row or turno', () => {
    const body = {
      import: {
        ...response.import,
        warnings: [{ code: ImportWarningCode.DuplicateShift, message: 'x' }],
      },
    };
    expect(analysisResponseSchema.safeParse(body).success).toBe(true);
  });

  it('rejects an unknown warning code', () => {
    const body = {
      import: { ...response.import, warnings: [{ code: 'SOMETHING', message: 'x' }] },
    };
    expect(analysisResponseSchema.safeParse(body).success).toBe(false);
  });

  it('rejects a period that is not a calendar date', () => {
    const body = {
      import: { ...response.import, period: { from: '2026-10-19T00:00:00', to: '2026-10-25' } },
    };
    expect(analysisResponseSchema.safeParse(body).success).toBe(false);
  });
});

describe('ErrorCode', () => {
  it('includes the import rejection codes', () => {
    expect(ErrorCode).toMatchObject({
      FileRequired: 'FILE_REQUIRED',
      InvalidUpload: 'INVALID_UPLOAD',
      UnsupportedFileType: 'UNSUPPORTED_FILE_TYPE',
      FileTooLarge: 'FILE_TOO_LARGE',
      UnreadableFile: 'UNREADABLE_FILE',
      EmptyFile: 'EMPTY_FILE',
      MissingColumns: 'MISSING_COLUMNS',
      MultiplePeriods: 'MULTIPLE_PERIODS',
      TooManyRows: 'TOO_MANY_ROWS',
      NoValidRows: 'NO_VALID_ROWS',
    });
  });
});
