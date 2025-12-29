import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test.describe('Data Management Features', () => {
  // Bypass auth
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

  test('should allow bulk deleting recipes', async ({ page }) => {
    await page.goto('/protected/recipes')

    // 1. Create 2 recipes
    const timestamp = Date.now()
    for (let i = 1; i <= 2; i++) {
      await page.getByRole('button', { name: 'Add Recipe' }).click()
      await page.getByLabel('Title').fill(`Bulk Delete ${i} ${timestamp}`)
      await page.getByLabel('Protein').selectOption('Chicken')
      await page.getByRole('button', { name: 'Save Recipe' }).click()
      // Wait for library to show
      await page.getByRole('button', { name: 'Add Recipe' }).waitFor()
    }

    // 2. Enter Selection Mode (Button in Library view)
    // Need to make sure filtered list is not empty.
    const selectBtn = page.getByRole('button', { name: 'Select Recipes' })
    await expect(selectBtn).toBeVisible()
    await selectBtn.click()

    // 3. Select recipes
    // We can click the cards. In selection mode, clicking card -> toggle.
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
