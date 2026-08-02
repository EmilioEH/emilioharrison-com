/** One chosen photo, already uploaded. `joinedWithPrevious` marks it as a continuation page of
 * the recipe above it rather than a recipe of its own. */
export interface BulkPhoto {
  key: string
  url: string
  joinedWithPrevious: boolean
}

/**
 * Turns the flat, ordered list of chosen photos into one group per recipe.
 *
 * Grouping is manual on purpose. Letting the model infer it means a wrong guess silently welds
 * two recipes into one, which is worse than not grouping at all — and the mistake stays invisible
 * until someone cooks from it.
 */
export function groupPhotos(photos: BulkPhoto[]): string[][] {
  const groups: string[][] = []
  for (const photo of photos) {
    // A join on the very first photo has nothing to join to; treat it as its own recipe.
    if (photo.joinedWithPrevious && groups.length > 0) groups[groups.length - 1].push(photo.key)
    else groups.push([photo.key])
  }
  return groups
}

/** Which recipe (1-based) the photo at `index` belongs to. */
export function recipeNumberAt(photos: BulkPhoto[], index: number): number {
  return groupPhotos(photos.slice(0, index + 1)).length
}

/** Which page of its own recipe the photo at `index` is (1-based). */
export function pageNumberAt(photos: BulkPhoto[], index: number): number {
  let page = 1
  for (let i = index; i > 0; i--) {
    if (!photos[i].joinedWithPrevious) break
    page++
  }
  return page
}

/** What to call the photo at `index` — the same wording on its card and in the full-size viewer,
 * so paging through the photos never renames what you are looking at. */
export function photoLabelAt(photos: BulkPhoto[], index: number): string {
  const recipeNumber = recipeNumberAt(photos, index)
  return photos[index].joinedWithPrevious && index > 0
    ? `Page ${pageNumberAt(photos, index)} of recipe ${recipeNumber}`
    : `Recipe ${recipeNumber}`
}

/** Removing a photo must not leave the next one joined to whatever slid up into its place. */
export function removePhotoAt(photos: BulkPhoto[], index: number): BulkPhoto[] {
  const next = photos.filter((_, i) => i !== index)
  if (next[0]) next[0] = { ...next[0], joinedWithPrevious: false }
  return next
}
