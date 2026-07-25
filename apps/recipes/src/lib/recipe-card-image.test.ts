import { describe, it, expect } from 'vitest'
import { getRecipeCardImage } from './recipe-card-image'

const SCAN = 'https://example.com/uploads/scanned-page.jpg'
const DISH = 'https://example.com/uploads/my-finished-dish.jpg'
const WEB = 'https://seriouseats.com/photo.jpg'

describe('getRecipeCardImage', () => {
  it('hides a photographed recipe card — the common case in this library', () => {
    // Photo import: the scan is prepended into images and there is no sourceUrl.
    expect(
      getRecipeCardImage({
        images: [SCAN],
        sourceImage: SCAN,
        thumbUrl: 'https://example.com/uploads/scan-thumb.jpg',
      }),
    ).toBeNull()
  })

  it('shows a dish photo the cook added later', () => {
    // "Add Photo" puts the new image at the front and repoints thumbUrl at it.
    const thumb = 'https://example.com/uploads/dish-thumb.jpg'
    expect(
      getRecipeCardImage({
        images: [DISH, SCAN],
        sourceImage: SCAN,
        thumbUrl: thumb,
      }),
    ).toBe(thumb)
  })

  it('shows the food photo from a URL import', () => {
    expect(
      getRecipeCardImage({
        images: [WEB],
        sourceImage: WEB,
        sourceUrl: 'https://seriouseats.com/some-recipe',
      }),
    ).toBe(WEB)
  })

  it('treats a legacy finishedImage as a real dish photo', () => {
    expect(getRecipeCardImage({ finishedImage: DISH, sourceImage: SCAN })).toBe(DISH)
  })

  it('returns null when the recipe has no images at all', () => {
    expect(getRecipeCardImage({})).toBeNull()
    expect(getRecipeCardImage({ images: [] })).toBeNull()
  })

  it('shows an image that exists with no sourceImage to compare against', () => {
    // Nothing marks this as a scan, so there's no reason to hide it.
    expect(getRecipeCardImage({ images: [DISH] })).toBe(DISH)
  })

  it('prefers the cheap thumbnail once it has decided to show something', () => {
    const thumb = 'https://example.com/uploads/thumb.jpg'
    expect(getRecipeCardImage({ images: [DISH, SCAN], sourceImage: SCAN, thumbUrl: thumb })).toBe(
      thumb,
    )
  })

  it('ignores empty entries in the images array', () => {
    expect(
      getRecipeCardImage({ images: ['', SCAN] as string[], sourceImage: SCAN }),
    ).toBeNull()
  })
})
