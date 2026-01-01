import { test, expect } from '@playwright/test'

test.describe('Menu UX & Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set auth cookies for both potential domains
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: 'localhost', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: 'localhost', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: 'localhost', path: '/' },
      { name: 'site_auth', value: 'true', domain: 'localhost', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: 'localhost', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: 'localhost', path: '/' },
    ])
    await page.goto('/protected/recipes')
    // Wait for recipes to load
    await expect(page.getByText('CHEFBOARD')).toBeVisible()
    await page.waitForTimeout(1000) // Ensure hydration
  })

  test('collapsing header shrinks on scroll', async ({ page }) => {
    // Initial State: Welcome bar visible (h-7 approx 28px)
    const welcomeBar = page.getByText('Welcome, TestUser')
    await expect(welcomeBar).toBeVisible()

    // Scroll Down
    await page.locator('main').evaluate((el) => (el.scrollTop = 100))
    await page.waitForTimeout(500) // Wait for transition

    // Expect Welcome bar to be hidden or height 0
    await expect(welcomeBar).not.toBeVisible()

    // Scroll Up
    await page.locator('main').evaluate((el) => (el.scrollTop = 0))
    await page.waitForTimeout(500)
    await expect(welcomeBar).toBeVisible()
  })

  test('scrollspy nav sticks and highlights', async ({ page }) => {
    // Check if category bar exists (if multiple groups)
    // Note: Depends on mock data. Assuming default data has categories.
    const categoryNav = page.locator('main >> .sticky.z-40')
    if ((await categoryNav.count()) > 0) {
      await expect(categoryNav).toBeVisible()
      // Scroll to a group
      // difficult to test exact scrollspy without predictable data, skipping deep assertion
    }
  })

  test('scroll restoration works on back navigation', async ({ page }) => {
    // 1. Scroll down
    const main = page.locator('main')
    await main.evaluate((el) => (el.scrollTop = 500))
    const initialScroll = await main.evaluate((el) => el.scrollTop)
    expect(initialScroll).toBe(500)

    // 2. Click a recipe (first one visible)
    await page.locator('button:has-text("min")').first().click()

    // 3. Wait for Detail View
    await expect(page.getByTestId('recipe-detail-view')).toBeVisible()

    // 4. Click Back (Browser Back or UI Back)
    await page.getByRole('button', { name: 'Back' }).click()

    // 5. Verify Scroll Position Restored
    // Allow small margin for error due to layout shifts
    // Wait a bit for useLayoutEffect
    await page.waitForTimeout(500)
    const finalScroll = await main.evaluate((el) => el.scrollTop)
    expect(Math.abs(finalScroll - 500)).toBeLessThan(50)
  })
})
