---
name: recipe-ui
description: >
  Use when designing or implementing UI components, layouts, or visual features
  in the recipe app (apps/recipes). Covers the neobrutalist design system,
  component patterns, layout conventions, spacing tokens, dark mode, animations,
  and mobile-first patterns. Invoke when adding new screens, components,
  cards, modals, buttons, forms, or any visual element in the recipes app.
paths:
  - apps/recipes/src/**
---

# Recipe App — UX/UI Design System

You are implementing UI for **Chefboard**, a neobrutalist recipe management app.
Follow every rule below precisely — consistency across the app is critical.

---

## 1. Design Aesthetic: Neobrutalism

The app uses a **neobrutalist** visual style. Key characteristics:

- **Hard offset shadows**: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- **Thick borders**: `border-2 border-black`
- **Hover/active motion feedback** — elements translate on interaction:
  ```
  hover:translate-x-[2px] hover:translate-y-[2px]
  hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
  active:translate-x-[4px] active:translate-y-[4px]
  active:shadow-none
  transition-all
  ```
- **High contrast** — stark black on white, minimal decoration
- **Geometric, flat forms** — avoid gradients, blurs, or soft shadows unless intentional (e.g. bottom nav glassmorphism)

Use `BrutalCard` (`src/components/ui/BrutalCard.tsx`) for any card-style element.
Always pass the current `theme` object to `BrutalCard` via props.

---

## 2. Color System

All colors are **CSS custom properties in HSL**, defined in `src/styles/global.css`.
Never use raw hex or RGB values. Reference via Tailwind semantic tokens:

| Token | Usage |
|---|---|
| `bg-background` / `text-foreground` | Page base |
| `bg-primary` / `text-primary-foreground` | Main actions, CTAs |
| `bg-secondary` / `text-secondary-foreground` | Secondary UI |
| `bg-muted` / `text-muted-foreground` | Subtle labels, placeholders |
| `bg-accent` / `text-accent-foreground` | Hover states |
| `bg-destructive` / `text-destructive-foreground` | Delete, errors |
| `border-border` | Default border color |
| `ring-ring` | Focus rings |

Dark mode is handled automatically via the `.dark` class on `<html>`. Never hardcode light-only colors.

---

## 3. Typography

Font: **Roboto** (loaded via `@fontsource/roboto`). Applied via `font-sans`.

Semantic heading styles (from `@layer base` in `global.css`):
- `h1`: `text-4xl font-bold mb-6`
- `h2`: `text-2xl font-bold mb-4`
- `h3`: `text-xl font-semibold mb-2`

Use `font-bold` or `font-semibold` for emphasis. Avoid `font-light`.

---

## 4. Spacing & Layout

### Layout Primitives — always use these, never raw flex/gap utilities

Located in `src/components/ui/layout.tsx`:

```tsx
<Stack spacing="md">        // Vertical flex column
<Inline spacing="lg">       // Horizontal flex, center-aligned
<Cluster spacing="sm">      // Wrapping flex (tags, chips)
<PageShell maxWidth="lg">   // Centered page container (max-w-2xl)
```

Spacing scale:
| Token | Value |
|---|---|
| `xs` | 2px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |

### Custom Tailwind Spacing

| Utility | Value |
|---|---|
| `top-header` / `pt-header` | `--header-height` (56px) |
| `top-content-top` / `pt-content-top` | `--content-top` (header + search bar) |
| `pt-safe-top` | `env(safe-area-inset-top)` |

**Never hardcode `top-14`, `pt-28`, etc.** Always use CSS variable-backed utilities.

---

## 5. Layout Modes (CSS Variables)

Defined in `global.css`, used for sticky stacking:

```css
--header-height: 56px
--search-bar-height: 56px
--content-top: calc(var(--header-height) + var(--search-bar-height))
```

State overrides via data attributes (set on container elements):
- `[data-search-mode='true']` — header hidden, `--header-height: 0px`
- `[data-scroll-mode='contained']` — keyboard active on mobile

When adding a new shell element (e.g. toolbar), add a new CSS variable and update `--content-top`.

---

## 6. Components Reference

### Buttons

Use `Button` from `src/components/ui/button.tsx` with CVA variants:

```tsx
<Button variant="default">    // Primary action
<Button variant="destructive"> // Delete/danger
<Button variant="outline">    // Secondary
<Button variant="ghost">      // Tertiary/icon-adjacent
<Button size="icon">          // Square icon button (44×44px min)
```

### Floating Action Button

Use `Fab` from `src/components/ui/Fab.tsx` for primary mobile CTAs:
```tsx
<Fab icon={<PlusIcon />} label="Add Recipe" onClick={...} />
```
Rounded pill, `bg-primary`, scale animations (`hover:scale-105 active:scale-95`).

### Badges

Use `Badge` from `src/components/ui/badge.tsx`:
```tsx
<Badge variant="active">   // Bold, foreground bg — selected state
<Badge variant="inactive"> // Border only — deselected
<Badge variant="tag">      // Muted bg — metadata labels
<Badge size="md">          // Pill shape (h-9 rounded-full)
```

### Cards

- **Generic**: Use `Card`, `CardHeader`, `CardContent`, `CardFooter` from `card.tsx`
- **Themed/Interactive**: Use `BrutalCard` — applies theme shadow, border, and hover motion

### Modals & Sheets

Use `ResponsiveModal` (`src/components/ui/ResponsiveModal.tsx`) for any overlay:
- Full-width on mobile, centered on desktop
- Mobile positioning: `fixed left-4 right-4 mx-auto`
- Desktop: `sm:left-1/2 sm:-translate-x-1/2`

For side panels use `Sheet` (Radix primitive).

### AI Loading States

For any AI-powered feature use `AiLoadingState`:
```tsx
<AiLoadingState stage="processing" feature="recipe-import" />
```
Stages: `idle | fallback | processing | complete | error`
Features: `recipe-import | grocery-list | recipe-enhancement | cost-estimate`

---

## 7. Animation & Motion

Use **Framer Motion** for meaningful transitions. Standard patterns:

```tsx
// List item entrance
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', bounce: 0, duration: 0.4 }
  }
}

// Stagger children
<motion.ul variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>

// Interactive scale
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
```

Use `type: 'spring', bounce: 0` for natural-feeling transitions. Avoid linear easing on UI elements.

Only animate elements that benefit from it — don't animate static text or layout containers.

---

## 8. Mobile-First Patterns

- Minimum tap target: **44×44px** (`h-11 w-11` or `size="icon"`)
- Use safe area insets: `pb-safe` / `pt-safe-top` near edges
- Bottom navigation uses glassmorphism: `bg-background/80 backdrop-blur-sm`
- Scrollable horizontal content gets fade indicators (left/right gradients)
- Sticky elements must reference `--content-top`, never hardcode offsets

Responsive breakpoints: mobile-first, use `sm:` as the tablet/desktop breakpoint for most components.

---

## 9. Theme System

The app supports multiple themes via `src/lib/themes.ts`. The `Theme` interface:

```typescript
interface Theme {
  id: string;
  colors: { bg, text, primary, secondary, card, border, highlight };
  font: string;         // Tailwind font class
  shadow: string;       // e.g. 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
  shadowHover: string;  // hover/active translate + shadow reduction
  border: string;       // e.g. 'border-2 border-black'
}
```

When implementing components that need theme-aware styling (cards, buttons with brutal aesthetic), accept `theme: Theme` as a prop and apply `theme.shadow`, `theme.border`, `theme.shadowHover` via `className`.

---

## 10. Implementation Checklist

Before submitting any UI change:

- [ ] Colors use semantic tokens, not raw hex/RGB
- [ ] Spacing uses `Stack`/`Inline`/`Cluster` or named scale tokens
- [ ] No hardcoded `top-*` or `pt-*` for sticky elements — uses CSS variable utilities
- [ ] Interactive elements have hover + active states
- [ ] Dark mode works (test by toggling `.dark` class)
- [ ] Minimum 44px tap targets on all clickable elements
- [ ] Animations use spring physics (not linear easing)
- [ ] New cards use `BrutalCard` with theme prop
- [ ] Mobile layout uses safe area utilities near screen edges
