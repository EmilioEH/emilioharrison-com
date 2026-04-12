trigger: always_on

# iOS / WebKit Compatibility (Mandatory)

## The One Rule That Explains All iOS Bugs

**Every browser on iPhone and iPad — Chrome, Firefox, Edge, Safari — uses Apple's WebKit engine.**
There is no escape. An Android feature test does not validate iOS behaviour.
A feature that works on Android Chrome can silently fail on iPhone Chrome.

## Anti-Patterns That Break iOS (never write these)

### 1. `cursor-default` or missing `cursor-pointer` on `div` click targets

iOS Safari only fires tap events on native interactive elements (`<button>`, `<a>`, `<input>`) and on any element that has `cursor: pointer` in its computed style.

```tsx
// ❌ Broken on iOS — div onClick with no cursor:pointer
<div onClick={closeModal} className="absolute inset-0 bg-black/50" aria-hidden="true" />

// ✅ Fixed
<div onClick={closeModal} className="absolute inset-0 cursor-pointer bg-black/50" aria-hidden="true" />
```

Applies to: backdrop divs, custom sheet overlays, any non-button element with onClick.
Applies to shadcn/Radix: `DropdownMenuItem`, `DropdownMenuSubTrigger`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem` all use `div[role=menuitem]` — they MUST have `cursor-pointer`, never `cursor-default`.

### 2. Controlled Radix trigger + extra `onClick` toggle

When a Radix `DropdownMenu` is controlled (`open` + `onOpenChange`) AND the trigger button has an additional `onClick` that toggles the same state, iOS fires `pointerdown` (opens) then `click` (toggles closed) as separate events. The menu appears to do nothing.

```tsx
// ❌ Broken on iOS
<DropdownMenu open={open} onOpenChange={setOpen}>
  <DropdownMenuTrigger asChild>
    <Button onClick={() => setOpen(v => !v)}>  {/* ← remove this */}

// ✅ Fixed — let onOpenChange do the work
<DropdownMenu open={open} onOpenChange={setOpen}>
  <DropdownMenuTrigger asChild>
    <Button>
```

### 3. `body { position: fixed }` without saving scroll offset

iOS requires the scroll-position-save pattern when locking body scroll, otherwise the page snaps to y=0 and all subsequent taps hit the wrong elements.

```ts
// ❌ Broken on iOS — page jumps to top
document.body.style.position = "fixed";

// ✅ Fixed — save and restore scroll position
const scrollY = window.scrollY;
document.body.style.position = "fixed";
document.body.style.top = `-${scrollY}px`;
// On unlock:
const scrollY = parseInt(document.body.style.top || "0", 10) * -1;
document.body.style.position = "";
document.body.style.top = "";
window.scrollTo(0, scrollY);
```

### 4. Multiple independent `document.body.style.overflow` writers

Every component that sets `document.body.style.overflow = 'hidden'` independently will race to reset it. Whichever closes first resets the lock for all others, leaving the app in a broken scroll state on iOS.

Rule: Use a ref-counted utility (`src/lib/scroll-lock.ts`) — do not write directly to `document.body.style.overflow` in component effects. Check if `scroll-lock.ts` exists before creating a new one.

### 5. `user-scalable=no` or `maximum-scale` in viewport meta

```html
<!-- ❌ Suppresses iOS tap events on portal content, breaks WCAG 1.4.4 -->
<meta name="viewport" content="..., maximum-scale=1.0, user-scalable=no" />

<!-- ✅ -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### 6. Sub-44px touch targets

Apple's Human Interface Guidelines require a minimum 44×44pt tap target. Buttons smaller than `h-11 w-11` (44px) are unreliable on iPhone.

```tsx
// ❌ 36px — misses taps on iPhone
<Button size="icon" className="h-9 w-9">

// ✅ 44px minimum
<Button size="icon" className="h-11 w-11">
```

### 7. `touch-action` missing on swipe gesture handlers

Any element using `onTouchMove` + `e.preventDefault()` needs `touch-action` set so iOS doesn't absorb the gesture at the browser level before it reaches React.

```tsx
// ❌ iOS owns the gesture in a scroll container
<div onTouchMove={handleSwipe}>

// ✅ Allow vertical scroll natively, pass horizontal to React
<div onTouchMove={handleSwipe} className="touch-pan-y">
// or style={{ touchAction: 'pan-y' }}
```

## Required Patterns

### Backdrop divs

Always use `role="button"` + `tabIndex={0}` + `cursor-pointer` OR switch to a proper `<button>`:

```tsx
<div
  role="button"
  tabIndex={0}
  className="absolute inset-0 cursor-pointer bg-black/50"
  onClick={onClose}
  aria-label="Close"
/>
```

### DropdownMenu items

Always `cursor-pointer` (not `cursor-default`) in `dropdown-menu.tsx`. The shared `dropdown-menu.tsx` already has this fix — do not revert it.

### New sheets / modals

Any new bottom sheet or modal that rolls its own backdrop (not using `ResponsiveModal`) must follow the backdrop pattern above.

### Touch targets in toolbars / icon-only buttons

Minimum `h-11 w-11`. If layout constraints require a smaller visual size, add an invisible hit area:

```tsx
<button className="relative h-6 w-6">
  <span className="absolute -inset-[10px]" aria-hidden="true" />
  <Icon />
</button>
```

## Known Good Implementations (reference these)

- Backdrop: `src/components/ui/ResponsiveModal.tsx` — `role="button"` pattern
- Backdrop: `src/components/layout/GlobalBurgerMenu.tsx` — same pattern
- Scroll lock: `src/components/recipe-manager/RecipeManager.tsx` — `position:fixed + top:-scrollY` pattern
- Swipe + touch-action: `src/components/recipe-manager/week-planner/WeekPlanView.tsx` — `touch-pan-y`
