import { describe, it, expect } from 'vitest'
import {
  parseHebUrl,
  isHebUrl,
  parseHebProductData,
  extractNextData,
  hebProductToIngredientFields,
} from './heb-url'
import hebNextDataFixture from './__fixtures__/heb-next-data.json'

describe('parseHebUrl', () => {
  it('parses a standard product URL', () => {
    const result = parseHebUrl(
      'https://www.heb.com/product-detail/h-e-b-grade-aa-cage-free-extra-large-brown-eggs/8271501',
    )
    expect(result).toEqual({
      productId: '8271501',
      slug: 'h-e-b-grade-aa-cage-free-extra-large-brown-eggs',
      productName: 'H-E-B Grade Aa Cage Free Extra Large Brown Eggs',
      imageUrl: 'https://images.heb.com/is/image/HEBGrocery/008271501',
      originalUrl:
        'https://www.heb.com/product-detail/h-e-b-grade-aa-cage-free-extra-large-brown-eggs/8271501',
    })
  })

  it('handles URL with trailing slash', () => {
    const result = parseHebUrl(
      'https://www.heb.com/product-detail/heb-milk-whole/1234567/',
    )
    expect(result).not.toBeNull()
    expect(result!.productId).toBe('1234567')
  })

  it('handles URL with query params', () => {
    const result = parseHebUrl(
      'https://www.heb.com/product-detail/some-product/9999999?ref=search',
    )
    expect(result).not.toBeNull()
    expect(result!.productId).toBe('9999999')
  })

  it('handles URL without www', () => {
    const result = parseHebUrl(
      'https://heb.com/product-detail/some-product/1234567',
    )
    expect(result).not.toBeNull()
    expect(result!.productId).toBe('1234567')
  })

  it('handles http URL', () => {
    const result = parseHebUrl(
      'http://www.heb.com/product-detail/some-product/1234567',
    )
    expect(result).not.toBeNull()
  })

  it('handles URL with leading/trailing whitespace', () => {
    const result = parseHebUrl(
      '  https://www.heb.com/product-detail/some-product/1234567  ',
    )
    expect(result).not.toBeNull()
  })

  it('zero-pads product ID for image URL', () => {
    const result = parseHebUrl(
      'https://www.heb.com/product-detail/test/123',
    )
    expect(result).not.toBeNull()
    expect(result!.imageUrl).toBe(
      'https://images.heb.com/is/image/HEBGrocery/000000123',
    )
  })

  it('returns null for non-HEB URLs', () => {
    expect(parseHebUrl('https://www.walmart.com/product/123')).toBeNull()
    expect(parseHebUrl('https://www.google.com')).toBeNull()
    expect(parseHebUrl('not a url')).toBeNull()
    expect(parseHebUrl('')).toBeNull()
  })

  it('returns null for HEB non-product URLs', () => {
    expect(parseHebUrl('https://www.heb.com/category/dairy')).toBeNull()
    expect(parseHebUrl('https://www.heb.com/cart')).toBeNull()
    expect(parseHebUrl('https://www.heb.com/')).toBeNull()
  })

  it('converts slug to readable product name', () => {
    const result = parseHebUrl(
      'https://www.heb.com/product-detail/central-market-organic-blueberries/5555555',
    )
    expect(result!.productName).toBe('Central Market Organic Blueberries')
  })
})

describe('isHebUrl', () => {
  it('returns true for valid HEB product URLs', () => {
    expect(
      isHebUrl('https://www.heb.com/product-detail/some-product/1234567'),
    ).toBe(true)
  })

  it('returns false for non-HEB URLs', () => {
    expect(isHebUrl('https://www.google.com')).toBe(false)
    expect(isHebUrl('eggs')).toBe(false)
  })
})

describe('parseHebProductData', () => {
  it('extracts all product fields from __NEXT_DATA__ fixture', () => {
    const product = parseHebProductData(hebNextDataFixture)
    expect(product).not.toBeNull()
    expect(product!.productId).toBe('8271501')
    expect(product!.name).toBe('H-E-B Grade AA Cage Free Extra Large Brown Eggs')
    expect(product!.brand).toBe('H-E-B')
    expect(product!.price).toBe(4.79)
    expect(product!.salePrice).toBe(4.04)
    expect(product!.priceUnit).toBe('each')
    expect(product!.unitPrice).toBe(0.27)
    expect(product!.unitPriceUnit).toBe('ct')
    expect(product!.size).toBe('18 ct')
    expect(product!.category).toBe('Dairy & Eggs')
    expect(product!.imageUrl).toContain('008271501')
    expect(product!.imageUrls).toHaveLength(4)
    expect(product!.storeLocation).toBe('In Dairy on the Back Wall')
    expect(product!.inStock).toBe(true)
    expect(product!.upc).toBe('041220489770')
    expect(product!.productUrl).toContain('8271501')
  })

  it('returns null for missing product data', () => {
    expect(parseHebProductData({})).toBeNull()
    expect(parseHebProductData(null)).toBeNull()
    expect(parseHebProductData({ props: {} })).toBeNull()
  })

  it('handles missing optional fields gracefully', () => {
    const minimal = {
      props: {
        pageProps: {
          product: {
            id: '123',
            fullDisplayName: 'Test Product',
            brand: { name: 'Test' },
            breadcrumbs: [],
            carouselImageUrls: [],
            inventory: { inventoryState: 'OUT_OF_STOCK' },
            SKUs: [],
          },
        },
      },
    }
    const product = parseHebProductData(minimal)
    expect(product).not.toBeNull()
    expect(product!.name).toBe('Test Product')
    expect(product!.inStock).toBe(false)
    expect(product!.size).toBe('')
    expect(product!.price).toBe(0)
  })
})

describe('extractNextData', () => {
  it('extracts JSON from HTML with __NEXT_DATA__ script', () => {
    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">{"page":"/test","props":{}}</script></body></html>`
    const data = extractNextData(html)
    expect(data).toEqual({ page: '/test', props: {} })
  })

  it('returns null for HTML without __NEXT_DATA__', () => {
    expect(extractNextData('<html><body></body></html>')).toBeNull()
    expect(extractNextData('')).toBeNull()
  })

  it('returns null for invalid JSON in __NEXT_DATA__', () => {
    const html = `<script id="__NEXT_DATA__" type="application/json">{invalid}</script>`
    expect(extractNextData(html)).toBeNull()
  })
})

describe('hebProductToIngredientFields', () => {
  it('converts HebProduct to ShoppableIngredient fields', () => {
    const product = parseHebProductData(hebNextDataFixture)!
    const fields = hebProductToIngredientFields(product)

    expect(fields.hebProductId).toBe('8271501')
    expect(fields.hebPrice).toBe(4.04) // sale price preferred
    expect(fields.hebPriceUnit).toBe('each')
    expect(fields.hebSize).toBe('18 ct')
    expect(fields.category).toBe('Dairy & Eggs')
    expect(fields.imageUrl).toContain('008271501')
    expect(fields.storeLocation).toBe('In Dairy on the Back Wall')
  })

  it('uses list price when no sale price', () => {
    const product = parseHebProductData(hebNextDataFixture)!
    product.salePrice = undefined
    const fields = hebProductToIngredientFields(product)
    expect(fields.hebPrice).toBe(4.79)
  })
})
