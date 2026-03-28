---
name: recipe-ui
description: >
  Use when designing or implementing UI components, layouts, or visual features
  in the recipe app (apps/recipes). Covers the actual design system: semantic
  color tokens, subtle borders, soft shadows, rounded corners, glassmorphism,
  pill filters, interactive states, layout primitives, Framer Motion patterns,
  and mobile-first conventions. Invoke when adding new screens, components,
  cards, modals, buttons, forms, or any visual element in the recipes app.
paths:
  - apps/recipes/src/**
---

# Recipe App (Chefboard) — UX/UI Design System

You are implementing UI for **Chefboard**, a clean, modern, mobile-first recipe
management app. The aesthetic is functional and minimal: subtle depth through
soft shadows and light borders, rounded forms, semantic color tokens, and
smooth spring animations. There is no bold brutalism, no thick black outlines,
no hard offset shadows.

---

## 1. Aesthetic Overview

The app looks like a well-crafted native mobile app:

- **Rounded corners everywhere** — `rounded-xl` for cards, `rounded-full` for pills and icon buttons, `rounded-lg` for inputs
- **Subtle borders** — always `border-border` (light gray), never stark black
- **Soft shadows for elevation** — `shadow-sm` at rest, `shadow-md` on hover/active states
- **Glassmorphism** on sticky/overlay surfaces — `bg-background/95 backdrop-blur-sm`
- **Primary color signals selection** — active/selected states use `bg-primary` + `text-primary-foreground`
- **Muted tones for secondary content** — `text-muted-foreground`, `bg-muted`, `bg-secondary`
- **Small scale compression on tap** — `active:scale-[0.98]` or `whileTap={{ scale: 0.95 }}`

> Note: `BrutalCard` and `themes.ts` exist in the codebase but are unused legacy artifacts.
> Do not use them. They belong to a different project in the monorepo.

---

## 2. Color System

All colors are **CSS custom properties in HSL**, defined in `src/styles/global.css`.
Never use raw hex or RGB values. Use Tailwind semantic tokens:

| Token | Usage |
|---|---|
| `bg-background` / `text-foreground` | Page base |
| `bg-card` / `text-card-foreground` | Card surfaces |
| `bg-primary` / `text-primary-foreground` | Selected, active, CTA |
| `bg-primary/10` + `text-primary` | Tinted primary (badges, indicators) |
| `bg-secondary` / `text-secondary-foreground` | Input backgrounds, chips |
| `bg-muted` / `text-muted-foreground` | Placeholders, metadata, empty states |
| `bg-accent` / `text-accent-foreground` | Hover state fills |
| `bg-destructive` / `text-destructive-foreground` | Delete, errors |
| `border-border` | Default border |
| `ring-ring` | Focus rings |

Dark mode is handled automatically via the `.dark` class on `<html>`. Never use
light-only hardcoded colors. Always use semantic tokens.

**Color-coded status** (for difficulty, notifications, tags):
- Success/Easy: `bg-green-500/10 text-green-600`
- Warning/Medium: `bg-yellow-500/10 text-yellow-600`
- Error/Hard: `bg-red-500/10 text-red-600`
- Notification dot: `bg-red-500 text-white ring-2 ring-background`

---

## 3. Typography

Font: **Roboto** (loaded via `@fontsource/roboto`), applied via `font-sans`.
Use `font-display` for prominent titles (it resolves to the same font but
communicates intent).

Semantic heading styles (from `@layer base`):
- `h1`: `text-4xl font-bold mb-6`
- `h2`: `text-2xl font-bold mb-4`
- `h3`: `text-xl font-semibold mb-2`

Inline heading pattern in components:
```tsx
<h4 className="line-clamp-2 font-display text-lg font-bold leading-tight text-foreground">
```

Metadata/secondary text pattern:
```tsx
<span className="text-xs font-medium text-muted-foreground">
```

Uppercase tracking for labels/chips:
```tsx
<span className="text-xs font-medium uppercase tracking-wide text-secondary-foreground">
```

---

## 4. Spacing & Layout

### Layout Primitives — prefer these over raw flex/gap utilities

Located in `src/components/ui/layout.tsx`:

```tsx
<Stack spacing="md">          // Vertical flex column
<Inline spacing="sm">         // Horizontal flex, center-aligned
<Inline spacing="none" justify="between">  // Space-between row
<Cluster spacing="sm">        // Wrapping flex (tags, chips)
<PageShell maxWidth="lg">     // Centered container (max-w-2xl)
```

Spacing scale: `xs`(2px) `sm`(8px) `md`(16px) `lg`(24px) `xl`(32px) `2xl`(48px)

### Custom Tailwind Spacing (CSS variable-backed)

| Utility | Resolves to |
|---|---|
| `top-header` / `pt-header` | `--header-height` (56px) |
| `top-content-top` / `pt-content-top` | `--content-top` (header + search bar) |
| `pt-safe-top` | `env(safe-area-inset-top)` |

**Never hardcode** `top-14`, `pt-28`, etc. for sticky elements. Always use the CSS variable utilities above.

---

## 5. Layout CSS Variables

Defined in `global.css`. Used for proper sticky stacking:

```css
--header-height: 56px
--search-bar-height: 56px
--content-top: calc(var(--header-height) + var(--search-bar-height))
```

State overrides via data attributes:
- `[data-search-mode='true']` — header hidden, `--header-height: 0px`
- `[data-scroll-mode='contained']` — keyboard active on mobile, use `top-0` for sticky elements

To add a new shell element (e.g. toolbar), add a new CSS variable and update `--content-top`.

---

## 6. Components Reference

### Buttons

Use `Button` from `src/components/ui/button.tsx`:

```tsx
<Button variant="ghost" size="icon" className="h-11 w-11 rounded-full">
<Button variant="outline">
<Button variant="default">   // bg-primary
<Button variant="destructive">
```

Icon buttons must be `h-11 w-11 rounded-full` for 44px touch target. Ghost with
colored active state:
```tsx
className={`h-11 w-11 rounded-full ${
  isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'text-muted-foreground hover:text-red-500'
}`}
```

### Category Filter Pills

Pill toggle pattern (from `CategoryPillBar`):
```tsx
<motion.button
  whileTap={{ scale: 0.95 }}
  className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors ${
    isSelected
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
  }`}
>
```

### Cards

**List item card** (RecipeCard pattern):
```tsx
className={`rounded-xl border border-transparent p-2.5 transition-all active:scale-[0.98] active:bg-accent/70 ${
  isSelected
    ? 'border-primary/20 bg-accent'
    : 'hover:border-border hover:bg-accent/50 hover:shadow-sm'
}`}
```

**Grid/library card** (LibraryRecipeCard pattern):
```tsx
className={`rounded-xl border bg-card transition-all hover:border-primary/50 ${
  isActive ? 'border-primary shadow-md' : 'border-border shadow-sm hover:shadow-md'
}`}
```

**Thumbnail image placeholder** (no image state):
```tsx
<div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-black/5">
  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
    <ChefHat className="h-10 w-10 text-muted-foreground/30" />
  </div>
</div>
```

### Sticky Headers

Standard sticky header pattern:
```tsx
<div className="sticky top-0 z-20 border-b border-border bg-background px-4 py-4">
```

With glassmorphism (when content scrolls beneath):
```tsx
<div className="sticky top-header z-30 bg-background/95 pb-2 shadow-sm backdrop-blur transition-all">
```

Category bar sticky:
```tsx
<div className="sticky top-content-top z-20 border-b border-border bg-background/95 backdrop-blur-sm">
```

### Drawer / Side Panel

Drawer slide-in from right:
```tsx
<div className="fixed inset-0 z-[70] flex justify-end">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in" />
  {/* Panel */}
  <div className="relative h-full w-72 max-w-[85vw] bg-card shadow-lg duration-200 animate-in slide-in-from-right">
    <div className="flex items-center justify-between border-b border-border px-4 py-4">
