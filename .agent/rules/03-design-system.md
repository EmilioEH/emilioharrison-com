---
trigger: always_on
---

# User Interface Standards (Mandatory for UI Changes)

## Core Principals
-   **Source of Truth:** You MUST strictly follow the design system defined in `apps/recipes/docs/technical/design-system.md`.
-   **Validation:** When creating or modifying UI components, verify they match the specific tokens (colors, spacing, shadows, typography) defined in the design system.
-   **No Magic Values:** Do not invent new styles or use arbitrary pixel values. Use the existing Tailwind classes and theme variables defined in the system.
-   **Mobile-First Responsiveness:** All UI changes MUST be verified on mobile viewports.
    -   **Responsive Modals:** Avoid hard-coded centering (e.g., `left-1/2 -translate-x-1/2`) for modals without mobile-safe margins.
    -   **Pattern:** Use `left-4 right-4 mx-auto` on mobile to ensure accessibility, then switch to `sm:left-1/2 sm:-translate-x-1/2` for desktop.

## CSS Variables Layout System (CRITICAL)

The app uses CSS Custom Properties for layout dimensions. **Never hardcode pixel values for sticky positioning.**

### CSS Variables (in `src/styles/global.css`)
```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --header-height: 56px;
  --search-bar-height: 56px;
  --content-top: calc(var(--header-height) + var(--search-bar-height));
}

[data-search-mode='true'] {
  --header-height: 0px;
  --content-top: calc(var(--safe-area-top) + var(--search-bar-height));
}
```

### Tailwind Utilities (in `tailwind.config.js`)
| Utility | Usage |
|---------|-------|
| `top-header` | Sticky position below header |
| `top-content-top` | Sticky position below all shell elements |
| `pt-content-top` | Padding to clear shell elements |
| `pt-safe-top` | Safe area padding for notched devices |

### Rules
1. **Never use hardcoded pixels** for `top` or `padding-top` on sticky elements (e.g., ❌ `top-[56px]`, ✅ `top-header`)
2. **Adding new shell elements**: Add a CSS variable and update `--content-top` calculation
3. **State-based changes**: Use `data-*` attributes on containers to override variables

### Key Files
- `src/styles/global.css` - Variable definitions
- `tailwind.config.js` - Tailwind spacing utilities
- `RecipeManager.tsx` - Sets `data-search-mode` attribute
- `AccordionGroup.tsx` - Uses `top-content-top` for sticky headers
