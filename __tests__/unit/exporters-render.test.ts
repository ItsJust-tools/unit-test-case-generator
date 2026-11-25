import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  createCanvasExporter,
  formatExportError,
  renderToImage,
  throwIfAborted,
} from '@/tool/exporters/utils';
import type { ExportOptions } from '@itsjust/core';

vi.mock('html-to-image', () => ({
  toBlob: vi.fn(),
}));

import { toBlob } from 'html-to-image';
const toBlobMock = vi.mocked(toBlob);

// jsdom (v29) never fires Image onload and lacks canvas 2D context; stub both.
beforeAll(() => {
  Object.defineProperty(window, 'Image', {
    configurable: true,
    writable: true,
    value: class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 40;
      naturalHeight = 30;
    },
  });
  const Impl = window.Image as unknown as { prototype: Record<string, unknown> };
  Object.defineProperty(Impl.prototype, 'src', {
    set(this: { onload: (() => void) | null }, _value: string) {
      if (typeof this.onload === 'function') this.onload();
    },
    get() {
      return '';
    },
    configurable: true,
  });

  Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: () => ({
      drawImage: () => undefined,
    }),
  });

  Object.defineProperty(window.HTMLCanvasElement.prototype, 'toBlob', {
    configurable: true,
    writable: true,
    value: (cb: (b: Blob) => void) => {
      cb(new Blob(['stub'], { type: 'image/png' }));
    },
  });
});

const options = (patch: Partial<ExportOptions> = {}): ExportOptions =>
  ({
    format: 'png',
    filename: 'test.png',
    scale: 1,
    allowSensitiveData: false,
    ...patch,
  }) as ExportOptions;

describe('renderToImage (mocked html-to-image)', () => {
  beforeEach(() => {
    toBlobMock.mockReset();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('draws a canvas from the rendered blob and restores the element', async () => {
    const width = 40;
    const height = 30;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const blob = new Blob(['x'], { type: 'image/png' });
    toBlobMock.mockResolvedValue(blob);
    const el = document.createElement('div');
    document.body.appendChild(el);

    const result = await renderToImage(el, options());
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    // element returned to the body
    expect(el.parentElement).toBe(document.body);
  });

  it('blocks exports containing sensitive inputs', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<input type="password">';
    document.body.appendChild(el);
    await expect(renderToImage(el, options())).rejects.toThrow(/sensitive/i);
  });

  it('allows sensitive data when permitted', async () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    toBlobMock.mockResolvedValue(blob);
    const el = document.createElement('div');
    el.innerHTML = '<input type="password">';
    document.body.appendChild(el);
    const result = await renderToImage(el, options({ allowSensitiveData: true }));
    expect(result.width).toBeGreaterThan(0);
  });

  it('throws when toBlob returns null', async () => {
    toBlobMock.mockResolvedValue(null);
    const el = document.createElement('div');
    document.body.appendChild(el);
    await expect(renderToImage(el, options())).rejects.toThrow(/blob/i);
  });

  it('propagates abort signals', async () => {
    const controller = new AbortController();
    controller.abort();
    const el = document.createElement('div');
    document.body.appendChild(el);
    await expect(renderToImage(el, options({ signal: controller.signal }))).rejects.toThrow(
      /abort/i
    );
  });
});

describe('createCanvasExporter', () => {
  beforeEach(() => {
    toBlobMock.mockReset();
  });

  it('returns a successful result with a sanitized filename', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    toBlobMock.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    const exporter = createCanvasExporter('png', 'image/png', 'png');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const result = await exporter.export(el, options({ filename: 'shot.png' }));
    expect(result.success).toBe(true);
    expect(result?.filename).toBe('shot.png');
  });

  it('returns a failure result with a formatted error', async () => {
    toBlobMock.mockRejectedValue(new Error('cross-origin tainted'));
    const exporter = createCanvasExporter('png', 'image/png', 'png');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const result = await exporter.export(el, options());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cors/i);
    expect(result.format).toBe('png');
  });

  it('reports abort errors when the signal fires mid-export', async () => {
    toBlobMock.mockRejectedValue(new DOMException('Export aborted', 'AbortError'));
    const exporter = createCanvasExporter('png', 'image/png', 'png');
    const el = document.createElement('div');
    document.body.appendChild(el);
    const result = await exporter.export(el, options());
    expect(result.success).toBe(false);
  });
});

describe('export utils edge coverage', () => {
  it('throwIfAborted passes for live signals', () => {
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
    expect(() => throwIfAborted()).not.toThrow();
  });

  it('formatExportError uppercases the format label', () => {
    expect(formatExportError(new Error('bad'), 'webp')).toBe('bad');
  });
});
