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

  // 1. Extract from JSON-LD
  extractFromJsonLd($, normalizeUrl, shouldExclude, seenUrls, images)

  // 2. Extract from Open Graph
  extractFromOpenGraph($, normalizeUrl, shouldExclude, seenUrls, images)

  // 3. Extract from <img> tags
  extractFromImgTags($, normalizeUrl, shouldExclude, seenUrls, images)

  // 4. Extract from <a> tags
  extractFromAnchorTags($, normalizeUrl, shouldExclude, seenUrls, images)

  // Limit to first 10 images to avoid overwhelming UI
  return images.slice(0, 10)
}

function extractFromJsonLd(
  $: ReturnType<typeof load>,
  normalizeUrl: (url: string) => string,
  shouldExclude: (url: string) => boolean,
  seenUrls: Set<string>,
  images: CandidateImage[],
) {
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
                isDefault: index === 0,
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
    // Cheerio parsing failed
  }
}

function extractFromOpenGraph(
  $: ReturnType<typeof load>,
  normalizeUrl: (url: string) => string,
  shouldExclude: (url: string) => boolean,
  seenUrls: Set<string>,
  images: CandidateImage[],
) {
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) {
    const normalized = normalizeUrl(ogImage)
    if (!seenUrls.has(normalized) && !shouldExclude(normalized)) {
      images.push({
        url: normalized,
        isOpenGraph: true,
        isDefault: images.length === 0,
      })
      seenUrls.add(normalized)
    }
  }
}

function extractFromImgTags(
  $: ReturnType<typeof load>,
  normalizeUrl: (url: string) => string,
  shouldExclude: (url: string) => boolean,
  seenUrls: Set<string>,
  images: CandidateImage[],
) {
  $('img').each((_, elem) => {
    const $img = $(elem)
    const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src')
    if (!src) return

    const normalized = normalizeUrl(src)
    if (seenUrls.has(normalized) || shouldExclude(normalized)) return

    const width = parseInt($img.attr('width') || '0', 10)
    const height = parseInt($img.attr('height') || '0', 10)

    if ((width > 0 && width < 200) || (height > 0 && height < 200)) return

    images.push({
      url: normalized,
      alt: $img.attr('alt'),
      isDefault: images.length === 0,
    })
    seenUrls.add(normalized)
  })
}

function extractFromAnchorTags(
  $: ReturnType<typeof load>,
  normalizeUrl: (url: string) => string,
  shouldExclude: (url: string) => boolean,
  seenUrls: Set<string>,
  images: CandidateImage[],
) {
  $('a').each((_, elem) => {
    const href = $(elem).attr('href')
    if (!href) return

    const normalized = normalizeUrl(href)
    if (seenUrls.has(normalized) || shouldExclude(normalized)) return

    if (/\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i.test(normalized)) {
      images.push({
        url: normalized,
        alt: $(elem).text().trim() || 'Image link',
        isDefault: images.length === 0,
      })
      seenUrls.add(normalized)
    }
  })
}
