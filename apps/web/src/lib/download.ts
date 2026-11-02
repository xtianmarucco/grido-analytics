/**
 * How long a report's object URL stays valid after the click. Safari and Firefox may start reading
 * the blob after `click()` returns; revoking at once can cancel the download. 30 s is far more
 * than any browser needs to start it, and the blob memory is freed afterwards.
 */
export const REVOKE_DELAY_MS = 30_000;

/** Saves a blob through a temporary `<a download>`; the object URL is revoked after a delay. */
export function saveBlob(blob: Blob, filename: string): void {
  // Capture the URL API now: the deferred revoke must use the same one that created the URL.
  const urlApi = URL;
  const url = urlApi.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => urlApi.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}
