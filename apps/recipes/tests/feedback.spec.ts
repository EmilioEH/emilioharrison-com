import { test, expect, type Page } from '@playwright/test'

test.describe('Feedback System', () => {
  // Bypass authentication for all tests in this file
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: 'localhost', path: '/',
          domain: 'localhost', path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'FeedbackTester',
          domain: 'localhost', path: '/',
          domain: 'localhost', path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com',
          domain: 'localhost', path: '/',
          domain: 'localhost', path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  })

  test.beforeEach(async ({ page }) => {
    // Mock user data to keep the page light and stable
    await page.route('**/api/recipes*', async (route) => {
      await route.fulfill({
        json: {
          recipes: [
            {
              id: '1',
              title: 'Test Recipe',
              protein: 'Chicken',
              ingredients: [],
              steps: [],
            },
          ],
        },
      })
    })

    await page.goto('/protected/recipes')
    // Wait for the app UI to stabilize
    await expect(page.getByRole('button', { name: 'Add Recipe' })).toBeVisible({ timeout: 15000 })

    // Mock the feedback API
    await page.route('**/api/feedback', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        if (!body.type || !body.context) {
          await route.fulfill({ status: 400, body: 'Invalid data' })
          return
        }
        await route.fulfill({ status: 200, json: { success: true } })
      } else {
        await route.continue()
      }
    })
  })

  // Helper to open feedback modal regardless of viewport
  const openFeedback = async (page: Page) => {
    // First open the burger menu (global menu icon in top-right)
    const menuBtn = page.getByRole('button', { name: 'Menu' })
    await expect(menuBtn).toBeVisible()
    await menuBtn.click()

    // Then click Send Feedback in the burger menu
    const feedbackBtn = page.getByRole('menuitem', { name: 'Send Feedback' }).first()
    await expect(feedbackBtn).toBeVisible()
    await feedbackBtn.click()

    await expect(page.getByText('Submit Feedback')).toBeVisible()
  }

  test('should allow submitting a bug report', async ({ page }) => {
    await openFeedback(page)

    // Select Bug Report (Default)
    await expect(page.getByRole('button', { name: 'Bug Report' })).toHaveClass(
      /border-md-sys-color-primary/,
    )

    // Fill out bug details
    await page.getByLabel('What happened? (Actual)').fill('Search button is frozen')
    await page.getByLabel('What did you expect?').fill('Expected results to show')

    // Submit
    // Use filter to Distinguish from the header icon button which also has "Send Feedback" accessible name
    await page
      .getByRole('button', { name: 'Send Feedback' })
      .filter({ hasText: 'Send Feedback' })
      .click()

    // Verify Success message
    await expect(page.getByText('Thank you!')).toBeVisible()
    await expect(page.getByText('Your feedback has been received.')).toBeVisible()
  })

  test('should allow submitting an idea', async ({ page }) => {
    await openFeedback(page)

    // Switch to Idea
    await page.getByRole('button', { name: 'Idea / Idea' }).click()
    await expect(page.getByRole('button', { name: 'Idea / Idea' })).toHaveClass(
      /border-md-sys-color-tertiary/,
    )

    // Fill out idea
    await page
      .getByLabel('Tell us about your idea')
      .fill('Add a unit converter for international recipes')

    // Submit
    // Use filter to Distinguish from the header icon button which also has "Send Feedback" accessible name
    await page
      .getByRole('button', { name: 'Send Feedback' })
      .filter({ hasText: 'Send Feedback' })
      .click()

    // Verify Success message
    await expect(page.getByText('Thank you!')).toBeVisible()
  })

  test('should include technical context automatically', async ({ page }) => {
    await openFeedback(page)

    await expect(
      page.getByText('Technical context (logs, state, OS) will be included automatically.'),
    ).toBeVisible()
  })
})
