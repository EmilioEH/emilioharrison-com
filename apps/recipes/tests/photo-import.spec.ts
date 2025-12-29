import { test, expect } from '@playwright/test'

test.describe('Photo Import Workflow', () => {
  test('should display source image after importing', async ({ page }) => {
    // 1. Mock the API response
    await page.route('**/api/parse-recipe', async (route) => {
      const json = {
        title: 'Mocked Photo Recipe',
        ingredients: [{ name: 'Test Ingredient', amount: '1 cup' }],
        steps: ['Mix everything.'],
        sourceImage: 'data:image/jpeg;base64,mockedimage', // Simulate return
      }
      await route.fulfill({ json })
    })

    // 2. Add dummy upload route
    await page.route('**/api/uploads', async (route) => {
      await route.fulfill({ json: { key: 'mock-key' } })
    })

    // 3. Go to Add Recipe page
    await page.goto('/')

    // Click the FAB to open the editor
    await page.getByRole('button', { name: 'Add Recipe' }).click()

    // 4. Upload photo
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        'base64',
      ),
    })

    // 5. Click Process
    await page.getByRole('button', { name: 'Process Recipe' }).click()

    // 6. Verify Source Image is visible
    await expect(page.getByText('Source Image')).toBeVisible()
    await expect(page.locator('img[alt="Recipe Source"]')).toBeVisible()
  })
})
