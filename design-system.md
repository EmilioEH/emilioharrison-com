# Design System Documentation

This document serves as the single source of truth for design decisions, patterns, and conventions used in the `emilioharrison-com` project.

## 1. Colors

The project uses a **Theme System** defined in `src/lib/themes.js`. There are currently two active themes: **Default** (Paper/Light) and **Blueprint** (Dark).

### Default Theme (Paper)
Used for the standard light mode experience.

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| `bg` | `#fdfbf7` | `bg-[#fdfbf7]` | Main page background |
| `text` | `gray-900` | `text-gray-900` | Body text |
| `primary` | `#2a9d8f` | `bg-[#2a9d8f]` | Primary actions, highlights |
| `secondary` | `#e76f51` | `bg-[#e76f51]` | Secondary accents |
| `accent` | `#e9c46a` | `bg-[#e9c46a]` | Decorative elements |
| `dark` | `#264653` | `bg-[#264653]` | Dark backgrounds |
| `border` | `black` | `border-black` | Borders, dividers |
| `card` | `white` | `bg-white` | Card backgrounds |
| `highlight` | `#2a9d8f` | `text-[#2a9d8f]` | Text highlights |

### Blueprint Theme (Dark)
Used for the "Blueprint" mode toggled via the navbar.

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| `bg` | `#002147` | `bg-[#002147]` | Main page background |
| `text` | `blue-100` | `text-blue-100` | Body text |
| `primary` | `#004e92` | `bg-[#004e92]` | Primary actions |
| `secondary` | `#ff4d4d` | `bg-[#ff4d4d]` | Secondary accents |
| `accent` | `#ffd700` | `bg-[#ffd700]` | Decorative elements |
| `dark` | `#00152e` | `bg-[#00152e]` | Darker backgrounds |
| `border` | `blue-200` | `border-blue-200` | Borders |
| `card` | `#002a5c` | `bg-[#002a5c]` | Card backgrounds |
| `highlight` | `#4db8ff` | `text-[#4db8ff]` | Text highlights |

## 2. Typography

The project relies on Tailwind's default font stack but switches families based on the theme.

### Font Families
*   **Default Theme**: `font-sans` (System UI stack)
*   **Blueprint Theme**: `font-mono` (Monospace stack)

### Scale & Hierarchy
| Level | Size Class | Weight | Tracking | Line Height | Usage |
|-------|------------|--------|----------|-------------|-------|
| **Display** | `text-6xl md:text-8xl` | `font-black` | `tracking-tighter` | `leading-[0.9]` | Hero Headings |
| **H1** | `text-2xl` | `font-black` | `tracking-tighter` | - | Logo / Site Title |
| **H2/Section**| `text-xl md:text-2xl` | `font-bold` | - | `leading-relaxed` | Section Headers, Intro Text |
| **Nav Links** | `text-sm` | `font-bold` | `tracking-wide` | - | Navigation Items (Uppercase) |
| **Body** | `text-base` | `font-normal` | - | - | Standard content |
| **Small** | `text-sm` | `font-normal` | - | - | Footer text, metadata |

## 3. Spacing & Layout

### Container
*   **Max Width**: `max-w-6xl`
*   **Centering**: `mx-auto`
*   **Padding**: `px-4 md:px-8` (Responsive horizontal padding)

### Vertical Rhythm
*   **Section Padding**: `py-12`
*   **Component Spacing**: `space-y-6` (Vertical stack)
*   **Grid Gaps**: `gap-8` (Major sections), `gap-4` (Component groups)

### Breakpoints
Standard Tailwind breakpoints are used:
*   `md`: 768px (Used for switching mobile/desktop nav and grid layouts)

## 4. Components

### BrutalButton
A high-contrast button with hard shadows and hover effects.

*   **Base Styles**: `px-6 py-3 font-bold flex items-center gap-2`
*   **Borders**: Theme-dependent (`border-2 border-black` or `border-blue-200`)
*   **Shadows**: Hard offset shadow (`4px 4px`)
*   **Hover State**: Translates 2px, reduces shadow to 2px.
*   **Active State**: Translates 4px, removes shadow (pressed effect).

### BrutalCard
Container component with similar styling to buttons but for content.

*   **Padding**: `p-6`
*   **Background**: Theme `card` color.
*   **Borders**: Theme `border`.
*   **Shadows**: Theme `shadow`.

### Navbar
Sticky header with theme switching capability.

*   **Height**: `h-20`
*   **Position**: `sticky top-0 z-50`
*   **Border**: Bottom border (`border-b-4`).

## 5. Visual Effects

### Shadows (Neo-Brutalism)
The design uses "hard" shadows (no blur) to create a distinct, illustrative look.

*   **Default**: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
*   **Blueprint**: `shadow-[4px_4px_0px_0px_rgba(191,219,254,0.3)]` (Semi-transparent blue)

### Animations
*   **Page Load**: `animate-in fade-in duration-700`
*   **Theme Switch**: `transition-colors duration-500`
*   **Interactions**: `transition-all` on buttons/links for smooth hover states.

## 6. Code Conventions

### CSS Methodology
*   **Tailwind CSS**: Utility-first approach for almost all styling.
*   **CSS Modules/BEM**: Not currently used.
*   **Custom CSS**: Minimal usage in `src/index.css` (only Tailwind imports).

### Theme Management
*   **Store**: `nanostores` (`src/lib/store.js`) manages the active theme state.
*   **Object**: `THEMES` object in `src/lib/themes.js` contains all design tokens.
*   **Usage**: Components subscribe to the store or receive `theme` as a prop to apply dynamic classes.

### File Structure
*   `src/components/ui/`: Reusable, atomic components (`BrutalButton`, `BrutalCard`).
*   `src/lib/`: Logic and constants (`themes.js`, `store.js`).
*   `src/layouts/`: Page wrappers (`Layout.astro`).
