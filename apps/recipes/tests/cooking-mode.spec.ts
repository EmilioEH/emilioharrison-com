import { test, expect, TEST_RECIPES } from './msw-setup'

test.describe('Recipe Cooking Mode', () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'TestUser',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com',
          domain: '127.0.0.1',
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

  // Use the first test recipe from our centralized mock data
  const RECIPE = TEST_RECIPES[0]

  test('should navigate through cooking mode flow', async ({ page }) => {
    await page.goto('/protected/recipes')

    // Wait for loading to finish
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 1. Open the pre-seeded recipe
    const recipeCard = page.getByText(RECIPE.title).first()
    await expect(recipeCard).toBeVisible({ timeout: 30000 })
    await page.waitForTimeout(500)
    await recipeCard.click()

    // Wait for detail view
    await expect(page.getByRole('heading', { name: RECIPE.title, exact: true })).toBeVisible()

    // 2. Start Cooking (Directly to Step 1: Prep)
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Verify we are in Cooking Mode - Step 1 is now Prep
    await expect(page.getByText('Prep Ingredients')).toBeVisible()
    // Total steps = 2 + 1 (Prep) = 3
    await expect(page.getByText('Step 1 of 3')).toBeVisible()

    // 3. Navigate to Step 2 (First Instruction)
    await page.getByRole('button', { name: 'Start Cooking' }).click() // Prep step has "Start Cooking" button to next
    await expect(page.getByText('Step 2 of 3')).toBeVisible()
    await expect(page.getByText(RECIPE.steps[0])).toBeVisible()

    // 4. Navigate to Step 3 (Second Instruction)
    await page.getByRole('button', { name: 'Next Step' }).click()
    await expect(page.getByText('Step 3 of 3')).toBeVisible()
    await expect(page.getByText(RECIPE.steps[1])).toBeVisible()

    // 5. Check for Suggested Timer button (step has "20 mins")
    await expect(page.getByRole('button', { name: 'Start 20 Min Timer' })).toBeVisible()

    // 6. Test Timeline Navigation - click back to Step 1 (Prep) using data-testid
    // Note: data-testid usually 'timeline-step-X'. If step index is 0, is it step-1?
    // Timeline component logic: currentStep={session.currentStepIdx + 1}.
    // So Prep is step-1.
    await page.getByTestId('timeline-step-1').click()

    // Should be back on Prep
    await expect(page.getByText('Prep Ingredients')).toBeVisible()

    // Navigate back to last step (3) for exit flow
    await page.getByTestId('timeline-step-3').click()
    await expect(page.getByText('Step 3 of 3')).toBeVisible()

    // 7. Test Exit Flow
    await page.getByLabel('Exit Cooking Mode').click()
    await expect(page.getByText('End Cooking Session?')).toBeVisible()
    await expect(page.getByText("You're on Step 3 of 3")).toBeVisible()

    // Keep Cooking
    await page.getByRole('button', { name: 'Keep Cooking' }).click()
    await expect(page.getByText('End Cooking Session?')).not.toBeVisible()

    // Exit for real
    await page.getByLabel('Exit Cooking Mode').click()
    await page.getByRole('button', { name: 'End Session' }).click()

    // Verify returned to Detail View (wait for URL change or header)
    await expect(page.getByRole('heading', { name: RECIPE.title, exact: true })).toBeVisible({
      timeout: 10000,
    })
  })

  test('should display three-column layout on desktop', async ({ page }) => {
    // Set viewport to desktop
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.goto('/protected/recipes')
    // Wait for the specific recipe to appear (with retries/timeout)
    await expect(page.getByText(RECIPE.title).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Open recipe and start cooking
    const recipeCard = page.getByText(RECIPE.title).first()
    await recipeCard.click()
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Verify Left Sidebar (Timeline) is visible
    await expect(page.getByTestId('cooking-timeline-sidebar')).toBeVisible()

    // Verify Right Sidebar (Ingredients Panel) is visible
    await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeVisible()

    // Verify Ingredients Button in header is HIDDEN on desktop
    await expect(page.getByRole('button', { name: 'Ingredients' })).toBeHidden()
  })

  test('should use overlay for ingredients on mobile', async ({ page }) => {
    // Set viewport to mobile iphone 12/13/14
    await page.setViewportSize({ width: 390, height: 844 })

    await page.goto('/protected/recipes')
    // Wait for the specific recipe to appear
    await expect(page.getByText(RECIPE.title).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // Open recipe and start cooking
    const recipeCard = page.getByText(RECIPE.title).first()
    await recipeCard.click()
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Verify Left Sidebar (Timeline) is HIDDEN
    await expect(page.getByTestId('cooking-timeline-sidebar')).toBeHidden()

    // Verify Right Sidebar (Ingredients Panel) content is NOT visible initially
    await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeHidden()

    // Verify Ingredients Button in header is VISIBLE on mobile
    const ingredientsBtn = page.getByRole('button', { name: 'Ingredients' })
    await expect(ingredientsBtn).toBeVisible()

    // Open overlay
    await ingredientsBtn.click()

    // Verify Overlay is visible
    await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeVisible()
  })

  test('should complete cooking and submit review', async ({ page }) => {
    await page.goto('/protected/recipes')
    // Wait for the specific recipe to appear
    await expect(page.getByText(RECIPE.title).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    const recipeCard = page.getByText(RECIPE.title).first()
    await recipeCard.click()

    // Start Cooking
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Skip to last step
    await page.getByRole('button', { name: 'Start Cooking' }).click() // to Step 2
    await page.getByRole('button', { name: 'Next Step' }).click() // to Step 3 (Final)

    // Verify "Finish Cooking" is visible
    await expect(page.getByRole('button', { name: 'Finish Cooking' })).toBeVisible()
    await page.getByRole('button', { name: 'Finish Cooking' }).click()

    // Expect Review Screen
    await expect(page.getByText('All Done!')).toBeVisible()
    await expect(page.getByText('Difficulty')).toBeVisible()

    // Check that "Complete Review" is disabled initially
    await expect(page.getByRole('button', { name: 'Select Difficulty' })).toBeDisabled()

    // Select Difficulty (Easy)
    await page.getByRole('button', { name: 'Easy' }).click()

    // Button should be enabled now
    await expect(page.getByRole('button', { name: 'Complete Review' })).toBeEnabled()

    // Open Ingredient Notes Accordion
    await page.getByRole('button', { name: 'Ingredients' }).click()

    // Add a note to an ingredient
    const ingredientNote = page.getByPlaceholder('Add note...').first()
    await ingredientNote.fill('Used extra garlic')

    // Open Step Notes Accordion
    await page.getByRole('button', { name: 'Instructions' }).click()

    // Add a note to a step
    const stepNote = page.getByPlaceholder('Add note...').last() // last one is step notes
    await stepNote.fill('Step went well')

    // Submit
    await page.getByRole('button', { name: 'Complete Review' }).click()

    // Verify returned to Detail View (Recipe Title visible)
    await expect(page.getByRole('heading', { name: RECIPE.title, exact: true })).toBeVisible()
  })

  test('should allow editing ingredients and steps in review', async ({ page }) => {
    await page.goto('/protected/recipes')
    await expect(page.getByText(RECIPE.title).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    const recipeCard = page.getByText(RECIPE.title).first()
    await recipeCard.click()

    // Start Cooking
    await page.getByRole('button', { name: 'Start Cooking' }).click()

    // Skip to last step
    await page.getByRole('button', { name: 'Start Cooking' }).click() // to Step 2
    await page.getByRole('button', { name: 'Next Step' }).click() // to Step 3 (Final)

    // Finish Cooking
    await page.getByRole('button', { name: 'Finish Cooking' }).click()

    // Expect Review Screen
    await expect(page.getByText('All Done!')).toBeVisible()

    // Select Difficulty
    await page.getByRole('button', { name: 'Easy' }).click()

    // Open Ingredients Accordion
    await page.getByRole('button', { name: 'Ingredients' }).click()

    // Edit an ingredient
    // Find the first pencil icon
    const firstIngredientPencil = page.locator('button:has(svg.lucide-pencil)').first()
    await firstIngredientPencil.click()

    // Input should be visible
    const editInput = page.locator('input[value]').first()
    await expect(editInput).toBeVisible()

    // Change value
    await editInput.fill('2 cups Sugar')

    // Save (Check button)
    const saveButton = page.locator('button:has(svg.lucide-check)').first()
    await saveButton.click()

    // Verify UI updated
    await expect(page.getByText('2 cups Sugar')).toBeVisible()

    // Open Instructions Accordion
    await page.getByRole('button', { name: 'Instructions' }).click()

    // Edit a step
    // Find the first pencil icon in steps (which is likely the 2nd group of pencils if ingredients are open, but let's be specific)
    // We can scope to the instructions section if needed, but let's try finding by index or text
    const firstStepText = RECIPE.steps[0]
    await expect(page.getByText(firstStepText)).toBeVisible()

    // Find pencil relative to step text
    const stepPencil = page
      .locator('div')
      .filter({ hasText: firstStepText })
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-pencil') })
      .first()
    await stepPencil.click()

    // Textarea should be visible
    const editTextarea = page.locator('textarea').first() // It's a textarea for steps
    await expect(editTextarea).toBeVisible()

    // Change value
    await editTextarea.fill('Mix well for 5 minutes')

    // Save change
    await page.getByRole('button', { name: 'Save Change' }).click()

    // Verify UI updated
    await expect(page.getByText('Mix well for 5 minutes')).toBeVisible()

    // Submit Review
    await page.getByRole('button', { name: 'Complete Review' }).click()

    // Verify returned to Detail View
    await expect(page.getByRole('heading', { name: RECIPE.title, exact: true })).toBeVisible()
  })
})
