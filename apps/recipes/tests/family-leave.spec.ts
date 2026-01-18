import { test, expect } from './msw-setup'

test.describe('Family Leave Flow', () => {
  test('Leave family as a member', async ({ page }) => {
    // Disable SW to prevent interference and reloads
    await page.addInitScript(() => {
      // @ts-expect-error - Removing service worker for test isolation
      delete window.navigator.serviceWorker
    })

    // 1. Setup specific mock for MEMBER role
    await page.route('**/api/families/current', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          family: {
            id: 'family-123',
            name: 'Test Family',
            members: ['creator-1', 'member-1'],
            createdBy: 'creator-1',
            createdAt: new Date().toISOString(),
          },
          members: [
            { id: 'creator-1', displayName: 'Creator', role: 'creator', email: 'c@t.com' },
            { id: 'member-1', displayName: 'Me', role: 'user', email: 'm@t.com' },
          ],
          currentUserId: 'member-1',
        },
      })
    })

    await page.route('**/api/families/leave', async (route) => {
      await route.fulfill({ json: { success: true } })
    })

    // Visit with Onboarding Bypass
    await page.goto('/protected/recipes?skip_onboarding=true')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Explicitly wait for the Header/App to be interactive
    await expect(page.getByText('CHEFBOARD')).toBeVisible()
    // Safety buffer for React hydration and event listener attachment
    await page.waitForTimeout(1000)

    // Navigate
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-family-settings'))
    })

    // Verify Leave Button is visible
    const leaveButton = page.getByRole('button', { name: 'Leave Family' })
    await expect(leaveButton).toBeVisible()

    // Click Leave and Confirm
    page.once('dialog', (dialog) => dialog.accept())
    await leaveButton.click()
  })

  test('Creator cannot leave family', async ({ page }) => {
    // Disable SW to prevent interference and reloads
    await page.addInitScript(() => {
      // @ts-expect-error - Removing service worker for test isolation
      delete window.navigator.serviceWorker
    })

    // 1. Setup specific mock for CREATOR role
    await page.route(/.*\/api\/families\/current/, async (route) => {
      await route.fulfill({
        json: {
          success: true,
          family: {
            id: 'family-123',
            name: 'Test Family',
            members: ['creator-1', 'member-1'],
            createdBy: 'creator-1',
            createdAt: new Date().toISOString(),
          },
          members: [
            { id: 'creator-1', displayName: 'Me', role: 'creator', email: 'c@t.com' },
            { id: 'member-1', displayName: 'Member', role: 'user', email: 'm@t.com' },
          ],
          currentUserId: 'creator-1',
        },
      })
    })

    // Visit
    await page.goto('/protected/recipes?skip_onboarding=true')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Explicitly wait for the Header/App to be interactive
    // This ensures the useEffect that adds the 'navigate-to-family-settings' listener has run
    await expect(page.getByText('CHEFBOARD')).toBeVisible()
    // Safety buffer for React hydration and event listener attachment
    await page.waitForTimeout(1000)

    // Navigate
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-family-settings'))
    })

    // Verify View is Open
    await expect(page.getByRole('heading', { name: 'Manage Family' })).toBeVisible()

    // Verify Leave Button is NOT visible, Delete Button IS visible
    await expect(page.getByRole('button', { name: 'Leave Family' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete Family' })).toBeVisible()
  })
})
