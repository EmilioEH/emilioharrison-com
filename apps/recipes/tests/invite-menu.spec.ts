import { test, expect } from './msw-setup'

test.describe('Invite Menu Feature', () => {
  test.beforeEach(async ({ page, context }) => {
    // Add cookies for both localhost and 127.0.0.1 to be safe
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: 'localhost', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: 'localhost', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: 'localhost', path: '/' },
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
    ])
    await page.goto('/protected/recipes')
    await expect(page.getByText('CHEFBOARD')).toBeVisible({ timeout: 15000 })
  })

  test('can open invite view from burger menu', async ({ page }) => {
    // Open Burger Menu
    await page.getByRole('button', { name: 'Menu' }).click()

    // Check Invite button exists and click it
    const inviteButton = page.getByRole('menuitem', { name: 'Invite' })
    await expect(inviteButton).toBeVisible()
    await inviteButton.click()

    // Verify Invite View
    await expect(page.getByRole('heading', { name: 'Invite Others' })).toBeVisible()
    await expect(page.getByText('Invite to Your Family')).toBeVisible()
    await expect(page.getByText('Activation Code')).toBeVisible()

    // Close Invite View
    const closeButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-x') })
      .last()
    await closeButton.click()
    await expect(page.getByRole('heading', { name: 'Invite Others' })).not.toBeVisible()
  })

  test('invite section is removed from settings', async ({ page }) => {
    // Open Burger Menu
    await page.getByRole('button', { name: 'Menu' }).click()

    // Open Settings
    await page.getByRole('menuitem', { name: 'Settings' }).click()

    // Verify Settings View Open
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

    // Verify Invite Section is GONE
    await expect(page.getByText('Invite Others')).not.toBeVisible()
    await expect(page.getByText('Invite to Your Family')).not.toBeVisible()

    // Clean up: Close settings
    const closeButton = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-x') })
      .last()
    await closeButton.click()
  })
})
