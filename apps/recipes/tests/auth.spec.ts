import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page with Google Sign-in', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/protected/recipes/login')

    // 2. Verify UI Elements
    await expect(page.getByRole('heading', { name: 'Chef Login' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  })

  test('should handle pending access status', async ({ page }) => {
    // Mock Login Response for "Pending"
    await page.route('**/api/auth/login', async (route) => {
      const json = { error: 'Unauthorized', code: 'auth/pending', details: 'Pending Approval' }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify(json),
      })
    })

    // 1. Visit Login Page
    await page.goto('/protected/recipes/login')

    // 2. Trigger Login (Simulated)
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.waitForFunction(() => !!(window as any).simulateGoogleLogin)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any).simulateGoogleLogin('mock-token'))

    // 3. Verify Landing on "Pending" State
    await expect(page.getByText('Access Pending', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: 'Check Status' })).toBeVisible()
  })

  test('should handle denied access and request flow', async ({ page }) => {
    // Mock Login Response for "Denied"
    await page.route('**/api/auth/login', async (route) => {
      const json = { error: 'Unauthorized', code: 'auth/denied', details: 'Access Denied' }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify(json),
      })
    })

    // Mock Request Access Response
    await page.route('**/api/auth/request-access', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // 1. Visit Login Page
    await page.goto('/protected/recipes/login')

    // 2. Trigger Login (Simulated)
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.waitForFunction(() => !!(window as any).simulateGoogleLogin)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any).simulateGoogleLogin('mock-token'))

    // 3. Verify Landing on "Denied" State
    await expect(page.getByText('Access Restricted')).toBeVisible({ timeout: 10000 })

    // 4. Click Request Access
    await page.getByRole('button', { name: 'Request Access' }).click()

    // 5. Verify Transition to Pending
    await expect(page.getByText('Access Pending')).toBeVisible()
  })

  test('should handle invite code redemption', async ({ page }) => {
    // 1. Mock Login Failure (Denied)
    await page.route('**/api/auth/login', async (route) => {
      const json = { error: 'Unauthorized', code: 'auth/denied', details: 'Access Denied' }
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify(json),
      })
    })

    // 2. Mock Redeem Success
    await page.route('**/api/auth/redeem-code', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // Dynamic Login Mock
    let loginAttempts = 0
    await page.unroute('**/api/auth/login') // Clear previous static mock if any
    await page.route('**/api/auth/login', async (route) => {
      loginAttempts++
      if (loginAttempts === 1) {
        const json = { error: 'Unauthorized', code: 'auth/denied', details: 'Access Denied' }
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify(json),
        })
      } else {
        // Success!
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      }
    })

    // 1. Visit Login Page
    await page.goto('/protected/recipes/login')

    // 2. Trigger Login (Simulated Fail)
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.waitForFunction(() => !!(window as any).simulateGoogleLogin)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any).simulateGoogleLogin('mock-token'))
    await expect(page.getByText('Access Restricted')).toBeVisible({ timeout: 10000 })

    // 3. Enter Code
    await page.getByPlaceholder('Enter code').fill('TESTCODE')
    await page.getByRole('button', { name: 'Redeem' }).click()

    // 4. Verify Redirect (which means leaving login page)
    // We expect to NOT see the restricted message anymore or navigate away
    // Since the next login is mocked success, it should redirect to home.
    await expect(page).toHaveURL(/.*\/protected\/recipes/, { timeout: 10000 })
  })
})
