import { test, expect } from '@playwright/test'

test.describe('Family Join Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // 1. Authenticate
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'InvitedUser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'emilioeh1991@gmail.com', domain: '127.0.0.1', path: '/' },
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

  test('should display invitation modal and allow joining', async ({ page }) => {
    // 3. Visit App (fetch mock handles data)
    await page.goto('/protected/recipes?skip_onboarding=true')

    // Wait for loading
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 4. Verify Invitation Modal Appears
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('You are invited to join')).toBeVisible()
    await expect(page.getByText('The Harrison Family')).toBeVisible()
    await expect(page.getByText('Invited by Emilio')).toBeVisible()

    // 5. Accept Invitation
    // Note: The click triggers a POST to api/families/join, which is handled by our manual fetch mock
    await page.getByRole('button', { name: 'Accept Invitation' }).click()

    // 6. Verify Success
    await expect(page.getByText('Joined The Harrison Family successfully!')).toBeVisible()
  })

  test('should allow declining invitation', async ({ page }) => {
    // Update Mock for Decline if necessary?
    // The previous test mock returned "Joined success".
    // The decline logic expects success but different message?
    // Actually, UI just needs success: true to show success message or close modal.
    // If we click "Decline", client calls API with { accept: false }.
    // Our mock returns success: true.

    await page.goto('/protected/recipes?skip_onboarding=true')

    // Wait for hydration and loading
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Expect Modal
    await expect(page.getByText('The Harrison Family')).toBeVisible()

    // Decline
    await page.getByRole('button', { name: 'Decline' }).click()

    // Verify modal hidden (Decline usually closes it)
    await expect(page.getByText('The Harrison Family')).toBeHidden()
  })
})
