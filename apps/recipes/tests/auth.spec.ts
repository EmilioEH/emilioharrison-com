import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should allow user to log in with password and name', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login')

    // 2. Fill in credentials
    await page.getByLabel('Name').fill('TestUser')
    await page.getByLabel('Password').fill('password123') // Assuming default dev password

    // 3. Submit
    await page.getByRole('button', { name: 'Login' }).click()

    // 4. Verify Redirect to Protected App
    await expect(page).toHaveURL(/\/protected\/recipes/)

    // 5. Verify User Name in Header
    await expect(page.getByText('Welcome, TestUser')).toBeVisible()

    // 6. Verify Log Out
    await page.getByText('Log Out').click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
  })

  test('should show error for incorrect password', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Name').fill('Hacker')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page.getByText('Incorrect password')).toBeVisible()
  })

  test('should require name', async ({ page }) => {
    await page.goto('/login')
    // Don't fill name
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Login' }).click()

    await expect(page.getByText('Please enter your name')).toBeVisible()
  })
})
