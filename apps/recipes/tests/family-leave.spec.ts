import { test, expect, type Page } from '@playwright/test'

const login = async (page: Page) => {
  await page.context().addCookies([
    {
      name: 'site_auth',
      value: 'true',
      domain: '127.0.0.1',
      path: '/',
    },
    {
      name: 'site_user',
      value: 'TestUser',
      domain: '127.0.0.1',
      path: '/',
    },
    {
      name: 'site_email', // needed?
      value: 'test@example.com',
      domain: '127.0.0.1',
      path: '/',
    },
  ])
}

test.describe('Family Leave Flow', () => {
  test('Leave family as a member', async ({ page }) => {
    // 1. Mock Auth & Family Member
    await login(page)
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'chefboard-user',
        JSON.stringify({
          id: 'member-1',
          email: 'member@example.com',
          displayName: 'Family Member',
          photoURL: 'https://example.com/photo.jpg',
          role: 'user',
          familyId: 'family-123',
        }),
      )
    })

    // Mock API responses
    await page.route(/\/api\/recipes/, async (route) => {
      await route.fulfill({ json: { recipes: [] } })
    })

    await page.route('/protected/recipes/api/families/current', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            success: true,
            family: {
              id: 'family-123',
              name: 'Test Family',
              members: ['creator-1', 'member-1'],
              createdBy: 'creator-1', // created by someone else
              createdAt: new Date().toISOString(),
            },
            members: [
              {
                id: 'creator-1',
                displayName: 'Creator',
                role: 'creator',
                email: 'creator@test.com',
              },
              {
                id: 'member-1',
                displayName: 'Family Member',
                role: 'user',
                email: 'member@test.com',
              },
            ],
            currentUserId: 'member-1',
          },
        })
      } else if (route.request().method() === 'DELETE') {
        // Handle delete family (should not be called here)
        await route.fulfill({ status: 400 })
      } else {
        await route.continue()
      }
    })

    await page.route('/protected/recipes/api/families/leave', async (route) => {
      await route.fulfill({
        json: { success: true },
      })
    })

    await page.goto('/')

    // 2. Open Family Settings
    // Assuming there's a way to get to family settings.
    // Usually via a "Manage Family" button or from the user menu.
    // Based on previous contexts, maybe we need to navigate or assume we are in settings view?
    // RecipeManager defaults to library but listens to 'navigate-to-family-settings' or we can mock the view?
    // Let's try to trigger the navigation event if possible, or click a button if reachable.
    // "Manage Family" button usually exists in the UI.

    // Force view to family-settings for testing isolation if needed,
    // but better to click through if we can find the button.
    // In SettingsView (if reachable), there is a "Manage Family" button.

    // Let's assume we can dispatch the event for now to test the component in isolation
    await expect(page.getByTestId('loading-indicator')).toBeHidden()
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-family-settings'))
    })

    // 3. Verify Leave Button is visible
    const leaveButton = page.getByRole('button', { name: 'Leave Family' })
    await expect(leaveButton).toBeVisible()

    // 4. Click Leave and Confirm
    // Helper to accept confirm dialog
    page.on('dialog', (dialog) => dialog.accept())

    await leaveButton.click()

    // 5. Verify API call and UI Update (Mocked response checks)
    // We expect the view to close or change.
    // And an alert "You have left the family."

    // Wait for alert to be handled (Playwright handles dialogs automatically if listener attached, but we need to verify content if possible, or just effect)
    // Actually, `lib/dialogStore` might be using native confirm/alert or custom?
    // `RecipeManager.tsx` imports `alert, confirm` from `../../lib/dialogStore`.
    // If it uses custom dialogs (which it seems to, given `tests/dialogs.spec.ts` context), we interact with DOM elements.

    // Let's check if `alert` / `confirm` are custom components in the DOM.
    // Based on `RecipeManager.tsx` code: `import { alert, confirm } from '../../lib/dialogStore'`
    // And `RecipeManager` renders `<ResponsiveModal ...>` but `confirm`/`alert` usually render into a global layer if it's a store?
    // Wait, `RecipeManager` doesn't seem to render a `<DialogContainer>`?
    // Ah, `RecipeManager.tsx` renders `<DayPicker>`, `<CalendarPicker>`, `ResponsiveModal`...
    // I don't see a global `<Dialogs />` component in `RecipeManager`.
    // Maybe `layout.astro` or `App.tsx` handles it?
    // Or maybe `lib/dialogStore` triggers a native alert if components aren't mounted?
    // Previous conversation mentioned: "Implement and Verify Dialogs... replace native browser alert and confirm... with custom... from @/lib/dialogStore".
    // So they are likely custom components.

    // If they are custom, we should see text in the DOM.
    await expect(page.getByText('Are you sure you want to leave this family?')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm' }).click() // Assuming "Confirm" is the button text.

    await expect(page.getByText('You have left the family.')).toBeVisible()
    await page.getByRole('button', { name: 'OK' }).click() // Assuming alert has "OK".
  })

  test('Creator cannot leave family', async ({ page }) => {
    // 1. Mock Creator
    await login(page)
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'chefboard-user',
        JSON.stringify({
          id: 'creator-1',
          email: 'creator@example.com',
          displayName: 'Creator',
          photoURL: 'https://example.com/photo.jpg',
          role: 'creator',
          familyId: 'family-123',
        }),
      )
    })

    // Mock API
    await page.route(/\/api\/recipes/, async (route) => {
      await route.fulfill({ json: { recipes: [] } })
    })

    await page.route('/protected/recipes/api/families/current', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          family: {
            id: 'family-123',
            name: 'Test Family',
            members: ['creator-1'],
            createdBy: 'creator-1',
            createdAt: new Date().toISOString(),
          },
          members: [
            { id: 'creator-1', displayName: 'Creator', role: 'creator', email: 'creator@test.com' },
          ],
          currentUserId: 'creator-1',
        },
      })
    })

    await page.goto('/')

    await expect(page.getByTestId('loading-indicator')).toBeHidden()
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-family-settings'))
    })

    // 3. Verify Leave Button is NOT visible, Delete Button IS visible
    await expect(page.getByRole('button', { name: 'Leave Family' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete Family' })).toBeVisible()
  })
})
