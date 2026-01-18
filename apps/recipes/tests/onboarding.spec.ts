import { test, expect } from './msw-setup'
import { devices } from '@playwright/test'

test.describe('Onboarding Flow', () => {
  test('Desktop user sees blocker', async ({ page, context }) => {
    // Inject auth cookie to bypass login
    await context.addCookies([
      { name: 'site_user', value: 'test_user', domain: '127.0.0.1', path: '/' },
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
    ])

    // 1. Mock user as NOT onboarded
    await page.route('**/protected/recipes/api/user/profile', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ hasOnboarded: false }),
      })
    })

    // Force desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 })

    await page.goto('/protected/recipes?force_onboarding=true')

    // Expect Desktop Blocker
    await expect(page.getByText('Please Use Your Phone')).toBeVisible()
    await expect(page.getByText('Use Your Phone')).toBeVisible()
  })

  test.describe('Mobile View', () => {
    // Manually set mobile properties to avoid worker restart/browser conflict
    test.use({
      viewport: devices['iPhone 12'].viewport,
      userAgent: devices['iPhone 12'].userAgent,
      deviceScaleFactor: devices['iPhone 12'].deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
    })

    test('Mobile user sees install instructions', async ({ page, context }) => {
      // Inject auth cookie to bypass login
      await context.addCookies([
        { name: 'site_user', value: 'test_user', domain: '127.0.0.1', path: '/' },
        { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      ])

      // 1. Mock user as NOT onboarded
      await page.route('**/protected/recipes/api/user/profile', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ hasOnboarded: false }),
        })
      })

      await page.goto('/protected/recipes?force_onboarding=true')

      // Expect Install Instructions "Add to Home Screen"
      await expect(page.getByRole('heading', { name: 'Add to Home Screen' })).toBeVisible({
        timeout: 10000,
      })
      await expect(page.getByRole('button', { name: "I've Added It" })).toBeVisible()
    })

    test('Completing tutorial updates user status', async ({ page, context }) => {
      // Inject auth cookie to bypass login
      await context.addCookies([
        { name: 'site_user', value: 'test_user', domain: '127.0.0.1', path: '/' },
        { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      ])

      // 1. Mock user as NOT onboarded
      await page.route('**/protected/recipes/api/user/profile', async (route) => {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ hasOnboarded: false }),
        })
      })

      // Mock API call to complete onboarding
      let onboardingCalled = false
      await page.route('**/protected/recipes/api/user/onboarding', async (route) => {
        onboardingCalled = true
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      })

      await page.goto('/protected/recipes?force_onboarding=true')

      // Click "I've Added It"
      await page.getByRole('button', { name: "I've Added It" }).click()

      // Now in Tutorial
      await expect(page.getByText('Welcome to ChefBoard')).toBeVisible()

      // Step through tutorial
      await page.getByRole('button', { name: 'Next' }).click() // Add Recipes
      await expect(page.getByText('Add Your Recipes')).toBeVisible()

      await page.getByRole('button', { name: 'Next' }).click() // Plan Week
      await expect(page.getByText('Plan Your Week')).toBeVisible()

      await page.getByRole('button', { name: 'Next' }).click() // Cooking Mode
      await expect(page.getByText('Cooking Mode')).toBeVisible()

      await page.getByRole('button', { name: 'Next' }).click() // Family
      await expect(page.getByText('Share with Family')).toBeVisible()

      // Finish
      await page.getByRole('button', { name: 'Get Started' }).click()

      // Verify API called
      expect(onboardingCalled).toBe(true)

      // Verify Main App Loaded (e.g. RecipeHeader or just check blocker gone)
      await expect(page.getByText('Please Use Your Phone')).not.toBeVisible()
    })
  }) // Mobile View
}) // Onboarding Flow
