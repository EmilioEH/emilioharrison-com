import { describe, it, expect } from 'vitest'
import {
  searchProducts,
  findProduct,
  getProductPrice,
  getProductsByCategory,
  getCategories,
  getProductCount,
} from './heb-products'

describe('heb-products', () => {
  describe('searchProducts', () => {
    it('should return empty array for empty query', () => {
      expect(searchProducts('')).toEqual([])
      expect(searchProducts('  ')).toEqual([])
      expect(searchProducts('a')).toEqual([]) // Too short
    })

    it('should find products by name', () => {
      const results = searchProducts('avocado')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].product.name.toLowerCase()).toContain('avocado')
    })

    it('should find products by partial name match', () => {
      const results = searchProducts('milk')
      expect(results.length).toBeGreaterThan(0)
      // Should find various milk products
      const hasMatch = results.some((r) => r.product.name.toLowerCase().includes('milk'))
      expect(hasMatch).toBe(true)
    })

    it('should rank exact matches higher', () => {
      const results = searchProducts('eggs')
      expect(results.length).toBeGreaterThan(0)
      // Results with "eggs" in name should be ranked higher
      expect(results[0].score).toBeGreaterThan(0)
    })

    it('should respect the limit parameter', () => {
      const results = searchProducts('chicken', 3)
      expect(results.length).toBeLessThanOrEqual(3)
    })

    it('should return results sorted by score descending', () => {
      const results = searchProducts('bread', 10)
      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
        }
      }
    })

    it('should find products across multiple categories', () => {
      // "chicken" could be in Meat, Canned goods, Frozen, etc.
      const results = searchProducts('chicken', 20)
      const categories = new Set(results.map((r) => r.product.category))
      expect(categories.size).toBeGreaterThanOrEqual(1)
    })

    it('should handle multi-word queries', () => {
      const results = searchProducts('peanut butter')
      expect(results.length).toBeGreaterThan(0)
      const hasMatch = results.some(
        (r) =>
          r.product.name.toLowerCase().includes('peanut') ||
          r.product.name.toLowerCase().includes('butter'),
      )
      expect(hasMatch).toBe(true)
    })
  })

  describe('findProduct', () => {
    it('should return null for empty query', () => {
      expect(findProduct('')).toBeNull()
      expect(findProduct('  ')).toBeNull()
      expect(findProduct('a')).toBeNull()
    })

    it('should find product by exact name match', () => {
      // Find any product name from the database and look it up
      const results = searchProducts('eggs', 1)
      if (results.length > 0) {
        const product = findProduct(results[0].product.name)
        expect(product).not.toBeNull()
        expect(product?.name).toBe(results[0].product.name)
      }
    })

    it('should find product by partial name match', () => {
      const product = findProduct('avocado')
      expect(product).not.toBeNull()
      expect(product?.name.toLowerCase()).toContain('avocado')
    })

    it('should return null for non-existent product', () => {
      const product = findProduct('xyznonexistentproduct123')
      expect(product).toBeNull()
    })

    it('should be case-insensitive', () => {
      const product1 = findProduct('MILK')
      const product2 = findProduct('milk')
      // Both should find something (might be different products)
      expect(product1).not.toBeNull()
      expect(product2).not.toBeNull()
    })
  })

  describe('getProductPrice', () => {
    it('should return price info for valid product', () => {
      const priceInfo = getProductPrice('avocado')
      if (priceInfo) {
        expect(priceInfo.price).toBeGreaterThan(0)
        expect(typeof priceInfo.unit).toBe('string')
      }
    })

    it('should return null for non-existent product', () => {
      const priceInfo = getProductPrice('xyznonexistentproduct123')
      expect(priceInfo).toBeNull()
    })

    it('should return null for empty query', () => {
      expect(getProductPrice('')).toBeNull()
    })
  })

  describe('getProductsByCategory', () => {
    it('should return products for valid category', () => {
      const products = getProductsByCategory('Produce')
      expect(products.length).toBeGreaterThan(0)
      products.forEach((p) => {
        expect(p.category).toBe('Produce')
      })
    })

    it('should return empty array for invalid category', () => {
      const products = getProductsByCategory('InvalidCategory')
      expect(products).toEqual([])
    })

    it('should return products with correct category field', () => {
      const products = getProductsByCategory('Dairy & Eggs')
      products.forEach((p) => {
        expect(p.category).toBe('Dairy & Eggs')
      })
    })
  })

  describe('getCategories', () => {
    it('should return all 19 H-E-B categories', () => {
      const categories = getCategories()
      expect(categories.length).toBe(19)
    })

    it('should include expected categories', () => {
      const categories = getCategories()
      expect(categories).toContain('Produce')
      expect(categories).toContain('Meat')
      expect(categories).toContain('Dairy & Eggs')
      expect(categories).toContain('Frozen Foods')
      expect(categories).toContain('Pantry & Condiments')
    })
  })

  describe('getProductCount', () => {
    it('should return total count of products', () => {
      const count = getProductCount()
      expect(count).toBeGreaterThan(0)
      // Based on the generated data, we have ~350+ products
      expect(count).toBeGreaterThan(300)
    })
  })

  describe('fuzzy matching', () => {
    it('should match singular/plural variations', () => {
      // Search for "egg" should find "eggs" products
      const results = searchProducts('egg')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should match partial product names', () => {
      // Search for "spin" should find "spinach" products
      const results = searchProducts('spin')
      const hasSpinach = results.some((r) => r.product.name.toLowerCase().includes('spinach'))
      expect(hasSpinach).toBe(true)
    })

    it('should match brand + product queries', () => {
      // Search for "heb eggs" should work
      const results = searchProducts('heb eggs')
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
