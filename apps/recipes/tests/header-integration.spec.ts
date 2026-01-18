import { test, expect } from './msw-setup'

test('header layout and burger menu integration', async ({ page, context }) => {
  // Set auth cookies to bypass middleware
  await context.addCookies([
    { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
    { name: 'site_user', value: 'TestUser', domain: '127.0.0.1', path: '/' },
    { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
  ])

  await page.goto('/protected/recipes')

  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()))
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.message))

  // 1. Verify Header Title
  await page.waitForTimeout(1000)
  await expect(page.getByRole('link', { name: 'CHEFBOARD' })).toBeVisible()

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
