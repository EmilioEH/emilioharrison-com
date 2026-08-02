import { describe, it, expect } from 'vitest'
import {
  groupPhotos,
  recipeNumberAt,
  pageNumberAt,
  photoLabelAt,
  removePhotoAt,
  type BulkPhoto,
} from './grouping'

const photo = (key: string, joinedWithPrevious = false): BulkPhoto => ({
  key,
  url: `/uploads/${key}`,
  joinedWithPrevious,
})

describe('groupPhotos', () => {
  it('treats each photo as its own recipe by default', () => {
    expect(groupPhotos([photo('a'), photo('b'), photo('c')])).toEqual([['a'], ['b'], ['c']])
  })

  it('folds a joined photo into the recipe above it, in page order', () => {
    expect(groupPhotos([photo('a'), photo('b', true), photo('c')])).toEqual([['a', 'b'], ['c']])
  })

  it('supports a recipe running over several pages', () => {
    const photos = [photo('a'), photo('b', true), photo('c', true), photo('d')]
    expect(groupPhotos(photos)).toEqual([['a', 'b', 'c'], ['d']])
  })

  it('never drops a photo that claims to join something that is not there', () => {
    // Removing the first photo can leave the next one marked as a continuation. The UI clears
    // that flag, but the grouping must not lose the photo if anything slips through.
    expect(groupPhotos([photo('a', true), photo('b')])).toEqual([['a'], ['b']])
  })
})

describe('recipeNumberAt / pageNumberAt', () => {
  const photos = [photo('a'), photo('b', true), photo('c'), photo('d', true), photo('e', true)]

  it('numbers recipes as the user sees them', () => {
    expect(photos.map((_, i) => recipeNumberAt(photos, i))).toEqual([1, 1, 2, 2, 2])
  })

  it('numbers pages within a recipe', () => {
    expect(photos.map((_, i) => pageNumberAt(photos, i))).toEqual([1, 2, 1, 2, 3])
  })
})

describe('photoLabelAt', () => {
  it('names each photo the same way on its card and in the viewer', () => {
    const photos = [photo('a'), photo('b', true), photo('c'), photo('d', true), photo('e', true)]

    expect(photos.map((_, i) => photoLabelAt(photos, i))).toEqual([
      'Recipe 1',
      'Page 2 of recipe 1',
      'Recipe 2',
      'Page 2 of recipe 2',
      'Page 3 of recipe 2',
    ])
  })

  it('calls a joined first photo a recipe, matching how it is actually grouped', () => {
    expect(photoLabelAt([photo('a', true)], 0)).toBe('Recipe 1')
  })
})

describe('removePhotoAt', () => {
  it('removes the photo', () => {
    expect(removePhotoAt([photo('a'), photo('b')], 0).map((p) => p.key)).toEqual(['b'])
  })

  it('does not leave the new first photo joined to nothing', () => {
    // Deleting the page a continuation was attached to would otherwise silently weld it onto
    // whichever recipe slid up into that slot.
    const result = removePhotoAt([photo('a'), photo('b', true), photo('c')], 0)
    expect(result[0].joinedWithPrevious).toBe(false)
    expect(groupPhotos(result)).toEqual([['b'], ['c']])
  })
})
