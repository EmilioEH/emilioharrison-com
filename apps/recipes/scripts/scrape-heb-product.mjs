/**
 * Quick script to inspect HEB product page DOM structure.
 * Usage: npx playwright test --config=false && node scripts/scrape-heb-product.mjs <url>
 *   or:  npx tsx scripts/scrape-heb-product.mjs <url>
 */
import { chromium } from 'playwright'

const url =
  process.argv[2] ||
  'https://www.heb.com/product-detail/h-e-b-grade-aa-cage-free-extra-large-brown-eggs/8271501'

console.log(`\nFetching: ${url}\n`)

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  // Wait for product content to render (HEB is a Next.js app)
  await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {})
  // Give JS a moment to hydrate
  await page.waitForTimeout(3000)

  // Extract all the product data we can find
  const data = await page.evaluate(() => {
    const result = {}

    // 1. JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
    result.jsonLd = Array.from(jsonLdScripts).map((s) => {
      try {
        return JSON.parse(s.textContent)
      } catch {
        return s.textContent
      }
    })

    // 2. Open Graph meta tags
    result.ogTags = {}
    document.querySelectorAll('meta[property^="og:"]').forEach((m) => {
      result.ogTags[m.getAttribute('property')] = m.getAttribute('content')
    })

    // 3. Other useful meta tags
    result.metaTags = {}
    document.querySelectorAll('meta[name]').forEach((m) => {
      const name = m.getAttribute('name')
      if (['description', 'keywords', 'title'].includes(name)) {
        result.metaTags[name] = m.getAttribute('content')
      }
    })

    // 4. Try common product page selectors
    const selectors = {
      // Generic e-commerce
      title: 'h1',
      price: '[data-qe-id="productPrice"], .product-price, [class*="price"], [class*="Price"]',
      description: '[data-qe-id="productDescription"], .product-description',
      size: '[data-qe-id="productSize"], .product-size, [class*="size"], [class*="Size"]',
      category:
        '[data-qe-id="productCategory"], .breadcrumb, [class*="breadcrumb"], nav[aria-label="breadcrumb"]',
      image: '[data-qe-id="productImage"] img, .product-image img, [class*="product"] img',
      brand: '[data-qe-id="productBrand"], [class*="brand"], [class*="Brand"]',
    }

    result.elements = {}
    for (const [key, selector] of Object.entries(selectors)) {
      const els = document.querySelectorAll(selector)
      result.elements[key] = Array.from(els)
        .slice(0, 5)
        .map((el) => ({
          tag: el.tagName,
          text: el.textContent?.trim()?.slice(0, 200),
          classes: el.className?.toString()?.slice(0, 200),
          src: el.src || el.getAttribute('src'),
          href: el.href || el.getAttribute('href'),
          dataAttrs: Object.fromEntries(
            Array.from(el.attributes)
              .filter((a) => a.name.startsWith('data-'))
              .map((a) => [a.name, a.value?.slice(0, 100)]),
          ),
        }))
    }

    // 5. Dump all data-qe-id elements (HEB's test attribute pattern)
    result.qeElements = {}
    document.querySelectorAll('[data-qe-id]').forEach((el) => {
      const qeId = el.getAttribute('data-qe-id')
      result.qeElements[qeId] = {
        tag: el.tagName,
        text: el.textContent?.trim()?.slice(0, 200),
        classes: el.className?.toString()?.slice(0, 200),
      }
    })

    // 6. Look for any __NEXT_DATA__ or similar hydration data
    const nextData = document.getElementById('__NEXT_DATA__')
    if (nextData) {
      try {
        result.nextData = JSON.parse(nextData.textContent)
      } catch {
        result.nextDataRaw = nextData.textContent?.slice(0, 500)
      }
    }

    // 7. Check window for any product data
    result.windowKeys = Object.keys(window)
      .filter(
        (k) =>
          k.toLowerCase().includes('product') ||
          k.toLowerCase().includes('item') ||
          k.toLowerCase().includes('data'),
      )
      .slice(0, 20)

    return result
  })

  console.log(JSON.stringify(data, null, 2))

  // Also grab a screenshot for reference
  await page.screenshot({ path: '/tmp/heb-product-page.png', fullPage: false })
  console.log('\nScreenshot saved to /tmp/heb-product-page.png')
} catch (err) {
  console.error('Error:', err.message)

  // Even on error, try to get what we can
  const html = await page.content()
  console.log('\nPage title:', await page.title())
  console.log('HTML length:', html.length)
  console.log('First 1000 chars:', html.slice(0, 1000))
} finally {
  await browser.close()
}
