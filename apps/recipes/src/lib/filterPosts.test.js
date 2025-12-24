import { describe, it, expect } from 'vitest'
import {
  fuzzySearch,
  filterByTags,
  filterByCategories,
  sortPosts,
  applyAllFilters,
} from './filterPosts'

// Mock Data
const mockPosts = [
  {
    data: {
      title: 'Intro to AI',
      excerpt: 'Basics of artificial intelligence',
      takeaways: { text: 'AI is growing fast' },
      tags:['tech', 'ai'],
      category: 'Tech',
      date: '2023-01-01',
    },
  },
  {
    data: {
      title: 'Cooking 101',
      excerpt: 'Learn to cook',
      takeaways: { text: 'Food is good' },
      tags:['lifestyle', 'cooking'],
      category: 'Lifestyle',
      date: '2023-02-01',
    },
  },
  {
    data: {
      title: 'Advanced AI',
      excerpt: 'Deep learning concepts',
      takeaways: { text: 'Neural networks are cool' },
      tags:['tech', 'ai', 'deep-learning'],
      category: 'Tech',
      date: '2023-03-01',
    },
  },
]

describe('filterPosts', () => {
  describe('fuzzySearch', () => {
    it('returns all posts if query is empty', () => {
      const result = fuzzySearch(mockPosts, '')
      expect(result).toEqual(mockPosts)
    })

    it('filters posts based on title match', () => {
      const result = fuzzySearch(mockPosts, 'Cooking')
      expect(result).toHaveLength(1)
      expect(result[0].data.title).toBe('Cooking 101')
    })

    it('filters posts based on excerpt match', () => {
      const result = fuzzySearch(mockPosts, 'Basics')
      expect(result).toHaveLength(1)
      expect(result[0].data.title).toBe('Intro to AI')
    })

    it('returns empty array for no matches', () => {
      const result = fuzzySearch(mockPosts, 'Space Travel')
      expect(result).toHaveLength(0)
    })
  })

  describe('filterByTags', () => {
    it('returns all posts if no tags selected', () => {
      expect(filterByTags(mockPosts, [])).toEqual(mockPosts)
      expect(filterByTags(mockPosts, null)).toEqual(mockPosts)
    })

    it('filters by single tag', () => {
      const result = filterByTags(mockPosts, ['cooking'])
      expect(result).toHaveLength(1)
      expect(result[0].data.title).toBe('Cooking 101')
    })

    it('filters by multiple tags (OR logic)', () => {
      const result = filterByTags(mockPosts, ['cooking', 'deep-learning'])
      expect(result).toHaveLength(2)
      // Expect Cooking 101 and Advanced AI
    })

    it('returns empty if tag not found', () => {
      const result = filterByTags(mockPosts, ['fencing'])
      expect(result).toHaveLength(0)
    })
  })

  describe('filterByCategories', () => {
    it('returns all posts if no categories selected', () => {
      expect(filterByCategories(mockPosts, [])).toEqual(mockPosts)
    })

    it('filters by category', () => {
      const result = filterByCategories(mockPosts, ['Lifestyle'])
      expect(result).toHaveLength(1)
      expect(result[0].data.title).toBe('Cooking 101')
    })
  })

  describe('sortPosts', () => {
    it('sorts by newest by default', () => {
      const result = sortPosts(mockPosts, 'newest')
      expect(result[0].data.date).toBe('2023-03-01')
      expect(result[1].data.date).toBe('2023-02-01')
      expect(result[2].data.date).toBe('2023-01-01')
    })

    it('sorts by oldest', () => {
      const result = sortPosts(mockPosts, 'oldest')
      expect(result[0].data.date).toBe('2023-01-01')
      expect(result[2].data.date).toBe('2023-03-01')
    })
  })

  describe('applyAllFilters', () => {
    it('applies search, filter, and sort together', () => {
      const filters = {
        search: 'AI',
        tags: ['tech'],
        categories: [],
        sort: 'oldest',
      }
      const result = applyAllFilters(mockPosts, filters)
      
      // Should match "Intro to AI" and "Advanced AI" because both have "AI" in title/excerpt and 'tech' tag
      expect(result).toHaveLength(2)
      // Sorted oldest first: Intro (Jan) then Advanced (March)
      expect(result[0].data.title).toBe('Intro to AI')
      expect(result[1].data.title).toBe('Advanced AI')
    })
  })
})
