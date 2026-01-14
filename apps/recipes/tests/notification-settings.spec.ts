import { test, expect, AUTH_COOKIES } from './msw-setup'

const DEFAULT_REMINDERS = {
  weeklyPlan: { enabled: false, day: 'Sunday', time: '18:00' },
  groceryList: { enabled: false, day: 'Sunday', time: '10:00' },
  dailyCooking: { enabled: false, offsetHours: 2 },
}

test.describe('Notification Settings', () => {
  // Shared state for the "server"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let serverPreferences: any

  test.beforeEach(async ({ page, context }) => {
    // Reset server state
    serverPreferences = {
      notifications: {
        email: true,
        push: true,
        reminders: { ...DEFAULT_REMINDERS },
      },
    }

    await context.addCookies([...AUTH_COOKIES])

    await page.route('**/api/user/preferences', async (route) => {
      const method = route.request().method()

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            preferences: serverPreferences,
          }),
        })
      } else if (method === 'POST') {
        const data = await route.request().postDataJSON()
        // Update server state (merge)
        if (data.notifications) {
          serverPreferences.notifications = {
            ...serverPreferences.notifications,
            ...data.notifications,
          }
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/protected/recipes')
  })

  test('should allow enabling reminder schedule and persist it', async ({ page }) => {
    // 1. Open Settings
    await page.getByRole('button', { name: 'Emilio' }).click()
    await page.getByText('Settings', { exact: true }).click()

    // 2. Enable Weekly Plan
    const weeklySection = page.locator('div.border', { hasText: 'Weekly Meal Planning' })
    // Wait for it to be visible
    await expect(weeklySection).toBeVisible()

    // Ensure initial state
    await expect(weeklySection.locator('input[type="checkbox"]')).not.toBeChecked()

    // Click header to enable
    // The clickable area for the visual switch is usually the safest target
    // We target the switch container
    await weeklySection.locator('div.h-6.w-11').click()

    // Verify checked visually
    await expect(weeklySection.locator('input[type="checkbox"]')).toBeChecked()

    // 3. Save
    await page.getByRole('button', { name: 'Save Preferences' }).click()
    // Wait for modal to close
    await expect(page.locator('div.absolute.inset-0.z-50')).not.toBeVisible()

    // 4. Reload page to verify persistence
    await page.reload()

    // 5. Check Settings again
    await page.getByRole('button', { name: 'Emilio' }).click()
    await page.getByText('Settings', { exact: true }).click()

    const weeklySectionAfter = page.locator('div.border', { hasText: 'Weekly Meal Planning' })
    await expect(weeklySectionAfter.locator('input[type="checkbox"]')).toBeChecked()
  })
})
