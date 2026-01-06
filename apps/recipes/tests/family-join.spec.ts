import { test, expect } from './msw-setup'

test.describe('Family Join Flow', () => {
  test.beforeEach(async ({ context }) => {
    // 1. Authenticate with correct cookies AND scenario
    await context.addCookies([
      {
        name: 'site_auth',
        value: 'true',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: 'site_user',
        value: 'InvitedUser',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: 'site_email',
        value: 'emilioeh1991@gmail.com',
        domain: '127.0.0.1',
        path: '/',
      },
    ])

    context.on('page', (page) => {
      page.on('console', (msg) => console.log('LOG:', msg.text()))
      page.on('request', (req) => console.log('REQ:', req.url()))
    })
  })

  test('should display invitation modal and allow joining', async ({ page }) => {
    // Enable Scenario
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__TEST_SCENARIO__ = 'pending-invite'
    })

    // Mock Join Action (network layer still works for POST because msw-setup only mocks GET for simple fetches via window.fetch patch?
    // Wait, msw-setup patches window.fetch generally.
    // Does it handle POST families/join? NO.
    // So POST requests usually fall through to originalFetch?
    // Let's check msw-setup.ts again.
    // It returns originalFetch(...args) at the end.
    // So page.route should work for the POST.

    await page.route('**/api/families/join', async (route) => {
      const body = await route.request().postDataJSON()
      expect(body.inviteId).toBe('invite-123')
      expect(body.accept).toBe(true)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Joined family successfully' }),
      })
    })

    // 3. Visit App
    await page.goto('/protected/recipes')

    // Debug: Check URL
    await expect(page).toHaveURL(/\/protected\/recipes(?!\/login)/)

    // 4. Verify Invitation Modal Appears
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('You are invited to join')).toBeVisible()
    await expect(page.getByText('The Harrison Family')).toBeVisible()
    await expect(page.getByText('Invited by Emilio')).toBeVisible()

    // 5. Accept Invitation
    await page.getByRole('button', { name: 'Accept Invitation' }).click()

    // 6. Verify Success
    await expect(page.getByText('Joined The Harrison Family successfully!')).toBeVisible()
  })

  test('should allow declining invitation', async ({ page }) => {
    // Enable Scenario
    await page.addInitScript(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__TEST_SCENARIO__ = 'pending-invite'
    })

    // Mock Decline Action
    await page.route('**/api/families/join', async (route) => {
      const body = await route.request().postDataJSON()
      expect(body.inviteId).toBe('invite-123')
      expect(body.accept).toBe(false)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Invitation declined' }),
      })
    })

    await page.goto('/protected/recipes')

    // Expect Modal
    await expect(page.getByText('The Harrison Family')).toBeVisible()

    // Decline
    await page.getByRole('button', { name: 'Decline' }).click()

    // Verify modal hidden
    await expect(page.getByText('The Harrison Family')).toBeHidden()
  })
})
