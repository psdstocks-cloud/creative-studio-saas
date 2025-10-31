import crypto from 'crypto';

const DEFAULT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB placeholder
const CHUNK_SIZE = 64 * 1024;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class ShutterstockAdapter {
  constructor() {
    this.name = 'shutterstock';
  }

  canHandle(url) {
    if (!url) {
      return false;
    }
    try {
      const parsed = new URL(url);
      return /shutterstock\.com$/i.test(parsed.hostname) || parsed.hostname.includes('shutterstock');
    } catch (_error) {
      return false;
    }
  }

  async resolveAsset({ source_url }) {
    const filename = `shutterstock-${crypto.randomUUID().slice(0, 8)}.jpg`;

    return {
      downloadUrl: source_url,
      filename,
      size: DEFAULT_FILE_SIZE,
    };
  }

  async streamToStorage({ downloadUrl, onProgress, abortSignal }) {
    let written = 0;
    const totalBytes = DEFAULT_FILE_SIZE;

    while (written < totalBytes) {
      if (abortSignal?.aborted) {
        const abortError = new Error('Download aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }

      const remaining = totalBytes - written;
      const delta = Math.min(remaining, CHUNK_SIZE);
      written += delta;

      if (typeof onProgress === 'function') {
        onProgress(delta, totalBytes);
      }

      await wait(150);
    }

    return {
      bytesWritten: written,
      storagePath: downloadUrl,
    };
  }
}

export const shutterstockAdapter = new ShutterstockAdapter();
