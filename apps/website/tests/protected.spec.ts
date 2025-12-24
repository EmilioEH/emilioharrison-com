import { test, expect } from '@playwright/test';

test.describe('Protected Dashboard', () => {
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
          expires: -1,
        },
        {
            name: 'site_user',
            value: 'TestUser',
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
            expires: -1,
        }
      ],
      origins: [],
    },
  });

  test('should list all protected pages dynamically', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/protected');

    // Check title
    await expect(page.getByRole('heading', { name: 'Protected Dashboard', level: 1 })).toBeVisible();

    // Check for existing example page
    // const exampleLink = page.getByRole('link', { name: 'Secret Sub-page' });
    // Note: The link text might be the title from frontmatter, which is "Protected Sub-page" or "Secret Sub-page" inside the h1.
    // Let's check the file content of example.astro to be sure about the title in frontmatter.
    // example.astro has title="Protected Sub-page" in Layout, but h1 is "Secret Sub-page".
    // Our logic uses frontmatter.title. So it should be "Protected Sub-page".
    // Wait, the index.astro logic uses page.frontmatter.title.
    // Let's check example.astro content again.
    // It imports Layout. It doesn't seem to export title in frontmatter explicitly like `title: "Foo"` in YAML.
    // It passes title to Layout.
    // Astro.glob returns frontmatter if it's defined in YAML fences.
    // If example.astro doesn't have YAML frontmatter with title, it might be undefined.
    // Checking example.astro content from previous turn:
    // ---
    // import Layout from '../../layouts/Layout.astro'
    // ---
    // There is no `title: ...` in frontmatter.
    // So our fallback logic will use the filename 'example'.
    
    // So we expect "example" and "test-dynamic-page".

    // Wait, let's verify if I should update example.astro to have frontmatter title effectively?
    // Or just accept the fallback.
    // The plan said: "Use the file's frontmatter title if available, otherwise fallback to the filename."
    
    // So I expect links with text "example" and "test-dynamic-page".
    
    await expect(page.getByRole('link', { name: 'example' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'test-dynamic-page' })).toBeVisible();
  });
});
