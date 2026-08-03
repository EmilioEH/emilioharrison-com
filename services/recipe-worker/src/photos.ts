import { getStorage } from "firebase-admin/storage";
import { sniffImageType } from "../../../apps/recipes/src/lib/image-sniff";
import type { FetchPhotos, PhotoSource } from "./types";

/**
 * Reads uploaded photos straight out of Firebase Storage with the service account the worker
 * already holds. This is what makes bulk import cheap: photos land in storage via
 * `POST /api/uploads` on Cloudflare, and the worker reads the same objects — no new network path,
 * no public exposure, no inbound port.
 *
 * Keys are the flat object names `/api/uploads` returns (`{userId}-{timestamp}-{uuid}.{ext}`).
 * Pages of one grouped recipe are downloaded in the order given, since page order is meaningful.
 */
export function createPhotoFetcher(bucketName: string): FetchPhotos {
  return async function fetchPhotos(keys: string[]): Promise<PhotoSource[]> {
    const bucket = getStorage().bucket(bucketName);
    const photos: PhotoSource[] = [];

    for (const key of keys) {
      const file = bucket.file(key);
      const [exists] = await file.exists();
      if (!exists) {
        // A deliberately specific message: this one is not worth retrying, and the user's card
        // should say the photo is gone rather than "the AI couldn't read it".
        throw new Error(`Photo is no longer in storage (${key})`);
      }

      const [buffer] = await file.download();
      photos.push({
        mimeType: detectMimeType(buffer),
        data: buffer.toString("base64"),
      });
    }

    return photos;
  };
}

/**
 * Trusts the bytes rather than the key's extension, exactly as `/api/uploads` does on the way in.
 * Falls back to JPEG: everything the client uploads has been through `processImage`, and a wrong
 * label on a real image costs a model call, while refusing the job costs the user their photo.
 */
function detectMimeType(buffer: Buffer): string {
  const sniffed = sniffImageType(new Uint8Array(buffer.subarray(0, 16)));
  return sniffed?.mime ?? "image/jpeg";
}
