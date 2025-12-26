import { test, expect } from '@playwright/test'

test.describe('Recipe Cooking Mode', () => {
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
      ],
      origins: [],
    },
  })

  test('should navigate through full cooking mode lifecycle', async ({ page }) => {
    await page.goto('/protected/recipes')

    // 1. Create a dummy recipe to test with
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    const testTitle = `COOK_TEST_${Date.now()}`
    await page.getByLabel('Title').fill(testTitle)
    await page.getByLabel('Ingredients (One per line)').fill('1 cup Flour\n2 Eggs')
    await page.getByLabel('Instructions (One per line)').fill('Mix ingredients\nBake for 20 mins')
    await page.getByRole('button', { name: 'Save Recipe' }).click()

    // 2. Open the recipe
    // Since we didn't set a protein, it will be in "Uncategorized"
    const uncategorizedGroup = page.getByRole('button').filter({ hasText: 'Uncategorized' })
    if (await uncategorizedGroup.isVisible()) {
      await uncategorizedGroup.click()
    }

    // Use force click because the library has an entrance animation that might intercept pointer events
    await page.getByRole('button').filter({ hasText: testTitle }).first().click({ force: true })

    // 3. Enter Cooking Mode (Starts with Pre-cooking)
    // Wait for the detail view to be stable
    await expect(page.getByRole('heading', { name: testTitle, exact: true })).toBeVisible()
    await page.getByTitle('Cooking Mode (Keep Screen On)').click({ force: true })
    await expect(page.getByText('Mise en Place')).toBeVisible()
    await expect(page.getByText('1 cup Flour')).toBeVisible()

    // 4. Mark ingredients as gathered
    await page.getByText('1 cup Flour').click()
    await page.getByText('2 Eggs').click()

    // 5. Start Cooking (Step-by-step)
    await page.getByRole('button', { name: 'Start Cooking' }).click()
    await expect(page.getByText('Step 1 of 2')).toBeVisible()
    await expect(page.getByText('Mix ingredients')).toBeVisible()

    // 6. Advance steps
    await page.getByRole('button', { name: 'Next Step' }).click()
    await expect(page.getByText('Step 2 of 2')).toBeVisible()
    await expect(page.getByText('Bake for 20 mins')).toBeVisible()

    // 7. Finish Cooking (Enters Review)
    await page.getByRole('button', { name: 'Finish Cooking' }).click()
    await expect(page.getByText("Chef's Kiss!")).toBeVisible()

    // 8. Submit feedback
    // Rate 4 stars
    const stars = page.locator('button:has(svg.lucide-star)')
    await stars.nth(3).click() // 4th star

    await page
      .getByPlaceholder('Added a pinch more salt next time...')
      .fill('Delicious and fluffy!')
    await page.getByRole('button', { name: 'Save Review & Finish' }).click()

    // 9. Verify it's saved (returned to library)
    await expect(page.getByText('CHEFBOARD')).toBeVisible()

    // Re-open and check notes/rating
    // Ensure the group is open again (Uncategorized)
    const uncategorizedGroup2 = page.getByRole('button').filter({ hasText: 'Uncategorized' })
    // If it's visible but not expanded (we can check aria-expanded if available, but simplest is to click if found)
    // Actually, in our case, if it's visible it might be closed. Clicking it again is safer if we wait for it.
    await uncategorizedGroup2.scrollIntoViewIfNeeded()
    await uncategorizedGroup2.click({ force: true })

    await page.getByRole('button').filter({ hasText: testTitle }).first().click({ force: true })
    await expect(page.getByText('Delicious and fluffy!')).toBeVisible()
    // Check if 4 stars are visible in the preview section
    const previewStars = page.locator(
      '.mb-8.rounded-md-xl svg.lucide-star.fill-md-sys-color-tertiary',
    )
    await expect(previewStars).toHaveCount(4)
  })
})
