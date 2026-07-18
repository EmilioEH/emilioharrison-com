/**
 * Magic-byte image sniffing for the upload endpoint.
 *
 * Uploaded bytes are inspected instead of trusting the client-supplied `file.type` /
 * filename, so `/api/uploads` can only ever store (and later serve) real raster images —
 * never HTML/SVG/scriptable content under the app's origin.
 */

export interface SniffedImage {
  mime: string
  ext: string
}

const matchesAscii = (bytes: Uint8Array, offset: number, ascii: string): boolean => {
  if (bytes.length < offset + ascii.length) return false
  for (let i = 0; i < ascii.length; i++) {
    if (bytes[offset + i] !== ascii.charCodeAt(i)) return false
  }
  return true
}

// ISO-BMFF brands (bytes 8-12, after the box size and 'ftyp') for HEIC/HEIF/AVIF files.
const ISO_BMFF_BRANDS: Record<string, SniffedImage> = {
  heic: { mime: 'image/heic', ext: 'heic' },
  heix: { mime: 'image/heic', ext: 'heic' },
  hevc: { mime: 'image/heic', ext: 'heic' },
  heif: { mime: 'image/heif', ext: 'heif' },
  mif1: { mime: 'image/heif', ext: 'heif' },
  msf1: { mime: 'image/heif', ext: 'heif' },
  avif: { mime: 'image/avif', ext: 'avif' },
  avis: { mime: 'image/avif', ext: 'avif' },
}

/** Returns the detected image type, or null when the bytes are not a supported image. */
export function sniffImageType(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    matchesAscii(bytes, 1, 'PNG') &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' }
  }

  if (matchesAscii(bytes, 0, 'GIF87a') || matchesAscii(bytes, 0, 'GIF89a')) {
    return { mime: 'image/gif', ext: 'gif' }
  }

  if (matchesAscii(bytes, 0, 'RIFF') && matchesAscii(bytes, 8, 'WEBP')) {
    return { mime: 'image/webp', ext: 'webp' }
  }

  if (matchesAscii(bytes, 4, 'ftyp') && bytes.length >= 12) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase()
    return ISO_BMFF_BRANDS[brand] || null
  }

  return null
}

/**
 * Content types `/api/uploads/[key]` is allowed to serve inline. Anything else stored in
 * the bucket (including pre-fix uploads of arbitrary types) is served as a download
 * instead, so it can never execute in the app's origin. Deliberately excludes
 * `image/svg+xml`, which can carry scripts.
 */
export const SAFE_IMAGE_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
])
