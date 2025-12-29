import { test, expect } from '@playwright/test'

test.describe('Recipe Photo Features', () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'TestUser',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  })

  test('should allow capturing a finished meal photo after cooking', async ({ page }) => {
    await page.goto('/protected/recipes')

    // 1. Create a Recipe
    const title = `Photo Test ${Date.now()}`
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    await page.getByLabel('Title').fill(title)
    // Add a step so we can cook
    await page.getByLabel('Instructions (One per line)').fill('Step 1: Cook it')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open Recipe
    await page.getByText(title).first().click()

    // 3. Start Cooking
    await page.getByRole('button', { name: 'Start Prepping' }).click()
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // 4. Complete Step
    await page.getByText('Step 1 of 1').isVisible()
    await page.getByRole('button', { name: 'Finish Cooking' }).click()

    // 5. Verify "Capture the Moment" UI
    await expect(page.getByText('Capture the Moment')).toBeVisible()

    // 6. "Upload" a photo (using a buffer)
    // Note: We are mocking the file upload by injecting a base64 string directly
    // or properly using setInputFiles if we had a dummy image.
    // Since we don't have a guaranteed image file, we will create a dummy one on the fly?
    // Playwright supports buffer uploads.
    await page.setInputFiles('input[type="file"]', {
      name: 'meal.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    // 7. Verify Image Preview appears
    await expect(page.getByAltText('Finished Meal')).toBeVisible()

    // 8. Save
    await page.getByRole('button', { name: 'Save Review & Finish' }).click()

    // 9. Verify we are back in Detail View (or Library, logic says onClose which goes to Library)
    // Actually onClose in RecipeDetail closes the modal, so we are back in Library.
    await expect(page.getByText('Capture the Moment')).not.toBeVisible()

    // 10. Verify Card shows the image
    // The library card should have the image.
    // We look for the image with alt text = title
    const cardImage = page.locator(`img[alt="${title}"]`)
    await expect(cardImage).toBeVisible()
    // It should be the one we uploaded (or similar, checking visibility is enough for now)
  })
})
