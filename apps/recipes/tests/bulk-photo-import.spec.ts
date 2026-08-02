import { test, expect } from './msw-setup'

const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
)

const photo = (name: string) => ({ name, mimeType: 'image/jpeg', buffer: JPEG })

/**
 * Bulk photo import: several photos at once, read in the background, reviewed later.
 *
 * The single-photo path is covered by photo-import.spec.ts and must stay unchanged — picking one
 * photo still parses in-request. Picking more than one is what switches to the queue.
 */
test.describe('Bulk photo import', () => {
  test.beforeEach(async ({ page }) => {
    let uploadCount = 0
    await page.route('**/api/uploads', async (route) => {
      uploadCount += 1
      await route.fulfill({ json: { key: `TestUser-${uploadCount}-abc.jpeg` } })
    })
  })

  test('groups several photos into recipes and queues them', async ({ page }) => {
    const submitted: Array<{ groups: string[][] }> = []
    await page.route('**/api/imports', async (route) => {
      if (route.request().method() === 'POST') {
        submitted.push(route.request().postDataJSON())
        await route.fulfill({ status: 202, json: { success: true, batchId: 'b1', total: 2 } })
        return
      }
      await route.fulfill({ json: { jobs: [], summary: { needsReview: 0, inProgress: 0 } } })
    })

    await page.goto('/')
    await page.getByRole('button', { name: /Add Recipe/ }).click()

    // Picking three photos at once takes the batch path, not the in-request parse.
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([photo('page1.jpg'), photo('page2.jpg'), photo('other.jpg')])

    await expect(page.getByText('Recipe 1')).toBeVisible()
    await expect(page.getByText('Recipe 3')).toBeVisible()

    // Mark the second photo as the continuation of the first: three photos, two recipes.
    await page.getByRole('button', { name: 'Same recipe' }).first().click()
    await expect(page.getByText(/Page 2 of recipe 1/)).toBeVisible()

    await page.getByRole('button', { name: /Import 2 recipes/ }).click()

    await expect(page.getByText(/are being read/)).toBeVisible()
    // Measured, not decorative: three at a time at ~30s each.
    await expect(page.getByText(/Should take about a minute/)).toBeVisible()
    expect(submitted).toHaveLength(1)
    expect(submitted[0].groups).toHaveLength(2)
    expect(submitted[0].groups[0]).toHaveLength(2)
  })

  test('opens a photo full size and groups from there', async ({ page }) => {
    // Deciding whether a photo is a second page or a new recipe means reading it, so the
    // arranging screen has to let you see the photo and act on it without leaving.
    await page.route('**/api/imports', async (route) => {
      await route.fulfill({ json: { jobs: [], summary: { needsReview: 0, inProgress: 0 } } })
    })

    await page.goto('/')
    await page.getByRole('button', { name: /Add Recipe/ }).click()
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([photo('page1.jpg'), photo('page2.jpg'), photo('other.jpg')])

    await page.getByRole('button', { name: /See recipe 1 full size/ }).click()
    await expect(page.getByText('Photo 1 of 3')).toBeVisible()
    // Nothing precedes the first photo, so there is nothing to join it to.
    await expect(page.getByRole('button', { name: /Same recipe as the photo before/ })).toHaveCount(
      0,
    )

    await page.getByRole('button', { name: 'Next photo' }).click()
    await expect(page.getByText('Photo 2 of 3')).toBeVisible()

    await page.getByRole('button', { name: /Same recipe as the photo before/ }).click()
    await page.getByRole('button', { name: 'Close image viewer' }).click()

    // The grouping made in the viewer is the real one: three photos, two recipes.
    await expect(page.getByRole('button', { name: /Import 2 recipes/ })).toBeVisible()
  })

  test('a single photo still imports in-request, unchanged', async ({ page }) => {
    let batchCalls = 0
    await page.route('**/api/imports', async (route) => {
      if (route.request().method() === 'POST') batchCalls += 1
      await route.fulfill({ json: { jobs: [], summary: { needsReview: 0, inProgress: 0 } } })
    })
    await page.route('**/api/parse-recipe', async (route) => {
      await route.fulfill({
        json: { title: 'Single Photo Recipe', ingredients: [], steps: ['Mix.'] },
      })
    })

    await page.goto('/')
    await page.getByRole('button', { name: /Add Recipe/ }).click()
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([photo('one.jpg')])

    // The in-request action is still on screen, and nothing was queued.
    await expect(page.getByRole('button', { name: 'Process Recipe' })).toBeVisible()
    expect(batchCalls).toBe(0)
  })

  test('shows a badge and a way through when imports are waiting', async ({ page }) => {
    await page.route('**/api/imports', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 202, json: { success: true, batchId: 'b1', total: 1 } })
        return
      }
      await route.fulfill({
        json: {
          jobs: [
            {
              id: 'job-1',
              batchId: 'b1',
              createdBy: 'TestUser',
              createdAt: new Date().toISOString(),
              photoKeys: ['TestUser-1-abc.jpeg'],
              status: 'complete',
              parsedRecipe: { title: 'Garlic Shrimp Bowl', ingredients: [], steps: [] },
              reviewState: 'unreviewed',
            },
            {
              id: 'job-2',
              batchId: 'b1',
              createdBy: 'TestUser',
              createdAt: new Date().toISOString(),
              photoKeys: ['TestUser-2-abc.jpeg'],
              status: 'error',
              parsedRecipe: null,
              error: 'Photo is no longer in storage',
              reviewState: 'unreviewed',
            },
          ],
          summary: { needsReview: 1, inProgress: 0, failed: 1, serviceOffline: false },
        },
      })
    })

    await page.goto('/')

    // The agreed "it's done" signal: a count on the Add button, nothing pushed at the user.
    await expect(page.getByRole('button', { name: /1 imported recipes waiting/ })).toBeVisible()

    await page.getByRole('button', { name: /Add Recipe/ }).click()
    await page.getByRole('button', { name: /ready to check/ }).click()

    // Both outcomes are accounted for: the user picked these photos and must see all of them.
    await expect(page.getByText('Garlic Shrimp Bowl')).toBeVisible()
    await expect(page.getByText('Could not read this photo')).toBeVisible()
    await expect(page.getByRole('button', { name: /Try again/ })).toBeVisible()
  })

  test('says so when nothing is picking the queue up', async ({ page }) => {
    await page.route('**/api/imports', async (route) => {
      await route.fulfill({
        json: {
          jobs: [
            {
              id: 'job-1',
              batchId: 'b1',
              createdBy: 'TestUser',
              createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
              photoKeys: ['TestUser-1-abc.jpeg'],
              status: 'pending',
              parsedRecipe: null,
              reviewState: 'unreviewed',
            },
          ],
          summary: { needsReview: 0, inProgress: 1, failed: 0, serviceOffline: true },
        },
      })
    })

    await page.goto('/?view=import-review')

    // Imports silently never happening is the one failure mode that must never be quiet.
    await expect(page.getByText('Waiting on the import service')).toBeVisible()
  })
})
