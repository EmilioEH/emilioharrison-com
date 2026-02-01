# Mobile-First UI Design Philosophy

Guidelines for building consistent, thumb-friendly mobile interfaces across the recipes app.

## Core Principles

### 1. Information Density Over Scrolling

- Show all relevant data in the viewport without requi iring scroll
- Use grids (4+3, 3x3) instead of vertical lists when displaying bounded sets
- Prefer compact visual indicators (dots, badges) over text labels

### 2. Progressive Disclosure

- **Collapsed state:** Minimal footprint showing status at-a-glance (counts, dots, progress)
- **Expanded state:** Full detail with actions, only when user requests it
- The collapsed state should answer "what's the status?" in <1 second

### 3. Thumb-Zone Friendly

- Primary actions anchored to bottom of screen
- Tap targets minimum 44×44px
- Most frequent actions within natural thumb reach
- Avoid top-of-screen interactions for common tasks

### 4. Direct Manipulation

- Single tap for primary action (add, select, toggle)
- Swipe for navigation (weeks, pages, dismiss)
- Long-press for secondary info/preview (non-destructive)
- × button for removal (no confirmation for easily reversible actions)

### 5. Immediate Feedback

- Haptic feedback on state changes (light for navigation, success pattern for completion)
- Visual state updates instantly (optimistic UI)
- Loading states only for operations >300ms

### 6. Responsive to Context

- Components adapt to system state (other UI elements showing/hiding)
- Use dynamic positioning over hardcoded values
- Respect safe areas and existing chrome (footers, headers)

### 7. Minimal Modality

- Prefer inline expansion over full-screen modals
- Sheets/drawers over blocking dialogs
- Backdrop dismisses (tap outside = close)
- Escape routes always visible (×, swipe down, tap backdrop)

---

## Component Patterns

### Bottom Sheets (Quick Actions)

```
- Height: ~40-45% of viewport max
- Drag handle at top (visual affordance)
- Auto-close after successful action
- Backdrop blur + dim for focus
```

### Status Bars (Persistent Context)

```
- Collapsed: Single row, <60px height
- Shows: Label + count + visual indicator (dots/progress)
- Tap to expand, not navigate away
- Scroll-aware: hides on scroll down, shows on scroll up
```

### Selection Grids (Bounded Choices)

```
- All options visible without scroll
- Visual state: empty → selected → active
- Today/current item highlighted with ring
- Secondary indicator (dot) for "has content"
```

### Cart/List Drawers (Accumulated Items)

```
- Thumbnail + title + metadata row
- Inline remove button (×)
- Empty state with guidance
- Primary CTA at bottom (sticky)
```

---

## Visual Language

| Element                 | Treatment                                         |
| ----------------------- | ------------------------------------------------- |
| Selected/Active         | `bg-primary text-primary-foreground`              |
| Has content (indicator) | Small dot (`h-1.5 w-1.5 rounded-full bg-primary`) |
| Empty/Available         | `bg-muted/50 text-foreground`                     |
| Today/Current           | Ring border (`ring-2 ring-primary ring-offset-2`) |
| Disabled                | `opacity-50`                                      |
| Destructive hover       | `hover:bg-destructive/10 hover:text-destructive`  |

---

## Interaction Patterns

| Gesture          | Action                           |
| ---------------- | -------------------------------- |
| Tap              | Select / Toggle / Primary action |
| Swipe horizontal | Navigate (prev/next week, page)  |
| Swipe down       | Dismiss sheet/modal              |
| Long press       | Preview / Secondary info         |
| Tap backdrop     | Close expanded state             |

---

## Questions to Ask When Designing

1. Can the user see the status without tapping anything?
2. Does this require a full modal or can it expand inline?
3. Are all options visible without scrolling?
4. What happens on tap? On long-press? On swipe?
5. How does this adapt when other UI elements show/hide?
6. Is the primary action in the thumb zone?
7. Can the user undo this without confirmation?

---

## Anti-Patterns to Avoid

- Vertical lists for ≤10 bounded items (use grid)
- Full-screen modals for quick selections
- Confirmation dialogs for reversible actions
- Text labels where icons + dots suffice
- Fixed positioning that ignores other UI chrome
- Requiring scroll to see all options in a picker
- Navigation away from current context for simple actions

---

## Examples in This Codebase

### DayPicker (Good Example)

- 4+3 grid shows all 7 days without scroll
- Swipe left/right to navigate weeks
- Tap to select, auto-closes on success
- Long-press to preview what's planned
- Haptic feedback on interactions
- Compact sheet (~45% height)

### WeekContextBar (Good Example)

- Collapsed: dots + count visible at glance
- Expanded: full recipe list with thumbnails
- Dynamic positioning responds to footer visibility
- Inline remove buttons (×)
- Primary action (Grocery List) prominent at bottom

---

## Recipe Library Page Analysis

### Current State Assessment

#### RecipeHeader ✓ Mostly Good

| Aspect          | Status | Notes                                                      |
| --------------- | ------ | ---------------------------------------------------------- |
| Scroll-aware    | ✓      | Hides on scroll down, shows on scroll up                   |
| Primary actions | ⚠️     | Add/Week/Grocery in header (top of screen, not thumb zone) |
| Welcome bar     | ✓      | Collapses on scroll to save space                          |

**Recommendation:** Consider moving "Add Recipe" to a FAB or bottom bar for better thumb reach.

