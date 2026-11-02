import { describe, expect, it, vi } from 'vitest';

import { saveBlob } from './download';

describe('saveBlob', () => {
  it('downloads through a temporary link and revokes the object URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:report');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });
    const blob = new Blob(['x']);

    saveBlob(blob, 'informe.pdf');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toBe('informe.pdf');
    expect(clicked[0]?.href).toBe('blob:report');
    expect(clicked[0]?.isConnected).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
