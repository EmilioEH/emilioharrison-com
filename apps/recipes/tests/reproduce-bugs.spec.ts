import { test, expect } from './msw-setup'

test.describe('Bug Reproduction: Family System', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'TestUser', domain: '127.0.0.1', path: '/' },
    ])
  })

  test('Scenario 1: Family Persistence after Reload', async ({ page }) => {
    // 0. Reset Family State to Empty
    await page.evaluate(async () => {
      await fetch('/api/test/reset-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
    })

    // 1. Visit App
    await page.goto('/protected/recipes?skip_onboarding=true')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 2. Open Family Setup (should be prompted if no family)
    // Since we reset to no family, and user is ReproUser (not TestUser), onboarding might show?
    // ?skip_onboarding=true skips "Tutorial".
    // user=ReproUser means not "TestUser" logic in RecipeManager.
    // useFamilySync: if !family, show setup.
    // So likely "Create Family" IS visible.

    // Check if Setup Modal is open (Create Family view inside modal or standalone?)
    // FamilyManagementView handles "Create Family" if !family.
    // Wait, FamilyManagementView is a "View". FamilySetup is a component.
    // FamilySetup.tsx is a Dialog/Modal.

    const setupHeader = page.getByRole('heading', { name: 'Create Family' })
    if (await setupHeader.isVisible()) {
      // It's the modal
    } else {
      // Open manually if not automatic (should be auto if no family)
      // But let's be robust
      await page.getByRole('button', { name: 'Menu' }).click()
      await page.getByRole('menuitem', { name: 'Manage Family' }).click()
    }

    // 3. Create Family
    await page.getByPlaceholder('The Smith Family').fill('Persistence Test Family')
    await page.getByRole('button', { name: 'Create Family Group' }).click()

    // 4. Verify Creation
    await expect(page.getByText('Manage Family')).toBeVisible()
    await expect(page.getByText('Persistence Test Family')).toBeVisible()

    // 5. RELOAD PAGE
    await page.reload()
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 6. Verify Family is STILL THERE
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Manage Family' }).click()

    await expect(page.getByText('Manage Family')).toBeVisible()
    await expect(page.getByText('Persistence Test Family')).toBeVisible()
  })

  test('Scenario 2: Sticky Family Setup Modal', async ({ page }) => {
    // 0. Reset Family to Empty (Use evaluate to hit page.route)
    await page.evaluate(async () => {
      await fetch('/api/test/reset-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
    })

    // 1. Visit as user WITHOUT family
    // Do NOT skip onboarding param, but use ReproUser (might show Tutorial first?)
    // If Tutorial shows, we can't see Family Modal.
    // Let's use ?skip_onboarding=true to skip Tutorial, verify Family Modal triggers.
    // Wait, previous logic: skip_onboarding skips Family Setup too?
    // useFamilySync: window.location.search.includes('skip_onboarding') -> skips setup.
    // BUG CONFIRMED: We can't verify "Sticky Modal" if passing skip_onboarding prevents it from appearing!

    // Workaround: Use ?skip_tutorial=true if that existed, or assume TestUser logic.
    // Let's try visiting WITHOUT skip_onboarding, but click through tutorial if present.
    await page.goto('/protected/recipes')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Handle Tutorial if present
    const startCooking = page.getByRole('button', { name: 'Start Cooking' })
    if (await startCooking.isVisible()) {
      await startCooking.click() // Skips tutorial? Or enters it?
      // Actually usually "Skip" or "Complete".
      // Let's assume we can close it.
      // Or simpler: Update mock to return "hasOnboarded: true"?
      // We can't easier control server props.
    }

    // Let's rely on checking if Family Setup appears.
    // If logic says "No family -> Show Setup", and we have no family (reset).
    // Unless blocked by "skip_onboarding" check in useFamilySync.
    // Since we didn't pass skip_onboarding, `useFamilySync` SHOULD show it.

    // Check for correct header
    const heading = page.getByRole('heading', { name: 'Set Up Family Sync' })
    await expect(heading).toBeVisible({ timeout: 5000 })

    // Try to close it via Escape key
    await page.keyboard.press('Escape')

    // It SHOULD be gone now
    await expect(heading).not.toBeVisible()
    console.log('Confirmed: Modal closes on Escape')

    // Try to click Skip for Now to actually exit
    await page.getByRole('button', { name: 'Skip for Now' }).click()
    await expect(heading).not.toBeVisible()
  })

  test('Scenario 3: Join Family UI', async ({ page }) => {
    // 0. Reset Family to Empty
    await page.evaluate(async () => {
      await fetch('/api/test/reset-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
    })

    // 1. Visit App
    await page.goto('/protected/recipes')
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 2. Click Join Existing Family
    await page.getByRole('button', { name: 'Join Existing Family' }).click()

    // 3. Verify Join Mode
    await expect(page.getByRole('heading', { name: 'Join a Family' })).toBeVisible()
    await expect(page.getByLabel('Activation Code')).toBeVisible()

    // 4. Enter Code
    await page.getByLabel('Activation Code').fill('123456')

    // 5. Click Join (Mock will succeed)
    await page.getByRole('button', { name: 'Join Family' }).click()

    // 6. Verify Modal Closes (onComplete called)
    await expect(page.getByRole('heading', { name: 'Join a Family' })).not.toBeVisible()

    // 7. Verify we are now in a family (e.g. check Manage Family menu)
    // The UI should refresh.
    // Let's check menu.
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.getByRole('menuitem', { name: 'Manage Family' }).click()
    await expect(page.getByText('Manage Family')).toBeVisible()
    // Mock join returns "The Harrison Family" (hardcoded in msw join logic)
    await expect(page.getByText('The Harrison Family')).toBeVisible()
  })
})