#### RecipeCard ✓ Good

| Aspect              | Status | Notes                                      |
| ------------------- | ------ | ------------------------------------------ |
| Information density | ✓      | Thumbnail + title + metadata in single row |
| Tap target          | ✓      | Full card is tappable                      |
| Quick action (+)    | ✓      | Plus button for week planning              |
| Status indicators   | ✓      | Day badges show planned status             |

**Minor improvements:**

- The `+` button is small (24×24). Consider 32×32 minimum.
- Long-press could preview recipe details without navigating away.

#### AccordionGroup ⚠️ Needs Attention

| Aspect                 | Status | Notes                                         |
| ---------------------- | ------ | --------------------------------------------- |
| Progressive disclosure | ✓      | Expands/collapses groups                      |
| Sticky headers         | ✓      | Headers stick while scrolling content         |
| Group visibility       | ❌     | Only one group visible at a time conceptually |

**Issue:** Accordion pattern requires tapping to reveal content. User can't see status across all groups at a glance.

**Recommendation:** Consider a **tab bar** or **horizontal scroll** for group switching, with content below. Or show mini-previews (count + first 2 thumbnails) for collapsed groups.

#### RecipeLibrary ⚠️ Mixed

| Aspect          | Status | Notes                             |
| --------------- | ------ | --------------------------------- |
| Search results  | ✓      | Flat list, no accordion nesting   |
| Selection mode  | ✓      | Checkbox UI, clear selected state |
| Empty state     | ✓      | Helpful messaging with icon       |
| Scroll position | ✓      | Cached and restored               |

**Issues identified:**

1. **Accordion-heavy navigation**
   - Default view uses nested accordions
   - User must tap to expand each group
   - Can't see content across groups simultaneously

2. **No filtering indicators in collapsed state**
   - Collapsed accordion shows count but not _what's inside_
   - User doesn't know if their recipe is in "Favorites" or "Italian" without expanding

3. **Primary action (Add Recipe) is in header**
   - Top-right location is hard to reach on large phones
   - Not in thumb zone

### Recommendations

#### High Priority

**1. Floating Action Button for "Add Recipe"**

```
- Position: bottom-right, above WeekContextBar
- Size: 56×56px
- Icon: Plus
- Rises above expanded WeekContextBar
```

**2. Group Preview in Collapsed Accordion**

```
Current:  [▶ Italian (12)]
Proposed: [▶ Italian (12)  🍕🍝🥗 ...]
          Show first 3 thumbnails inline
```

**3. Horizontal Group Tabs (Alternative to Accordion)**

```
┌────────────────────────────────────────┐
│ [Favorites] [Recent] [Italian] [More▼] │
├────────────────────────────────────────┤
│  Recipe cards for selected group...    │
└────────────────────────────────────────┘
```

- Swipe between groups
- Current group always visible
- "More" dropdown for overflow

#### Medium Priority

**4. Long-Press Recipe Preview**

```
Long-press a recipe card → show quick preview:
- Larger image
- Full title
- Ingredients count
- "Add to Week" button
- "View Details" button
```

Dismisses on tap outside (same pattern as DayPicker long-press).

**5. Swipe Actions on Recipe Cards**

```
Swipe right → Add to this week (quick add to today/tomorrow)
Swipe left  → Add to favorites / Remove
```

With haptic feedback on threshold.

**6. Recipe Count Badge in Header**

```
CHEFBOARD                    [📚 47]
```

Shows total recipe count, tappable to scroll to top.

#### Low Priority

**7. Quick Filters Chip Bar**

```
┌──────────────────────────────────────────────┐
│ [All] [⭐ Favorites] [🕐 <30min] [🥗 Veggie] │
└──────────────────────────────────────────────┘
```

Horizontal scroll, single-tap to filter, shows above recipe list.

**8. "Jump to Group" FAB Menu**
When user has many groups, long-press the scroll-to-top button to show a quick-jump menu to any group.

### Implementation Priority

| Change                       | Effort | Impact | Priority |
| ---------------------------- | ------ | ------ | -------- |
| FAB for Add Recipe           | Low    | High   | 1        |
| Accordion thumbnails preview | Medium | Medium | 2        |
| Long-press recipe preview    | Medium | Medium | 3        |
| Horizontal group tabs        | High   | High   | 4        |
| Swipe actions                | Medium | Medium | 5        |
| Quick filter chips           | Medium | Low    | 6        |

---

## Implementation Notes

### Haptic Feedback Utility

```typescript
const triggerHaptic = (style: 'light' | 'medium' | 'success' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      success: [10, 50, 20],
    }
    navigator.vibrate(patterns[style])
  }
}
```

### Scroll-Aware Visibility

```typescript
useEffect(() => {
  const handleScroll = () => {
    const currentScrollY = window.scrollY
    if (currentScrollY > lastScrollY.current && currentScrollY > 20) {
      setIsVisible(false) // Hide on scroll down
    } else if (currentScrollY < lastScrollY.current) {
      setIsVisible(true) // Show on scroll up
    }
    lastScrollY.current = currentScrollY
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

### Dynamic Bottom Positioning

```typescript
style={{
  bottom: isFooterVisible ? '2rem' : '0',
  transform: !isExpanded && !isFooterVisible ? 'translateY(100%)' : 'translateY(0)',
}}
```
