import { test, expect, type Browser, type BrowserContext } from '@playwright/test'

test.describe('Shared Recipe Storage', () => {
  // Shared storage simulation (mimics Cloudflare KV shared key)
  // This is outside the test so it's shared across all contexts
  let sharedRecipes: unknown[] = []

  const setupMockStorage = async (context: BrowserContext) => {
    await context.route('/api/user-data', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: { recipes: sharedRecipes } })
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        sharedRecipes = body.recipes || []
        await route.fulfill({ json: { success: true } })
      } else {
        await route.continue()
      }
    })
  }

  const createAuthContext = async (browser: Browser, name: string) => {
    const context = await browser.newContext({
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
    
    // Set up mock storage for this context
    await setupMockStorage(context)
    
    return context
  }

  test('recipes should be shared between all family members', async ({ browser }) => {
    // Reset shared storage before test
    sharedRecipes = []

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

    // Wait for save confirmation
    await expect(pageAlice.getByText('Saved')).toBeVisible()

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