```

Menu items inside drawer:
```tsx
<button className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent">
  <Icon className="h-5 w-5 text-muted-foreground" />
  <span className="font-medium text-foreground">Label</span>
</button>
```

### Badges

Use `Badge` from `src/components/ui/badge.tsx`:
```tsx
<Badge variant="tag" size="sm">           // Muted bg label
<Badge variant="tag" size="sm"            // Primary tint (e.g. planned days)
  className="border-primary/20 bg-primary/10 font-bold uppercase tracking-tighter text-primary">
<Badge variant="inactive" size="sm">      // Border-only, deselected
```

Notification badge dot:
```tsx
<span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
  {count}
</span>
```

### Search Input

Rounded pill search bar pattern:
```tsx
<input
  className="h-10 w-full rounded-full border border-border bg-secondary/50 pl-9 pr-8 text-sm shadow-sm transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
/>
```

### Modals & Overlays

Use `ResponsiveModal` (`src/components/ui/ResponsiveModal.tsx`) for overlays.
Overlay backdrop: `bg-black/30 backdrop-blur-sm`

### FAB (Floating Action Button)

Use `Fab` from `src/components/ui/Fab.tsx` for primary mobile CTAs:
```tsx
<Fab icon={<PlusIcon />} label="Add Recipe" onClick={...} />
```

### AI Loading States

For AI-powered features use `AiLoadingState`:
```tsx
<AiLoadingState stage="processing" feature="recipe-import" />
```
Stages: `idle | fallback | processing | complete | error`
Features: `recipe-import | grocery-list | recipe-enhancement | cost-estimate`

---

## 7. Animation & Motion

Use **Framer Motion** for meaningful transitions. Icons: Lucide React.

**List item entrance** (spring, no bounce):
```tsx
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', bounce: 0, duration: 0.4 }
  }
}
// Parent: staggerChildren: 0.05
```

**Tap feedback** (all interactive elements):
```tsx
<motion.button whileTap={{ scale: 0.95 }}>
// Or on a div:
className="... active:scale-[0.98]"
```

**Enter animations** (Tailwind animate plugin):
```tsx
className="animate-in fade-in"
className="animate-in slide-in-from-right duration-200"
```

Always use `type: 'spring', bounce: 0` — never linear easing on interactive UI.
Only animate elements with purpose — not static text or layout wrappers.

---

## 8. Mobile-First Patterns

- Minimum tap target: **44×44px** (`h-11 w-11`)
- Icon buttons: always `rounded-full`, minimum `h-10 w-10`
- Sticky elements use CSS variable utilities, never hardcoded `top-*`
- Safe area insets: `pt-safe-top` / `pb-[env(safe-area-inset-bottom)]` near screen edges
- Horizontal scrollable content: `overflow-x-auto scrollbar-hide` with fade gradient indicators:
  ```tsx
  <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background/95 to-transparent" />
  ```
- Overlays on mobile: `fixed inset-0` with `justify-end` (bottom sheet) or `justify-end` (side drawer)
- Image hover zoom: `transition-transform group-hover:scale-105` inside `overflow-hidden`

---

## 9. Implementation Checklist

Before finalising any UI change:

- [ ] Colors use semantic tokens — no raw hex, no hardcoded `gray-*` (use `muted`, `border`, `secondary`)
- [ ] Borders are `border-border` or `border-primary/N` — no stark black outlines
- [ ] Shadows are `shadow-sm` / `shadow-md` — no hard offset pixel shadows
- [ ] Rounded corners: `rounded-xl` (cards), `rounded-full` (pills, icon buttons), `rounded-lg` (inputs, thumbnails)
- [ ] Interactive elements have hover + active/tap states (`hover:bg-accent/50`, `active:scale-[0.98]`)
- [ ] Selected/active state uses `bg-primary text-primary-foreground` or `border-primary`
- [ ] No hardcoded `top-*` / `pt-*` for sticky elements — uses CSS variable utilities
- [ ] Dark mode works — semantic tokens adapt automatically
- [ ] Minimum 44px tap targets on all clickable elements
- [ ] Animations use `type: 'spring', bounce: 0` not linear easing
- [ ] Sticky surfaces use `bg-background/95 backdrop-blur-sm` if content scrolls beneath
