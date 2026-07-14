import { test, expect, setupApiMock, AUTH_COOKIES } from './msw-setup'

test.describe('Multi-Image Recipe Support', () => {
  test('User can upload a photo and see it in carousel', async ({ page }) => {
    // 1. Initial Setup
    await setupApiMock(page, [
      {
        id: 'test-recipe-img',
        title: 'Image Test Recipe',
        servings: 2,
        prepTime: 5,
        cookTime: 10,
        ingredients: [{ name: 'Bread', amount: '2 slices' }],
        steps: ['Toast bread'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: 'Testing image uploads',
        // Start with one image
        images: ['https://example.com/initial.jpg'],
        sourceImage: 'https://example.com/initial.jpg',
      },
    ])

    // Mock Upload API
    await page.route('**/api/uploads', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ key: 'new-photo.jpg', url: 'https://example.com/new-photo.jpg' }),
      })
    })

    await page.context().addCookies([...AUTH_COOKIES])
    await page.goto('/protected/recipes/test-recipe-img')

    // 2. Verify Initial State
    const carouselImg = page.locator('img[alt="Recipe view 1"]')
    await expect(carouselImg).toBeVisible()
    await expect(carouselImg).toHaveAttribute('src', 'https://example.com/initial.jpg')

    // 3. Upload Photo
    // The input is hidden, so we locate it by type/accept or generic selector
    const fileInput = page.locator('input[type="file"]')

    // Create a dummy image buffer
    const buffer = Buffer.from('fake-image-content')

    await fileInput.setInputFiles({
      name: 'my-food.jpg',
      mimeType: 'image/jpeg',
      buffer,
    })

    // 4. Verify Optimistic/Reload Update
    // The code basically effectively reloads or updates state.
    // We should expect the new image to be FIRST (Recipe image 1)

    // Note: The UI logic might assume "new images first".
    // Wait for the reload to settle if any
    await page.waitForLoadState('networkidle')

    // Re-locate images
    // New image should be index 0
    const newImg = page.locator('img[alt="Recipe view 1"]').first()
    await expect(newImg).toHaveAttribute('src', 'https://example.com/new-photo.jpg')

    // Old image should be index 1
    const oldImg = page.locator('img[alt="Recipe view 2"]').first()
    // It's in a scroll container, might not be visible immediately if snapped?
    // But it should exist in DOM.
    // Actually our Carousel renders all images.
    await expect(oldImg).toHaveAttribute('src', 'https://example.com/initial.jpg')

    // 5. Verify Recipe Library Thumbnail (Card View)
    await page.goto('/protected/recipes')
    const cardImg = page.getByTestId('recipe-card-test-recipe-img').locator('img')
    await expect(cardImg).toHaveAttribute('src', 'https://example.com/new-photo.jpg')
  })

  test('Carousel fallback to sourceImage if no images array', async ({ page }) => {
    await setupApiMock(page, [
      {
        id: 'legacy-recipe',
        title: 'Legacy Recipe',
        servings: 1,
        prepTime: 1,
        cookTime: 1,
        ingredients: [],
        steps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceImage: 'https://example.com/legacy.jpg',
        // No images array
      },
    ])

    await page.context().addCookies([...AUTH_COOKIES])
    await page.goto('/protected/recipes/legacy-recipe')

    const img = page.locator('img[alt="Recipe view 1"]')
    await expect(img).toBeVisible()
    await expect(img).toHaveAttribute('src', 'https://example.com/legacy.jpg')
  })
})

// P5 — Thumbnails for list images (PERFORMANCE-PLAN.md)
test.describe('Library card thumbnails (P5)', () => {
  test('Library card requests thumbUrl, not the full image, when thumbUrl exists', async ({
    page,
  }) => {
    await setupApiMock(page, [
      {
        id: 'thumb-recipe',
        title: 'Thumbnail Recipe',
        servings: 2,
        prepTime: 5,
        cookTime: 10,
        ingredients: [{ name: 'Egg', amount: '2' }],
        steps: ['Cook egg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: ['https://example.com/full-size.jpg'],
        thumbUrl: 'https://example.com/full-size-thumb.jpg',
      },
    ])

    await page.context().addCookies([...AUTH_COOKIES])
    await page.goto('/protected/recipes')

    const cardImg = page.getByTestId('recipe-card-thumb-recipe').locator('img')
    await expect(cardImg).toHaveAttribute('src', 'https://example.com/full-size-thumb.jpg')

    // Detail view must keep using the full-resolution image, never the thumbnail. Navigate via
    // the in-app SPA router (click the card), not a hard page.goto — the detail route's SSR
    // shell independently depends on Firebase user/family lookups unrelated to this test.
    await page.getByTestId('recipe-card-thumb-recipe').click()
    const detailImg = page.locator('img[alt="Recipe view 1"]')
    await expect(detailImg).toHaveAttribute('src', 'https://example.com/full-size.jpg')
  })

  test('Library card falls back to the full image when thumbUrl is absent (legacy data)', async ({
    page,
  }) => {
    await setupApiMock(page, [
      {
        id: 'no-thumb-recipe',
        title: 'No Thumbnail Recipe',
        servings: 2,
        prepTime: 5,
        cookTime: 10,
        ingredients: [{ name: 'Toast', amount: '1' }],
        steps: ['Toast it'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        images: ['https://example.com/legacy-full.jpg'],
        // No thumbUrl — pre-existing recipe from before P5.
      },
    ])

    await page.context().addCookies([...AUTH_COOKIES])
    await page.goto('/protected/recipes')

    const cardImg = page.getByTestId('recipe-card-no-thumb-recipe').locator('img')
    await expect(cardImg).toHaveAttribute('src', 'https://example.com/legacy-full.jpg')
    // Not a broken image: the src must resolve to something visible.
    await expect(cardImg).toBeVisible()
  })

  test('Card images reserve layout space to avoid shift while scrolling', async ({ page }) => {
    const recipes = Array.from({ length: 20 }, (_, i) => ({
      id: `recipe-${i}`,
      title: `Recipe ${i}`,
      servings: 2,
      prepTime: 5,
      cookTime: 10,
      ingredients: [{ name: 'Ingredient', amount: '1' }],
      steps: ['Step one'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: [`https://example.com/recipe-${i}.jpg`],
      thumbUrl: `https://example.com/recipe-${i}-thumb.jpg`,
    }))

    await setupApiMock(page, recipes)
    await page.context().addCookies([...AUTH_COOKIES])
    await page.goto('/protected/recipes')

    const firstCardImg = page.getByTestId('recipe-card-recipe-0').locator('img')
    await expect(firstCardImg).toBeVisible()

    // Explicit width/height must be present in the DOM (not just CSS) so the browser reserves
    // the box before the image resource resolves, regardless of load success/failure.
    await expect(firstCardImg).toHaveAttribute('width', '96')
    await expect(firstCardImg).toHaveAttribute('height', '96')
    await expect(firstCardImg).toHaveAttribute('loading', 'lazy')
    await expect(firstCardImg).toHaveAttribute('decoding', 'async')

    const boxBefore = await firstCardImg.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { width: r.width, height: r.height }
    })

    // Scroll the library and re-measure — the box size must be identical (no CLS from images).
    await page.mouse.wheel(0, 1500)
    await page.waitForTimeout(200)

    const boxAfter = await firstCardImg.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { width: r.width, height: r.height }
    })

    expect(boxAfter.width).toBe(boxBefore.width)
    expect(boxAfter.height).toBe(boxBefore.height)
  })
})
