import { test, expect, AUTH_COOKIES } from './msw-setup'

test.describe('Invite Sharing', () => {
  test.use({
    storageState: {
      cookies: [...AUTH_COOKIES],
      origins: [],
    },
  })

  test('can generate and share activation code', async ({ page }) => {
    // Mock navigator.share
    await page.addInitScript(() => {
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
    await page.goto('/protected/recipes?skip_onboarding=true&skip_setup=true')

    // Expect loading to complete
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 10000 })

    // Open Menu
    await page.getByRole('button', { name: 'Menu' }).click()

    // Open Invite Menu
    await page.getByRole('menuitem', { name: 'Invite' }).click()

    // Find "Activation Code" section
    await expect(page.getByText('Activation Code')).toBeVisible()

    // Click Generate New Code
    await page.getByRole('button', { name: 'Generate New Code' }).click()

    // Wait for code to appear
    await expect(page.getByText('Your Activation Code')).toBeVisible({ timeout: 10000 })

    // Setup share spy check
    const codeElement = page.locator('.font-mono.text-3xl')
    await expect(codeElement).toBeVisible()
    const codeText = await codeElement.innerText()
    expect(codeText).toBe('TEST-CODE-123')

    // Click Share
    await page.getByRole('button', { name: 'Share' }).click()

    // Verify share data
    const shareData = await page.evaluate(
      () => (window as unknown as { __shareData: ShareData }).__shareData,
    )
    expect(shareData).toBeTruthy()
    expect(shareData.text).toContain('Join the Recipe App')
    expect(shareData.text).toContain(codeText)
  })

  test('can invite user to family', async ({ page }) => {
    // Mock Family Data to ensure we have a family
    await page.route('**/api/families/current', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            family: { id: 'fam_123', name: 'Test Family', createdBy: 'user_1' },
            members: [{ id: 'user_1', role: 'creator', email: 'me@example.com' }],
          }),
        })
      } else {
        await route.continue()
      }
    })

    // Mock Invite API
    await page.route('**/api/families/invite', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}')
      expect(body.email).toBe('partner@example.com')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    // Explicitly set cookies to ensure auth
    await page.context().addCookies(AUTH_COOKIES)

    // Navigate to app
    await page.goto('/protected/recipes?skip_onboarding=true&skip_setup=true')

    // Expect loading to complete
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 10000 })

    // Open Menu
    await page.getByRole('button', { name: 'Menu' }).click()

    // Open Manage Family (not Settings)
    await page.getByRole('menuitem', { name: 'Manage Family' }).click()

    // Find "Invite New Member" section
    await expect(page.getByText('Invite New Member')).toBeVisible()

    // Fill Email
    await page.getByPlaceholder('partner@example.com').fill('partner@example.com')

    // Click Invite
    await page.getByRole('button', { name: 'Invite' }).click()

    // Check for success message (Alert dialog mock might be needed or check page content)
    // Based on FamilyManagementView.tsx: alert(`${inviteEmail} has been invited!`)
    // Since we can't easily check alert() in Playwright without listener, we might check if list refreshed
    // But verify the button returns to enabled state or input clears
    await expect(page.getByPlaceholder('partner@example.com')).toBeEmpty()
  })
})
