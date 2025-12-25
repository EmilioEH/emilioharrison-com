import { describe, it, expect, vi } from 'vitest'
import { generateGroceryList } from './grocery-utils'

describe('grocery-utils', () => {
  it('should return empty message when no recipes', async () => {
    const result = await generateGroceryList([])
    expect(result).toContain('No recipes selected')
  })

  describe('Offline Mode / Fallback logic', () => {
    it('should generate a manual list if the API fetch fails', async () => {
      // Mock global fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const recipes = [
        {
          title: 'Pasta',
          ingredients: [{ name: 'Noodles', amount: '1 box' }],
        },
      ]

      const result = await generateGroceryList(recipes)

      expect(result).toContain('Offline Mode')
      expect(result).toContain('Pasta')
      expect(result).toContain('- [ ] 1 box Noodles')
    })

    it('should generate a manual list if the API returns non-ok status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      })

      const recipes = [
        {
          title: 'Salad',
          ingredients: [{ name: 'Lettuce', amount: '1 head' }],
        },
      ]

      const result = await generateGroceryList(recipes)

      expect(result).toContain('Offline Mode')
      expect(result).toContain('Salad')
      expect(result).toContain('Lettuce')
    })
  })
})
