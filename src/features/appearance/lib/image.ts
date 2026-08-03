"use client";

import {
  decodeImageFile,
  drawScaledCanvas,
  encodeCanvasWithin,
} from "@/shared/lib/prepare-image";
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
 *
 * The decode/scale/encode mechanics live in shared/lib/prepare-image.ts, used
 * the same way by the food-photo analysis feature — this file only owns the
 * sizes, qualities and error copy specific to a progress photo.
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

/** Decode, downscale and encode one picked file into the two stored sizes. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let source;
  try {
    source = await decodeImageFile(file);
  } catch {
    throw new PhotoUnreadableError();
  }

  let full: HTMLCanvasElement;
  let thumb: HTMLCanvasElement;
  try {
    full = drawScaledCanvas(source, FULL_MAX_EDGE);
    thumb = drawScaledCanvas(source, THUMB_MAX_EDGE);
  } catch {
    throw new PhotoUnreadableError();
  } finally {
    if ("close" in source) source.close();
  }

  const imageData = encodeCanvasWithin(full, FULL_QUALITY, PHOTO_IMAGE_MAX_CHARS, RETRY_QUALITIES);
  const thumbData = encodeCanvasWithin(thumb, THUMB_QUALITY, PHOTO_THUMB_MAX_CHARS, RETRY_QUALITIES);

  if (!imageData || !thumbData) throw new PhotoTooLargeError();

  return { imageData, thumbData, width: full.width, height: full.height };
}
