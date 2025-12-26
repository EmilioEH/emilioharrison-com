import type { R2Bucket, R2ObjectBody } from '@cloudflare/workers-types'

export async function uploadImage(
  bucket: R2Bucket,
  key: string,
  file: File | Blob,
): Promise<string> {
  const buffer = await file.arrayBuffer()
  await bucket.put(key, buffer) // Type assertion to bypass conflicting Blob/File types
  return key
}

export async function getImage(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return await bucket.get(key)
}
