import { test, expect } from '@playwright/test'

test('header layout and burger menu integration', async ({ page, context }) => {
  // Set auth cookies to bypass middleware
  await context.addCookies([
    { name: 'site_auth', value: 'true', domain: 'localhost', path: '/' },
    { name: 'site_user', value: 'TestUser', domain: 'localhost', path: '/' },
    { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: 'localhost', path: '/' },
  ])

  await page.goto('/protected/recipes')

  // 1. Verify Header Title
  // 1. Verify Header Title
  await page.waitForTimeout(1000)
  await expect(page.locator('h1')).toContainText('CHEFBOARD')

  // 2. Verify Menu Button is integrated
  const menuButton = page.getByRole('button', { name: 'Menu' })
  await expect(menuButton).toBeVisible()

  // 3. Verify Welcome Bar
  await expect(page.getByText('Welcome, TestUser')).toBeVisible()

  // 4. Click Menu and verify drawer opens
  await menuButton.click()
  const drawer = page.locator('.animate-in.slide-in-from-right') // Based on GlobalBurgerMenu code
  await expect(drawer).toBeVisible()

  // 5. Close Menu
  await page.getByLabel('Close Menu').click()
  await expect(drawer).not.toBeVisible()
})
