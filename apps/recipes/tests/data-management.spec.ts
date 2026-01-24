import { test, expect } from './msw-setup'
import fs from 'fs'
import path from 'path'

test.describe('Data Management Features', () => {
  test.use({
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
          value: 'TestUser',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com',
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

  // Mock Data Store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRecipes: any[] = []

  test.beforeEach(async ({ page }) => {
    // Reset mock data
    mockRecipes = []

    // Mock API Routes
    await page.route('**/api/recipes*', async (route) => {
      const method = route.request().method()
      const url = route.request().url()

      // GET List
      if (method === 'GET' && !url.split('api/recipes/').pop()) {
        await route.fulfill({ status: 200, json: { recipes: mockRecipes } })
        return
      }

      // POST Create
      if (method === 'POST' && url.endsWith('api/recipes')) {
        const body = await route.request().postDataJSON()
        const newRecipe = {
          ...body,
          id: body.id || `mock-${Date.now()}-${Math.random()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        mockRecipes.push(newRecipe)
        await route.fulfill({ status: 201, json: { success: true, id: newRecipe.id } })
        return
      }

      // PUT Update
      if (method === 'PUT') {
        const id = url.split('/').pop()
        const body = await route.request().postDataJSON()
        const idx = mockRecipes.findIndex((r) => r.id === id)
        if (idx !== -1) {
          mockRecipes[idx] = { ...mockRecipes[idx], ...body, updatedAt: new Date().toISOString() }
        }
        await route.fulfill({ status: 200, json: { success: true } })
        return
      }

      // DELETE
      if (method === 'DELETE') {
        const id = url.split('/').pop()
        mockRecipes = mockRecipes.filter((r) => r.id !== id)
        await route.fulfill({ status: 200, json: { success: true } })
        return
      }

      // Fallback
      await route.continue()
    })

    // Prepare at least one recipe if needed, but tests seem to create their own
  })

  test('should allow bulk deleting recipes', async ({ page }) => {
    await page.goto('/protected/recipes')

    // 1. Create 2 recipes
    // 1. Create 2 recipes
    const timestamp = Date.now()

    // First recipe
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    await page.getByLabel('Title').fill(`Bulk Delete 1 ${timestamp}`)
    await page.getByLabel('Protein').selectOption('Chicken')
    await page.getByRole('button', { name: 'Save Recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Recipe Saved!' })).toBeVisible()

    // Second recipe via "Add Another"
    await page.getByRole('button', { name: 'Add Another Recipe' }).click()
    await page.getByLabel('Title').fill(`Bulk Delete 2 ${timestamp}`)
    await page.getByLabel('Protein').selectOption('Chicken')
    await page.getByRole('button', { name: 'Save Recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Recipe Saved!' })).toBeVisible()

    // Back to library
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // 2. Enter Selection Mode (via Burger Menu)
    await page.getByRole('button', { name: 'Open Menu' }).click()
    await page.getByRole('menuitem', { name: 'Select Recipes' }).click()

    // 3. Select recipes
    await page
      .getByRole('button', { name: `Bulk Delete 1 ${timestamp}`, exact: false })
      .first()
      .click()
    await page
      .getByRole('button', { name: `Bulk Delete 2 ${timestamp}`, exact: false })
      .first()
      .click()

    // 4. Verify Header shows "2 Selected"
    await expect(page.getByText('2 Selected')).toBeVisible()

    // 5. Click Delete
    page.on('dialog', (dialog) => dialog.accept()) // Handle confirmation
    await page.getByRole('button', { name: 'Delete (2)' }).click()

    // 6. Verify gone
    await expect(page.getByText(`Bulk Delete 1 ${timestamp}`)).not.toBeVisible()
    await expect(page.getByText(`Bulk Delete 2 ${timestamp}`)).not.toBeVisible()
  })

  test('should allow exporting data', async ({ page }) => {
    await page.goto('/protected/recipes')

    // Create one recipe to export
    await page.getByRole('button', { name: 'Add Recipe' }).click()
    await page.getByLabel('Title').fill(`Export Test`)
    await page.getByRole('button', { name: 'Save Recipe' }).click()
    await expect(page.getByRole('heading', { name: 'Recipe Saved!' })).toBeVisible()
    await page.getByRole('button', { name: 'Back to Library' }).click()

    // Open Settings via Burger Menu
    await page.getByRole('button', { name: 'Open Menu' }).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()

    // Click Export and wait for download
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Data' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('chefboard_backup')
  })

  test('should allow importing data', async ({ page }) => {
    await page.goto('/protected/recipes')

    // Open Settings via Burger Menu
    await page.getByRole('button', { name: 'Open Menu' }).click()
    await page.getByRole('menuitem', { name: 'Settings' }).click()

    // Prepare content
    const importData = [
      {
        id: 'import-123',
        title: 'Imported Recipe',
        ingredients: [],
        steps: [],
        protein: 'Beef',
      },
    ]
    const jsonPath = path.join(process.cwd(), 'temp_import.json')
    fs.writeFileSync(jsonPath, JSON.stringify(importData))

    // Upload
    // The input is hidden inside the label. We can target input[type=file]
    page.on('dialog', (dialog) => dialog.accept()) // Alert success
    await page.setInputFiles('input[type="file"]', jsonPath)

    // Verify
    // Close settings
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-x') })
      .click()

    // Check for recipe
    await expect(page.getByText('Imported Recipe')).toBeVisible()

    // Cleanup
    fs.unlinkSync(jsonPath)
  })
})
