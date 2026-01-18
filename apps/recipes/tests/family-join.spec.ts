import { test, expect } from './msw-setup'

test.describe('Family Join Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // 1. Authenticate
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'InvitedUser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
      { name: 'skip_family_setup', value: 'true', domain: '127.0.0.1', path: '/' },
    ])

    // 2. Setup Isolated Mock Environment
    await page.addInitScript(() => {
      // Mock Playwright flag
      ;(window as unknown as { isPlaywright: boolean }).isPlaywright = true

      // Disable Service Workers
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: async () => {},
          getRegistration: async () => null,
          ready: new Promise(() => {}),
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      })

      // Manual Fetch Override
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as { url: string }).url
        console.log('FETCH:', url)

        // Pending Invite Scenario
        if (url.includes('families/current')) {
          return new Response(
            JSON.stringify({
              success: true,
              family: null,
              members: [],
              incomingInvites: [
                {
                  id: 'invite-123',
                  email: 'emilioeh1991@gmail.com',
                  familyId: 'family-abc',
                  familyName: 'The Harrison Family',
                  invitedBy: 'user-creator',
                  invitedByName: 'Emilio',
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                },
              ],
              outgoingInvites: [],
            }),
            { status: 200 },
          )
        }

        if (url.includes('api/families/join')) {
          // Ensure we return success for the join action
          return new Response(
            JSON.stringify({ success: true, message: 'Joined family successfully' }),
            { status: 200 },
          )
        }

        if (url.includes('week/planned')) {
          return new Response(JSON.stringify({ success: true, planned: [] }), { status: 200 })
        }

        return originalFetch(...args)
      }
    })
  })

  test('should show badge on Manage Family and allow accepting invite', async ({ page }) => {
    // 3. Visit App (fetch mock handles data)
    await page.goto('/protected/recipes?skip_onboarding=true')

    // Wait for loading
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 4. Open Burger Menu
    await page.getByRole('button', { name: 'Menu' }).click()

    // 5. Verify badge appears on "Manage Family" menu item
    await expect(page.getByText('1 invite')).toBeVisible()

    // 6. Click Manage Family
    await page.getByText('Manage Family').click()

    // 7. Verify "You're Invited" section appears in Manage Family
    await expect(page.getByText("You're Invited!")).toBeVisible()
    await expect(page.getByText('The Harrison Family')).toBeVisible()
    await expect(page.getByText('Invited by Emilio')).toBeVisible()

    // 8. Accept Invitation
    await page.getByRole('button', { name: 'Accept & Join' }).click()

    // 9. Verify Success
    await expect(page.getByText('Joined The Harrison Family successfully!')).toBeVisible()
  })

  test('should allow declining invitation from Manage Family', async ({ page }) => {
    await page.goto('/protected/recipes?skip_onboarding=true')

    // Wait for hydration and loading
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Open Burger Menu and navigate to Manage Family
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByText('Manage Family').click()

    // Verify invite is visible
    await expect(page.getByText('The Harrison Family')).toBeVisible()

    // Decline
    await page.getByRole('button', { name: 'Decline' }).click()

    // Verify invite is removed (the section should update)
    await expect(page.getByText("You're Invited!")).toBeHidden()
  })
})
