import { test, expect, type Browser } from '@playwright/test'

test.describe('User Data Isolation', () => {
  const createAuthContext = async (browser: Browser, name: string) => {
    return await browser.newContext({
      storageState: {
        cookies: [
          {
            name: 'site_auth',
            value: 'true',
            domain: 'localhost',
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          },
          {
            name: 'site_user',
            value: name,
            domain: 'localhost',
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
  }

  test('recipes should be isolated per user (not shared)', async ({ browser }) => {
    // 1. User A creates a recipe
    const contextA = await createAuthContext(browser, `Alice-${Date.now()}`)
    const pageA = await contextA.newPage()
    await pageA.goto('/protected/recipes')

    const aliceRecipe = `Alice's Secret Recipe ${Date.now()}`

    // Add Recipe
    await pageA
      .getByRole('button')
      .filter({ has: pageA.locator('svg.lucide-plus') })
      .click()

    await pageA.getByLabel('Title').fill(aliceRecipe)
    await pageA.getByRole('button', { name: 'Save Recipe' }).click()

    // Wait for save confirmation
    await expect(pageA.getByText('Saved')).toBeVisible()

    // 2. User B (different session) should NOT see Alice's recipe
    const contextB = await createAuthContext(browser, `Bob-${Date.now()}`)
    const pageB = await contextB.newPage()
    await pageB.goto('/protected/recipes')

    // 3. Verify Bob doesn't see Alice's recipe
    await pageB.waitForLoadState('networkidle')
    await expect(pageB.getByText(aliceRecipe)).not.toBeVisible()

    await contextA.close()
    await contextB.close()
  })
})
