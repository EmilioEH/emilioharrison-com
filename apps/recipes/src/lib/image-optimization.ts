/**
 * Processes an image file to ensure it is optimized for web usage.
 * Resizes large images to a maximum dimension (default 1920px) and compresses them.
 * This effectively ensures "72dpi" or screen-appropriate resolution.
 *
 * @param file The input File object
 * @param maxDimension The maximum width or height in pixels (default 1920)
 * @param quality The JPEG compression quality (0 to 1, default 0.8)
 * @returns A Promise resolving to a new optimized File object
 */
export async function processImage(file: File, maxDimension = 1920, quality = 0.8): Promise<File> {
  // If not an image, return original
  if (!file.type.startsWith('image/')) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Calculate new dimensions if needed
      if (width > maxDimension || height > maxDimension) {
        const ratio = width / height
        if (width > height) {
          width = maxDimension
          height = Math.round(maxDimension / ratio)
        } else {
          height = maxDimension
          width = Math.round(maxDimension * ratio)
        }
      } else {
        // If smaller than maxDimension, just return original to avoid unnecessary re-compression?
        // Or strictly enforce compression? Let's strictly enforce compression to ensure consistent "72dpi" style
        // file size reduction, but maybe keep dimensions if they are small.
        // Actually, if we want to "descale them down to 72 dpi if they are higher",
        // strictly speaking DPI is metadata, but usually users mean pixel dimensions/resolution.
        // We will proceed with re-encoding to ensuring consistent web-friendly size.
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to Blob/File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image conversion failed'))
            return
          }
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg', // Standardize on JPEG for photos
            lastModified: Date.now(),
          })
          resolve(newFile)
        },
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
