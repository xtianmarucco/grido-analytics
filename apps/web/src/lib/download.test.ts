import { describe, expect, it, vi } from 'vitest';

import { REVOKE_DELAY_MS, saveBlob } from './download';

/** A fresh `URL` subclass per test: never mutate the real global (vi.unstubAllGlobals restores it). */
function stubObjectUrls() {
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:report');
  const revokeObjectURL = vi.fn((_url: string) => {});
  class StubURL extends URL {
    static override createObjectURL = createObjectURL;
    static override revokeObjectURL = revokeObjectURL;
  }
  vi.stubGlobal('URL', StubURL);
  return { createObjectURL, revokeObjectURL };
}

function captureClicks(): HTMLAnchorElement[] {
  const clicked: HTMLAnchorElement[] = [];
  // Restored by `vi.restoreAllMocks()` in the shared test setup.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });
  return clicked;
}

describe('saveBlob', () => {
  it('downloads through a temporary link', () => {
    const { createObjectURL } = stubObjectUrls();
    const clicked = captureClicks();
    const blob = new Blob(['x']);

    saveBlob(blob, 'informe.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toBe('informe.pdf');
    expect(clicked[0]?.href).toBe('blob:report');
    expect(clicked[0]?.isConnected).toBe(false);
  });

  it('revokes the object URL only after a delay, so Safari and Firefox can start the download', () => {
    vi.useFakeTimers();
    try {
      const { revokeObjectURL } = stubObjectUrls();
      captureClicks();

      saveBlob(new Blob(['x']), 'informe.xlsx');

      expect(revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
      expect(revokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
    } finally {
      vi.useRealTimers();
    }
  });

  it('revokes with the URL API captured at download time, even after globals are restored', () => {
    vi.useFakeTimers();
    try {
      const { revokeObjectURL } = stubObjectUrls();
      saveBlob(new Blob(['x']), 'report.pdf');
      vi.unstubAllGlobals();

      expect(() => vi.advanceTimersByTime(REVOKE_DELAY_MS)).not.toThrow();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
    } finally {
      vi.useRealTimers();
    }
  });
});
