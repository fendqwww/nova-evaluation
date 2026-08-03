"use client";

/**
 * The decode/downscale/encode core every client-side photo feature in this
 * app needs — progress photos today (features/appearance/lib/image.ts), food
 * photos for AI analysis next. Extracted here so the actual non-trivial part
 * (EXIF-aware decoding, canvas scaling, quality-stepped encoding under a
 * character ceiling) is written once; each feature keeps its own sizes,
 * qualities and error copy, because those are product decisions, not shared
 * mechanics.
 */

export class ImageUnreadableError extends Error {
  constructor(message = "Не удалось прочитать изображение") {
    super(message);
    this.name = "ImageUnreadableError";
  }
}

type DecodedImage = ImageBitmap | HTMLImageElement;

/**
 * createImageBitmap rather than an <img> with an object URL: it decodes off
 * the main thread and, importantly, applies the EXIF orientation flag, so a
 * photo taken in portrait does not arrive on its side. Falls back to the
 * <img> path where it is unavailable, since that is the only failure mode
 * that would otherwise make the feature simply not work.
 */
export async function decodeImageFile(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> path rather than failing outright.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new ImageUnreadableError());
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sizeOf(source: DecodedImage): { width: number; height: number } {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

/** Downscale to fit `maxEdge`, never up — a small photo stays as it is. */
export function drawScaledCanvas(source: DecodedImage, maxEdge: number): HTMLCanvasElement {
  const { width, height } = sizeOf(source);
  if (width === 0 || height === 0) throw new ImageUnreadableError();

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new ImageUnreadableError();

  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Encode, stepping quality down through `retryQualities` until the result
 * fits `maxChars`. Null when even the last quality step will not — the
 * caller decides what error that becomes.
 */
export function encodeCanvasWithin(
  canvas: HTMLCanvasElement,
  quality: number,
  maxChars: number,
  retryQualities: number[],
): string | null {
  for (const attempt of [quality, ...retryQualities]) {
    const encoded = canvas.toDataURL("image/jpeg", attempt);
    if (encoded.length <= maxChars) return encoded;
  }
  return null;
}

export interface PreparedImage {
  /** data: URI, JPEG. */
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Decode, downscale to one size and encode within a character ceiling — the
 * shape a single-photo feature (food analysis) needs. A feature that stores
 * two sizes (appearance's full + thumbnail) calls decodeImageFile/
 * drawScaledCanvas/encodeCanvasWithin directly instead, once per size.
 */
export async function prepareImage(
  file: File,
  options: { maxEdge: number; quality: number; maxChars: number; retryQualities?: number[] },
): Promise<PreparedImage> {
  const source = await decodeImageFile(file);
  const canvas = drawScaledCanvas(source, options.maxEdge);
  if ("close" in source) source.close();

  const dataUrl = encodeCanvasWithin(
    canvas,
    options.quality,
    options.maxChars,
    options.retryQualities ?? [0.6, 0.45, 0.3],
  );
  if (!dataUrl) throw new ImageUnreadableError("Не удалось сжать фото до нужного размера");

  return { dataUrl, width: canvas.width, height: canvas.height };
}
