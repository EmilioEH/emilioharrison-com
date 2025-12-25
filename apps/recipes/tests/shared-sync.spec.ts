import { test, expect, type Browser } from '@playwright/test'

test.describe('Shared Recipe Sync', () => {
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

  test('recipes should be shared between different users', async ({ browser }) => {
    // 1. User A creates a recipe
    const contextA = await createAuthContext(browser, 'Alice')
    const pageA = await contextA.newPage()
    await pageA.goto('/protected/recipes')

    const uniqueTitle = `Shared Pie ${Date.now()}`

    // Add Recipe
    await pageA
      .getByRole('button')
      .filter({ has: pageA.locator('svg.lucide-plus') })
      .click()

    await pageA.getByLabel('Title').fill(uniqueTitle)
    await pageA.getByRole('button', { name: 'Save Recipe' }).click()

    // Wait for save confirmation
    await expect(pageA.getByText('Saved')).toBeVisible()

    // 2. User B (different session) should see it
    const contextB = await createAuthContext(browser, 'Bob')
    const pageB = await contextB.newPage()
    await pageB.goto('/protected/recipes')

    // 3. Verify with retry (KV is eventually consistent)
    await expect(async () => {
      await pageB.reload()
      // Expand 'Uncategorized' if it exists (default group for new recipes)
      // Note: It usually defaults to open if it's the first group.
      // Toggling it blindly might close it.
      // Just check for visibility.
      await expect(pageB.getByText(uniqueTitle)).toBeVisible()
    }).toPass({ timeout: 15_000 })

    await contextA.close()
    await contextB.close()
  })
})
