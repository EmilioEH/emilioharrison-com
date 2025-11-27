# Implementation Plan - Code Quality Fixes

This plan outlines the steps to address the issues identified in the [Code Quality Audit Report](file:///Users/emilioharrison/Desktop/emilioharrison-com/code-quality-audit.md).

## User Review Required

> [!IMPORTANT]
> **Deletion of Public Images**: I plan to delete `public/images/blog` and rely solely on `src/assets/blogIMG`. This assumes all current usage can be migrated to Astro's asset optimization.
> **Dependency Removal**: I will remove `react-markdown`, `buffer`, and `gray-matter`. Please confirm these are definitely not used in any hidden way (e.g., dynamic imports).

## Proposed Changes

### Phase 1: Critical Fixes & Cleanup (High Priority)

#### [MODIFY] [src/pages/fieldnotes/index.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/fieldnotes/index.astro)
- **Issue**: `<BlogList />` is missing the `posts` prop.
- **Fix**: Fetch posts via `getCollection('posts')` and pass to component.

#### [DELETE] [public/images/blog](file:///Users/emilioharrison/Desktop/emilioharrison-com/public/images/blog)
- **Issue**: Duplicate assets.
- **Fix**: Remove directory. Ensure `src/content/posts/*.md` references images in `src/assets/blogIMG`.

#### [MODIFY] [package.json](file:///Users/emilioharrison/Desktop/emilioharrison-com/package.json)
- **Issue**: Unused dependencies.
- **Fix**: Uninstall `react-markdown`, `buffer`, `gray-matter`.

### Phase 2: Performance & Optimization (Medium Priority)

#### [MODIFY] [src/components/BlogList.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/BlogList.jsx)
- **Issue**: Unnecessary hydration (`client:load`).
- **Fix**: Evaluate if `client:visible` is sufficient or if we can move to static rendering with vanilla JS for theme toggling (if applicable). For now, switch to `client:visible`.

#### [MODIFY] [src/content/config.ts](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/content/config.ts)
- **Issue**: Large unoptimized images.
- **Fix**: Ensure schema uses `image()` helper. (Already present, but verify usage in templates).

### Phase 3: Refactoring & Organization (Low Priority)

#### [NEW] [src/hooks/useTheme.js](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/hooks/useTheme.js)
- **Issue**: Prop drilling/Repetitive store logic.
- **Fix**: Create custom hook for theme retrieval.

#### [NEW] [src/data/about.js](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/data/about.js)
- **Issue**: Hardcoded data in `AboutContent.jsx`.
- **Fix**: Extract skills, certifications, and expertise data.

#### [MODIFY] [src/components/pages/AboutContent.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/pages/AboutContent.jsx)
- **Fix**: Import data from `src/data/about.js`. Use `useTheme` hook.

#### [MODIFY] [src/components/pages/LabContent.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/pages/LabContent.jsx)
- **Fix**: Use `useTheme` hook.

#### [MOVE] [src/experiments/](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/experiments/) -> [src/components/experiments/](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/experiments/)
- **Issue**: Non-standard directory.
- **Fix**: Move folder and update imports in `LabContent.jsx`.

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no broken imports after moves/deletions.
- Run `npx depcheck` again to verify clean dependencies.

### Manual Verification
- **Field Notes Page**: Verify list loads correctly (fixing the bug).
- **Blog Images**: Verify images still load in blog posts after `public/` deletion.
- **Theme Switching**: Verify theme still works across components after refactoring to `useTheme`.
