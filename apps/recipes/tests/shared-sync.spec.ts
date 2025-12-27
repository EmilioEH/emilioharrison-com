import { test, expect, type Browser } from '@playwright/test'

test.describe('Shared Recipe Storage', () => {
  const createAuthContext = async (browser: Browser, name: string) => {
    const context = await browser.newContext({
      storageState: {
        cookies: [
          {
            name: 'site_auth',
            value: 'true',
            domain: '127.0.0.1',
            path: '/',
            expires: -1,
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          },
          {
            name: 'site_user',
            value: name,
            domain: '127.0.0.1',
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

    return context
  }

  test('recipes should be shared between all family members', async ({ browser }) => {
    // Create unique recipe name to avoid conflicts with other test runs
    const uniqueRecipe = `Family Recipe ${Date.now()}`

    // 1. Alice (Mom) adds a recipe
    const contextAlice = await createAuthContext(browser, 'Alice')
    const pageAlice = await contextAlice.newPage()

    await pageAlice.goto('/protected/recipes')

    // Add Recipe
    await pageAlice
      .getByRole('button')
      .filter({ has: pageAlice.locator('svg.lucide-plus') })
      .click()

    await pageAlice.getByLabel('Title').fill(uniqueRecipe)
    await pageAlice.getByRole('button', { name: 'Save Recipe' }).click()

    // Wait for save confirmation (Review & Edit or New Recipe header should be gone)
    await expect(pageAlice.getByRole('heading', { name: 'New Recipe' })).not.toBeVisible()

    // 2. Bob (Dad) should see Alice's recipe in the shared collection
    const contextBob = await createAuthContext(browser, 'Bob')
    const pageBob = await contextBob.newPage()

    await pageBob.goto('/protected/recipes')

    // 3. Verify Bob sees Alice's recipe
    await expect(pageBob.getByText(uniqueRecipe)).toBeVisible()

    await contextAlice.close()
    await contextBob.close()
  })
})
