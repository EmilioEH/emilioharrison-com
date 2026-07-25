import type { Recipe } from './types'

/**
 * Decides whether a recipe has a photo worth putting on a library card, and which one.
 *
 * Most of this library is imported by photographing cookbook pages, so the "image" on those
 * recipes is a picture of text. At 96px those cards are indistinguishable beige rectangles that
 * tell you nothing about the dish — worse than no image, because they occupy the exact spot your
 * eye goes to identify a recipe.
 *
 * A scan is only ever shown if nothing better exists, and the rule for "better" is:
 *
 * - A photo added later via "Add Photo" is a picture of the finished dish. Those land at the
 *   front of `images`, so an `images[0]` that isn't the `sourceImage` means the cook added one.
 * - `finishedImage` is the same idea under an older field name.
 * - A recipe imported from a URL has `sourceUrl` set, and its `sourceImage` is the food photo
 *   lifted from that page — a real picture of the dish, so it stays.
 * - Anything left is a bare scan, and the card is better off with its placeholder.
 *
 * Returns the URL to render, or `null` to fall through to the card's illustrated placeholder.
 */
export function getRecipeCardImage(
  recipe: Pick<Recipe, 'images' | 'finishedImage' | 'sourceImage' | 'sourceUrl' | 'thumbUrl'>,
): string | null {
  const source = recipe.sourceImage
  const images = Array.isArray(recipe.images) ? recipe.images.filter(Boolean) : []

  // `thumbUrl` is a small variant generated at upload time and tracks images[0], so it's the
  // cheapest thing to render — but only once we've decided there's something worth rendering.
  const preferred = recipe.thumbUrl || images[0] || recipe.finishedImage || source || null
  if (!preferred) return null

  const addedLater = images.find((img) => img && img !== source)
  if (addedLater) return preferred

  if (recipe.finishedImage && recipe.finishedImage !== source) return preferred

  // Imported from a website: the source image is that page's food photo, not a scan.
  if (recipe.sourceUrl) return preferred

  // Only the original import image exists and it didn't come from a web page — a photographed
  // recipe card. Show the placeholder instead of an unreadable wall of text.
  if (source) return null

  return preferred
}
