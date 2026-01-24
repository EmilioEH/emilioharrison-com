import { test, expect } from './msw-setup'
import type { Recipe } from '../src/lib/types'

test.describe('Image Selection and Gallery Integration', () => {
  let currentRecipes: Recipe[] = []

  test.beforeEach(async ({ page }) => {
    currentRecipes = []
    await page.route('**/api/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      const { pathname } = new URL(url)

      if (
        pathname.includes('/api/recipes') &&
        method === 'GET' &&
        !pathname.match(/\/api\/recipes\/[^/]+/)
      ) {
        await route.fulfill({ json: { recipes: currentRecipes } })
        return
      }

      if (pathname.includes('/api/recipes') && method === 'POST') {
        const body = await route.request().postDataJSON()
        const newRecipe = {
          ...body,
          id: `recipe-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        currentRecipes.push(newRecipe)
        await route.fulfill({ json: { success: true, id: newRecipe.id } })
        return
      }

      if (pathname.includes('/api/recipes/') && (method === 'PUT' || method === 'GET')) {
        const id = pathname.split('/').pop()
        const recipe = currentRecipes.find((r) => r.id === id)
        await route.fulfill({ json: { success: true, recipe } })
        return
      }

      // Mock parse-recipe for URL
      if (pathname.includes('/api/parse-recipe') && method === 'POST') {
        const mockRecipe = {
          title: 'Mock URL Recipe',
          ingredients: [{ name: 'Water', amount: '1 cup' }],
          steps: ['Drink the water.'],
          sourceUrl: 'https://example.com/mock-recipe',
        }

        const candidateImages = [
          { url: 'https://example.com/img1.jpg', alt: 'Image 1', isDefault: true },
          { url: 'https://example.com/img2.jpg', alt: 'Image 2' },
        ]

        await route.fulfill({
          status: 200,
          headers: {
            'X-Candidate-Images': JSON.stringify(candidateImages),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockRecipe),
        })
        return
      }

      await route.fulfill({ json: { success: true } })
    })

    // Login and go to app
    await page.context().addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: '127.0.0.1', path: '/' },
    ])
    await page.goto('/protected/recipes?skip_setup=true&skip_onboarding=true')
  })

  test('should add selected URL image to recipe gallery', async ({ page }) => {
    // 1. Open Add Recipe -> URL
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    await page.getByRole('button', { name: 'URL' }).click()

    // 2. Fill URL and Process
    await page
      .getByPlaceholder('https://cooking.nytimes.com/...')
      .fill('https://example.com/mock-recipe')
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    // 3. Wait for candidates and select the second one
    const imageSelector = page.locator('button[aria-label="Select image 2: Image 2"]')
    await expect(imageSelector).toBeVisible({ timeout: 10000 })
    await imageSelector.click()

    // 4. Save Recipe
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 5.  open it
    await page.getByRole('button', { name: 'View Recipe' }).click()

    // 6. Verify image is in the gallery/header
    // Wait for the detail view to settle
    await page.waitForTimeout(1000)

    // Find the image in the carousel. Carousel uses alt="Recipe view 1"
    const carouselImage = page.getByRole('img', { name: 'Recipe view 1' })
    await expect(carouselImage).toBeVisible()
    await expect(carouselImage).toHaveAttribute('src', 'https://example.com/img2.jpg')

    // Click to open zoomable viewer
    await carouselImage.click()

    // Verify zoomed image. ImageViewer uses recipe.title as alt
    const zoomedImage = page.getByRole('img', { name: 'Mock URL Recipe' })
    await expect(zoomedImage).toBeVisible()
    await expect(zoomedImage).toHaveAttribute('src', 'https://example.com/img2.jpg')
  })
})
