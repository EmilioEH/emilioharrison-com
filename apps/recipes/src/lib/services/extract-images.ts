import { load } from 'cheerio'

export interface CandidateImage {
  url: string
  alt?: string
  isFromJsonLd?: boolean
  isOpenGraph?: boolean
  isDefault?: boolean
}

/**
 * Extracts candidate images from HTML content
 * Filters out ads, tracking pixels, and small icons
 */
export async function extractImagesFromHtml(
  html: string,
  baseUrl: string,
): Promise<CandidateImage[]> {
  const $ = load(html)
  const images: CandidateImage[] = []
  const seenUrls = new Set<string>()

  // Helper to normalize URLs
  const normalizeUrl = (url: string): string => {
    try {
      // Handle relative URLs
      if (url.startsWith('//')) {
        return `https:${url}`
      }
      if (url.startsWith('/')) {
        const base = new URL(baseUrl)
        return `${base.origin}${url}`
      }
      if (!url.startsWith('http')) {
        return new URL(url, baseUrl).href
      }
      return url
    } catch {
      return url
    }
  }

  // Helper to check if URL should be excluded
  const shouldExclude = (url: string): boolean => {
    const excludePatterns = [
      /\/ad[s]?\//i,
      /\/pixel\//i,
      /\/track/i,
      /\/banner/i,
      /\.svg$/i, // Often icons/logos
      /facebook\.com/i,
      /twitter\.com/i,
      /instagram\.com/i,
      /pinterest\.com/i,
      /gravatar\.com/i,
      /logo/i,
      /icon/i,
      /button/i,
      /sprite/i,
    ]

    return excludePatterns.some((pattern) => pattern.test(url))
  }

  // 1. Extract from JSON-LD (highest priority)
  try {
    const scripts = $('script[type="application/ld+json"]')
    for (const script of scripts) {
      try {
        const textContent = $(script).html() || ''
        const json = JSON.parse(textContent)
        const items = Array.isArray(json) ? json : json['@graph'] || [json]

        const recipe = items.find((item: unknown) => {
          if (typeof item === 'object' && item !== null && '@type' in item) {
            const type = (item as { '@type': string | string[] })['@type']
            return type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))
          }
          return false
        })

        if (recipe && typeof recipe === 'object' && 'image' in recipe) {
          const imageData = recipe.image
          let imageUrls: string[] = []

          // Handle different JSON-LD image formats
          if (typeof imageData === 'string') {
            imageUrls = [imageData]
          } else if (Array.isArray(imageData)) {
            imageUrls = imageData
              .map((img) => (typeof img === 'string' ? img : img?.url))
              .filter(Boolean)
          } else if (typeof imageData === 'object' && imageData !== null && 'url' in imageData) {
            imageUrls = [imageData.url as string]
          }

          imageUrls.forEach((url, index) => {
            const normalized = normalizeUrl(url)
            if (!seenUrls.has(normalized) && !shouldExclude(normalized)) {
              images.push({
                url: normalized,
                isFromJsonLd: true,
                isDefault: index === 0, // First JSON-LD image is default
              })
              seenUrls.add(normalized)
            }
          })
        }
      } catch {
        // Skip malformed JSON-LD
      }
    }
  } catch {
    // Cheerio parsing failed, continue
  }

  // 2. Extract from Open Graph meta tags
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) {
    const normalized = normalizeUrl(ogImage)
    if (!seenUrls.has(normalized) && !shouldExclude(normalized)) {
      images.push({
        url: normalized,
        isOpenGraph: true,
        isDefault: images.length === 0, // Default if no JSON-LD found
      })
      seenUrls.add(normalized)
    }
  }

  // 3. Extract from <img> tags in content
  $('img').each((_, elem) => {
    const $img = $(elem)
    // Try src, then data-src (lazy loading)
    const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src')

    if (!src) return

    const normalized = normalizeUrl(src)
    if (seenUrls.has(normalized) || shouldExclude(normalized)) return

    // Try to filter by image dimensions in attributes
    const width = parseInt($img.attr('width') || '0', 10)
    const height = parseInt($img.attr('height') || '0', 10)

    // Skip if dimensions are explicitly set and too small
    if ((width > 0 && width < 200) || (height > 0 && height < 200)) {
      return
    }

    images.push({
      url: normalized,
      alt: $img.attr('alt'),
      isDefault: images.length === 0, // First image is default if no JSON-LD/OG
    })
    seenUrls.add(normalized)
  })

  // Limit to first 10 images to avoid overwhelming UI
  return images.slice(0, 10)
}
