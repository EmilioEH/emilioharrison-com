# PWA Setup Implementation Plan

## User Story
**As a** recipe app user  
**I want to** install Chefboard on my phone's home screen with a custom icon and name  
**So that** I can quickly access my recipes like a native app, without needing to open a browser and navigate to the URL.

## Context
Currently, the recipe app lacks Progressive Web App (PWA) capabilities. Users cannot "Add to Home Screen" on iOS or Android with a custom icon and app name. This implementation will add:
- Web App Manifest for Android/Chrome
- Apple-specific meta tags for iOS/Safari
- App icons in multiple sizes
- Theme colors and splash screen configuration

## Implementation Steps

### 1. Generate App Icons
- Create a 512x512px app icon for Chefboard (cooking/recipe theme)
- This will serve as the base for all required sizes

### 2. Create Web App Manifest
- Create `/apps/recipes/public/manifest.json`
- Define app name: "Chefboard"
- Define short name: "Chefboard"
- Specify icons (192x192, 512x512)
- Set display mode to "standalone" (hides browser UI)
- Define theme colors matching the app's design system
- Set start URL to `/protected/recipes`

### 3. Update HTML Layout
- Add manifest link to `RecipeLayout.astro`
- Add Apple touch icon meta tags
- Add Apple mobile web app capable meta tag
- Add Apple status bar style meta tag
- Add theme color meta tags
- Add description meta tag

### 4. Save Icons to Public Directory
- Save generated icon as `/apps/recipes/public/icon-512.png`
- Save 192x192 version as `/apps/recipes/public/icon-192.png`
- Save 180x180 version as `/apps/recipes/public/apple-touch-icon.png`

## Quality Gate Checks
- ✅ **Linting**: `npm run lint`
- ✅ **Type Checking**: `npx tsc --noEmit` and `npx astro check`
- ✅ **Formatting**: `npm run format`
- ✅ **E2E Tests**: `npx playwright test` (existing tests should still pass)
- ✅ **Manual Verification**: Test "Add to Home Screen" on iOS Safari and Android Chrome

## Success Criteria
1. Users can tap "Add to Home Screen" on iOS Safari
2. Users can tap "Install" on Android Chrome
3. The installed app shows "Chefboard" as the name
4. The installed app displays the custom cooking icon
5. When launched, the app opens in standalone mode (no browser UI)
6. All existing functionality continues to work
7. All Quality Gate checks pass

## Files to Create/Modify
- **Create**: `/apps/recipes/public/manifest.json`
- **Create**: `/apps/recipes/public/icon-512.png`
- **Create**: `/apps/recipes/public/icon-192.png`
- **Create**: `/apps/recipes/public/apple-touch-icon.png`
- **Modify**: `/apps/recipes/src/layouts/RecipeLayout.astro`
