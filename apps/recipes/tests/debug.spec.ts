import { test, expect } from './msw-setup'

test('Debug CHEFBOARD', async ({ page }) => {
  await page.goto('/protected/recipes')
  console.log("WAITING FOR LOAD...")
  await page.waitForLoadState('networkidle')
  const html = await page.content()
  console.log(html)
  await expect(page.getByText('CHEFBOARD')).toBeVisible()
})
