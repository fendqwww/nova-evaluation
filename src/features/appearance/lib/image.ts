"use client";

import {
  PHOTO_IMAGE_MAX_CHARS,
  PHOTO_THUMB_MAX_CHARS,
} from "@/features/appearance/schemas";

/**
 * Turning a camera roll photo into something a SQLite row can hold.
 *
 * This app has no object storage — no S3, no CDN, a Telegram Mini App over a
 * SQLite file — so a progress photo is stored inline as a data: URI. A modern
 * phone shot is 3–6 MB, which is not something to put in a row or push through
 * a Server Action, so every photo is decoded, downscaled and re-encoded here on
 * the client before it is ever sent.
 *
 * Two sizes come out, and both are stored: a thumbnail the gallery grid renders
 * (and which travels with the section snapshot) and a full image the viewer and
 * the До/После comparison load one at a time. SQLite cannot resize an image, so
 * "store one and scale on read" would mean shipping the big one every time a
 * 100px cell is drawn.
 */

/** Longest side of the stored full image. Enough to see skin texture. */
const FULL_MAX_EDGE = 1024;
/** Longest side of the grid thumbnail. */
const THUMB_MAX_EDGE = 256;

const FULL_QUALITY = 0.75;
const THUMB_QUALITY = 0.6;

/**
 * Quality steps to fall back through when the first encode is still too large.
 *
 * A photo of a bathroom mirror in bad light compresses badly, and the schema's
 * ceiling is a hard limit — degrading quality is strictly better than handing
 * the user "фото слишком большое" for a picture their phone considered normal.
 */
const RETRY_QUALITIES = [0.6, 0.45, 0.3];

export interface PreparedPhoto {
  imageData: string;
  thumbData: string;
  /** Dimensions of the full image, after downscaling. */
  width: number;
  height: number;
}

export class PhotoTooLargeError extends Error {
  constructor() {
    super("Не удалось сжать фото — попробуйте другое изображение");
    this.name = "PhotoTooLargeError";
  }
}

export class PhotoUnreadableError extends Error {
  constructor() {
    super("Не удалось прочитать изображение");
    this.name = "PhotoUnreadableError";
  }
}

/**
 * Decode, downscale and encode one picked file.
 *
 * createImageBitmap rather than an <img> with an object URL: it decodes off the
 * main thread and, importantly, applies the EXIF orientation flag, so a photo
 * taken in portrait does not arrive on its side. Falls back to the <img> path
 * where it is unavailable, since that is the only failure mode that would
 * otherwise make the feature simply not work.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const source = await decode(file);

  const full = drawScaled(source, FULL_MAX_EDGE);
  const thumb = drawScaled(source, THUMB_MAX_EDGE);

  if ("close" in source) source.close();

  const imageData = encodeWithin(full, FULL_QUALITY, PHOTO_IMAGE_MAX_CHARS);
  const thumbData = encodeWithin(thumb, THUMB_QUALITY, PHOTO_THUMB_MAX_CHARS);

  if (!imageData || !thumbData) throw new PhotoTooLargeError();

  return { imageData, thumbData, width: full.width, height: full.height };
}

type DecodedImage = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<DecodedImage> {
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
      image.onerror = () => reject(new PhotoUnreadableError());
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
function drawScaled(source: DecodedImage, maxEdge: number): HTMLCanvasElement {
  const { width, height } = sizeOf(source);
  if (width === 0 || height === 0) throw new PhotoUnreadableError();

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new PhotoUnreadableError();

  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Encode, stepping quality down until it fits. Null when even 0.3 will not. */
function encodeWithin(
  canvas: HTMLCanvasElement,
  quality: number,
  maxChars: number,
): string | null {
  for (const attempt of [quality, ...RETRY_QUALITIES]) {
    const encoded = canvas.toDataURL("image/jpeg", attempt);
    if (encoded.length <= maxChars) return encoded;
  }
  return null;
}
