import { useCallback, useState } from 'react'
import { uploadPhoto } from '../../components/recipe-manager/importer/api'
import { processImage } from '../image-optimization'
import type { BulkPhoto } from '../../components/recipe-manager/importer/grouping'

/**
 * How many photos are optimised and uploaded at a time. Fifteen photos means fifteen resizes on
 * the main thread; starting them all together visibly janks a phone, and the uploads themselves
 * would contend for the same connection anyway.
 */
const UPLOAD_CONCURRENCY = 3

/**
 * Uploads a stack of chosen photos for bulk import, appending each one as it lands so the user
 * can start arranging them into recipes instead of watching a spinner for the whole batch.
 *
 * `photos` being `null` means "not in bulk mode"; an empty array means "bulk mode, nothing landed
 * yet", which is what the arranging screen shows first.
 */
export function useBulkPhotoUpload(onError: (message: string) => void) {
  const [photos, setPhotos] = useState<BulkPhoto[] | null>(null)
  const [uploading, setUploading] = useState(false)

  const startBulkUpload = useCallback(
    async (files: File[]) => {
      setPhotos([])
      setUploading(true)
      onError('')

      const base = import.meta.env.BASE_URL
      const baseUrl = base.endsWith('/') ? base : `${base}/`

      try {
        for (let i = 0; i < files.length; i += UPLOAD_CONCURRENCY) {
          const uploaded = await Promise.all(
            files.slice(i, i + UPLOAD_CONCURRENCY).map(async (original) => {
              const optimized = await processImage(original, 1024, 0.7)
              return uploadPhoto(optimized, baseUrl)
            }),
          )
          const landed = uploaded.filter((u): u is { key: string; url: string } => !!u)
          setPhotos((prev) => [
            ...(prev ?? []),
            ...landed.map((u) => ({ ...u, joinedWithPrevious: false })),
          ])
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Some photos could not be uploaded')
      } finally {
        setUploading(false)
      }
    },
    [onError],
  )

  return { photos, setPhotos, uploading, startBulkUpload }
}
