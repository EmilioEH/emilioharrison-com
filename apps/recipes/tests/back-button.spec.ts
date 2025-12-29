import { test, expect } from '@playwright/test'

test.describe('Back Button Navigation', () => {
  test('should not return to login page after logging in and pressing back', async ({
    context,
    page,
  }) => {
    // 1. Go to a neutral starting page
    await page.goto('about:blank')

    // 2. Set auth cookies (simulates Google Sign-In completion)
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'Emilio', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
    ])

    // 3. Go to protected app
    await page.goto('/protected/recipes')
    await expect(page.getByText('CHEFBOARD')).toBeVisible()

    // 4. Press Back
    await page.goBack()

    // 5. Should NOT be at login. Should be at about:blank
    await expect(page).toHaveURL('about:blank')
    await expect(page).not.toHaveURL(/\/login/)
  })
})
