
import { test, expect } from '@playwright/test'

test.describe('Recipe Persistence', () => {
    test.use({
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
                    value: `ReproUser-${Date.now()}`,
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

    test('should persist recipe after reload', async ({ page }) => {
        await page.goto('/protected/recipes')

        const testTitle = `Repro Recipe ${Date.now()}`
        await page.getByRole('button').filter({ has: page.locator('svg.lucide-plus') }).click()
        await page.getByLabel('Title').fill(testTitle)
        await page.getByText('Save Recipe').click()
        
        // Wait for save sync (UI shows "Saved")
        await expect(page.getByText('Saved')).toBeVisible()

        // Reload the page
        await page.reload()

        // Verify it's still there
        // It defaults to Uncategorized folder
        await page.getByRole('button', { name: 'Uncategorized' }).click()
        await expect(page.getByText(testTitle)).toBeVisible()
    })
})
