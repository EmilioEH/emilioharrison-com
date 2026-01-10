import { test, expect, AUTH_COOKIES } from './msw-setup'

test.describe('Invite Sharing', () => {
  test.use({
    storageState: {
      cookies: [...AUTH_COOKIES],
      origins: [],
    },
  })

  test.skip('can generate and share activation code', async ({ page }) => {
    // Mock navigator.share
    await page.addInitScript(() => {
      // @ts-expect-error - navigator.share is read-only in some environments
      navigator.share = async (data: ShareData) => {
        // @ts-expect-error - window.__shareData is a test helper
        window.__shareData = data
        return Promise.resolve()
      }
    })

    // Mock Access Code Generation
    await page.route('**/api/admin/access-codes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, code: 'TEST-CODE-123' }),
      })
    })

    // Explicitly set cookies to ensure auth
    await page.context().addCookies(AUTH_COOKIES)

    // Navigate to app
    await page.goto('/protected/recipes?skip_onboarding=true')

    // Debug: Check if we are redirected
    if (page.url().includes('login')) {
      console.log('Redirected to login. AUTH_COOKIES might be invalid or ignored.')
    }

    // Wait for loading to finish
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 10000 })

    page.on('console', (msg) => console.log(`PAGE LOG: ${msg.text()}`))

    // Check if we are on the right URL
    expect(page.url()).toContain('/protected/recipes')

    // Wait for header
    try {
      await expect(page.getByText('CHEFBOARD')).toBeVisible({ timeout: 5000 })
    } catch (e) {
      console.log('CHEFBOARD not found. Dumping content snippet:')
      const content = await page.content()
      console.log(content.substring(0, 1000))
      throw e
    }

    // Open Menu
    await page.getByRole('button', { name: 'Menu' }).click()

    // Open Settings
    await page.getByRole('menuitem', { name: 'Settings' }).click()

    // Finds "Invite Friends" section
    await expect(page.getByText('Invite Friends')).toBeVisible()

    page.on('request', (request) => console.log('>>', request.method(), request.url()))
    page.on('response', (response) => console.log('<<', response.status(), response.url()))

    page.on('dialog', async (dialog) => {
      console.log('DIALOG:', dialog.message())
      await dialog.dismiss()
    })

    // Click Generate New Code
    await page.getByRole('button', { name: 'Generate New Code' }).click()

    // Wait for code to appear
    await expect(page.getByText('Your Activation Code')).toBeVisible({ timeout: 10000 })

    // Setup share spy check
    const codeElement = page.locator('.font-mono.text-3xl') // Class from SettingsView
    await expect(codeElement).toBeVisible()
    const codeText = await codeElement.innerText()

    // Click Share
    await page.getByRole('button', { name: 'Share' }).click()

    // Verify share data
    const shareData = await page.evaluate(
      () => (window as unknown as { __shareData: ShareData }).__shareData,
    )
    expect(shareData).toBeTruthy()
    expect(shareData.text).toContain('Join the Recipe App')
    expect(shareData.text).toContain(codeText)
    expect(shareData.title).toBe('Join the Recipe App')
  })
})
