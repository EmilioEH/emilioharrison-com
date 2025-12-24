# Design System Documentation

**Last Updated**: November 27, 2025  
**Design Name**: Vibe Coding  
**Version**: 1.0  

This document serves as the single source of truth for design decisions, patterns, and conventions used in the Emilio Harrison portfolio project.

---

## Design Philosophy

The **Vibe Coding** design embraces:
- **Utility Over Decoration**: Every element serves a functional purpose
- **Tangible Digital**: Physical metaphors (sticky notes, tape, shadows) translated to screen
- **Intentional Chaos**: Controlled asymmetry that guides rather than confuses
- **Neo-Brutalism**: Hard shadows, thick borders, and bold typography
- **Vibe as Usability**: Emotional resonance enhances, not replaces, functionality

---

## 1. Colors

Colors are defined as constant values and should be referenced consistently throughout the application.

### Primary Palette


| Name | Hex | Tailwind Class | Usage |
|------|-----|----------------|-------|
| **Paper** | `#fdfbf7` | `bg-paper` | Main page background, warm off-white paper texture |
| **Ink** | `#264653` | `text-ink` | Primary text color, dark navy for high readability |
| **Teal** | `#2a9d8f` | `bg-teal` | Primary brand color, CTAs and key highlights |
| **Coral** | `#e76f51` | `bg-coral` | Secondary accent, energetic and warm |
| **Mustard** | `#e9c46a` | `bg-mustard` | Tertiary accent, playful and friendly |

### THEME Configuration

```javascript
const THEME = {
  colors: {
    bg: "bg-paper",        // Paper background
    text: "text-ink",     // Ink text
    primary: "bg-teal",    // Teal - Primary actions
    secondary: "bg-coral",  // Coral - Secondary actions
    accent: "bg-mustard",     // Mustard - Highlights
    dark: "bg-ink",       // Dark navy for structure
    stickyYellow: "bg-mustard",
    stickyBlue: "bg-teal",
    stickyPink: "bg-coral",
    stickyWhite: "bg-white",
  },
  shadow: "shadow-[6px_6px_0px_0px_#000000]",
  border: "border-4 border-black",
};
```

### Usage Guidelines

```jsx
// Background
<div className="bg-paper">

// Text
<h1 className="text-ink">

// Accent colors for sticky notes
<StickyNote color="stickyYellow">
<StickyNote color="stickyBlue">
<StickyNote color="stickyPink">
```

### Color Combinations

| Combination | Usage | Example |
|-------------|-------|---------|
| Paper + Ink | Default page layout | Body text on background |
| Teal + White | Primary actions | Main call-to-action buttons |
| Coral + White | Secondary actions | Submit buttons, alerts |
| Mustard + Black | Highlights | Badges, tags, sticky notes |

---

## 2. Typography

### Font Families

**Primary**: System UI Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif
```
- Uses native system fonts for optimal performance
- No web font loading required

**Special Use**: Comic Sans MS (for handwritten feel in Marginalia tooltips)
```css
font-family: "Comic Sans MS", cursive, sans-serif
```

### Type Scale & Hierarchy

| Level | Classes | Weight | Usage | Example |
|-------|---------|--------|-------|---------|
| **Display** | `text-6xl md:text-8xl` | `font-black` (900) | Hero headings | "EMILIO HARRISON" |
| **H2** | `text-4xl` | `font-black` (900) | Section titles | "Field Notes", "The Lab" |
| **H3** | `text-2xl` or `text-3xl` | `font-black` (900) | Card titles, experiment titles | Blog post titles |
| **Body Large** | `text-xl` or `text-2xl` | `font-bold` (700) | Intro paragraphs, callouts | Hero descriptions |
| **Body** | `text-lg` | `font-medium` (500-600) | Standard content | Article text, descriptions |
| **Body Small** | `text-base` | `font-bold` (700) | UI elements | Button text |
| **Small** | `text-sm` | `font-bold` (700) | Labels, metadata | Category tags, dates |
| **Tiny** | `text-xs` | `font-bold` (700) | Badges, footnotes | "EXP 01", marginalia IDs |

### Typography Patterns

```jsx
// Display heading (Hero)
<h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter text-[#264653]">
  EMILIO<br/>HARRISON
</h1>

// Section title with decorative bullet
<h2 className="text-4xl font-black mb-8 uppercase tracking-tight flex items-center gap-3 text-[#264653]">
  <span className="w-8 h-8 bg-[#e76f51] border-4 border-black rounded-full flex items-center justify-center">
    <div className="w-2 h-2 bg-black rounded-full"></div>
  </span>
  Section Title
</h2>

// Card title
<h3 className="text-2xl font-black mb-3 leading-tight">
  Card Title
</h3>

// Badge/Label
<span className="text-xs font-bold uppercase tracking-wider bg-[#264653] text-white px-2 py-1 border-2 border-black">
  LABEL
</span>
```

### Text Treatments
- **All-caps**: Used for labels, tags, buttons, and section identifiers
- **Uppercase tracking**: `tracking-wider` or `tracking-widest` for emphasis
- **Tight tracking**: `tracking-tighter` or `tracking-tight` for display headlines
- **Line height**: `leading-[0.9]` for hero text, `leading-tight` for cards, `leading-relaxed` for body

---

## 3. Spacing & Layout

### Container System

```jsx
// Main content wrapper
<main className="max-w-6xl mx-auto px-4 md:px-8 py-12">
```

- **Max Width**: `max-w-6xl` (1152px)
- **Horizontal Padding**: `px-4` (16px mobile), `px-8` (32px desktop)
- **Vertical Padding**: `py-12` (48px)

### Spacing Scale

| Use Case | Class | Value |
|----------|-------|-------|
| Tight spacing | `gap-1` or `gap-2` | 4px / 8px |
| Component internal | `gap-3` or `gap-4` | 12px / 16px |
| Component padding | `p-6` or `p-8` | 24px / 32px |
| Related elements | `gap-6` | 24px |
| Section internal | `gap-8` or `space-y-8` | 32px |
| Between sections | `gap-12` or `mb-12` | 48px |
| Major section breaks | `mb-24` | 96px |

### Grid Layouts

```jsx
// Blog cards (responsive 3-column)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">

// Hero layout (asymmetric 7/5 split)
<div className="grid grid-cols-1 md:grid-cols-12 gap-8">
  <div className="md:col-span-7">Main content</div>
  <div className="md:col-span-5">Sidebar</div>
</div>

// Contact form (2-column)
<div className="grid grid-cols-1 md:grid-cols-2 gap-12">
```

---

## 4. Visual Effects

### Hard Shadows

The design uses **hard-edged shadows** with no blur for a neo-brutalist aesthetic:

| Token | Value | Usage | Visual Weight |
|-------|-------|-------|---------------|
| **Button Rest** | `shadow-[4px_4px_0px_0px_#000000]` | Default button state | Medium |
| **Standard** | `shadow-[6px_6px_0px_0px_#000000]` | Cards, sticky notes, containers | Heavy |
| **Hover** | `shadow-[8px_8px_0px_0px_#000000]` | Interactive hover states | Extra Heavy |
| **Large** | `shadow-[12px_12px_0px_0px_#000000]` | Full-page content blocks | Maximum |

**Shadow Philosophy:**
- All shadows are **hard-edged offset shadows**, never soft/blurred
- Shadow direction is consistently bottom-right (positive X and Y offset)
- Shadows scale with interaction depth (larger = more "lifted")
- Active/pressed state removes shadow entirely

---

## 6. Layout & Grid

### Container System
```css
max-w-6xl mx-auto           /* 1152px max width, centered */
px-4 md:px-8                /* Responsive horizontal padding */
```

### Grid Patterns
```jsx
// Two-column responsive
grid grid-cols-1 md:grid-cols-2 gap-8

// Three-column responsive  
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8

// Asymmetric (7/5 split)
grid grid-cols-1 md:grid-cols-12
md:col-span-7  // Main content
md:col-span-5  // Sidebar
```

### Breakpoints (Tailwind defaults)
- **Mobile**: < 768px (base styles)
- **Tablet**: ≥ 768px (`md:` prefix)
- **Desktop**: ≥ 1024px (`lg:` prefix)

---

## 7. Core Components

### 7.1 Button Usage & Hierarchy
To ensure visual consistency, use the following hierarchy for all interactive elements:

#### 1. Primary Button
**Usage:**
- The main Call-to-Action (CTA) on a page.
- Use for actions like "Submit", "Subscribe", "Buy", or primary navigation drivers (e.g., "Read Field Notes" on Homepage).
- Limit to 1-2 per view to maintain focus.

**Visual Style:**
- **Background:** Brand Color (e.g., `bg-blue-600`, `bg-zinc-900`) or High-Viz Color (e.g., `bg-yellow-400` for emphasis).
- **Text:** White (on dark bg) or Black (on light bg). Bold, Uppercase preferred for "Tape" style.
- **Border:** `4px solid black`.
- **Shadow:** Hard shadow (`box-shadow: 4px 4px 0px 0px #000`).
- **Padding:** `px-6 py-3` (approx. 12px 24px).
- **Font Size:** `14px` (text-sm) or `16px` (text-base).

#### 2. Secondary Button
**Usage:**
- Alternative actions that are important but not the primary focus.
- Examples: "Read More" on a card, "Back" buttons, "Cancel".

**Visual Style:**
- **Background:** White (`bg-white`) or Light Gray.
- **Text:** Black (`text-black`).
- **Border:** `2px solid black`.
- **Shadow:** None or Minimal (`2px` hard shadow on hover).
- **Padding:** `px-6 py-3`.
- **Font Size:** `16px` (text-base).

#### 3. Tertiary Button / Text Link
**Usage:**
- Low emphasis actions, utility triggers, or inline navigation.
- Examples: "Filter", "Sort", "Edit", Footer links.

**Visual Style:**
- **Background:** Transparent.
- **Text:** Dark Gray (`text-zinc-800`) or Brand Color.
- **Border:** None (or bottom border for links).
- **Padding:** `0` or `px-4 py-2` for utility toggles.
- **Font Size:** `14px` (text-sm).

#### 4. Categories & Tags
**Usage:**
- Labeling content metadata.
- Interactive elements that filter content.

**Visual Style:**
- **Background:** White (`bg-white`).
- **Text:** Black (`text-black`).
- **Border:** `2px solid black`.
- **Padding:** `px-3 py-1` (approx. 4px 12px).
- **Font Size:** `12px` (text-xs).
- **Hover:** Invert colors (Black bg, White text) or slight lift.

---

### 7.2 TapeButton

**Purpose**: Primary interactive button styled like tape with hard shadow

```jsx
<TapeButton 
  onClick={handler}
  color={THEME.colors.primary}
  active={false}
  className="..."
  type="button"
  rippleContext={rippleContext}
>
  <Icon size={20} /> Button Text
</TapeButton>
```

**Visual Specs:**
- Border: `border-4 border-black`
- Shadow (rest): `shadow-[4px_4px_0px_0px_#000000]`
- Shadow (hover): `shadow-[6px_6px_0px_0px_#000000]`
- Padding: `px-6 py-3` (24px × 12px)
- Typography: `font-bold text-sm uppercase tracking-wider`
- Transform on hover: `translate-x-[-2px] translate-y-[-2px]`
- Transform on active: `translate-x-[2px] translate-y-[2px]` + no shadow

**States:**
1. **Rest**: Standard shadow, no transform
2. **Hover**: Larger shadow, translate up-left
3. **Active/Pressed**: No shadow, translate down-right
4. **Disabled**: Add `opacity-90`

**Color Variants:**
- Primary (Teal): Main actions
- Secondary (Coral): Secondary actions  
- Accent (Mustard): Special/creative actions

---

### 7.3 StickyNote

**Purpose**: Content container styled as a physical sticky note with pin

```jsx
<StickyNote 
  color="stickyYellow"
  rotate={-2}
  className="..."
>
  {children}
</StickyNote>
```

**Visual Specs:**
- Border: `border-4 border-black`
- Shadow: `shadow-[6px_6px_0px_0px_#000000]`
- Padding: `p-6` mobile, `p-8` desktop
- Rotation: `-2deg` to `2deg` (prop-controlled)
- Pin: Absolute positioned circle at top center
  - Container: `w-6 h-6 rounded-full bg-black border-2 border-white`
  - Inner dot: `w-2 h-2 bg-black rounded-full`

**Hover State:**
- Scale: `scale-[1.01]`
- Shadow: `shadow-[8px_8px_0px_0px_#000000]`
- Z-index: `z-10`

**Color Variants:**
- Yellow (`#e9c46a`): Warnings, highlights
- Blue (`#2a9d8f`): Info, primary content
- Pink/Coral (`#e76f51`): Alerts, secondary
- White: Neutral content containers

---

### 7.4 SectionTitle

**Purpose**: Major section heading with decorative bullet

```jsx
<SectionTitle>Section Name</SectionTitle>
```

**Visual Specs:**
- Typography: `text-4xl font-black uppercase tracking-tight`
- Color: Navy (`#264653`)
- Flex layout with decorative circle bullet:
  - Outer circle: `w-8 h-8 bg-[#e76f51] border-4 border-black rounded-full`
  - Inner dot: `w-2 h-2 bg-black rounded-full`
- Spacing: `mb-8` (32px below)

---

### 7.5 Marginalia (Footnote System)

**Purpose**: Inline footnote references with hover tooltips

```jsx
<Marginalia id="1" text="Footnote content here" />
```

**Visual Specs:**

**Trigger Badge:**
- Size: `text-xs font-black`
- Background: Coral (`#e76f51`)
- Border: `border-2 border-black`
- Shape: `rounded-full`
- Padding: `px-1.5`
- Position: `align-super` (superscript)

**Tooltip (on hover/click):**
- Width: `w-64` (256px)
- Padding: `p-4`
- Border: `border-4 border-black`
- Shadow: `shadow-[6px_6px_0px_0px_#000000]`
- Position: Above trigger, centered
- Font: Comic Sans MS (handwritten feel)
- Animation: Scale and slight rotation on open

**States:**
- Closed: `opacity-0 scale-95`
- Open: `opacity-100 scale-100 rotate-1`

---

### 7.6 ExperimentCard

**Purpose**: Container for interactive experiments/demos

```jsx
<ExperimentCard 
  number="01"
  title="Experiment Name"
  subtitle="Description"
  icon={<Icon />}
  color={THEME.colors.primary}
  rot={-1}
>
  {experimentComponent}
</ExperimentCard>
```

**Structure:**
1. **Header Section**: Metadata and title
   - Number badge with rotation
   - Large title (`text-3xl font-black`)
   - Optional subtitle and icon
2. **Content**: White StickyNote wrapper with `p-0 overflow-hidden`

---

## 8. Patterns & Textures

### SVG Background Patterns

Three repeating patterns used for decorative background shapes:

```jsx
<pattern id="pattern-dots">
  // Dotted pattern (5px circles, 10px spacing)
</pattern>

<pattern id="pattern-hatch">
  // Diagonal line hatch (8px spacing, 45° rotation)
</pattern>

<pattern id="pattern-grid">
  // Grid lines (20px squares)
</pattern>
```

**Usage:**
- Applied as `fill` to background SVG shapes
- Opacity: `0.2-0.3` for subtle texture
- Color: Always navy (`#264653`)

---

## 9. Animation & Motion

### Transition Timing
```css
transition-all duration-200 ease-out          /* Buttons, fast interactions */
transition-all duration-300 ease-in-out       /* Cards, medium interactions */
transition-transform duration-500             /* Page transitions */
transition-transform 0.8s cubic-bezier(...)   /* Background shapes */
```

### Standard Animations

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| **Button Hover** | 200ms | `ease-out` | Shadow + transform |
| **Card Hover** | 300ms | `ease-in-out` | Scale + shadow |
| **Page Fade In** | 500-700ms | Default | Content appear |
| **Background Float** | 0.8s | `cubic-bezier(0.175, 0.885, 0.32, 1.27)` | Parallax shapes |

### Transform Patterns

**Button Interaction:**
```css
/* Hover */
transform: translate(-2px, -2px)

/* Active/Press */
transform: translate(2px, 2px)
```

**Card Hover:**
```css
transform: scale(1.01) rotate(slight-variation)
```

**Rotation Variations:**
- Use `-2deg` to `2deg` range
- Alternate positive/negative for adjacent elements
- Never exceed ±3deg for readability

---

## 10. Interactive States

### Button States

| State | Transform | Shadow | Opacity |
|-------|-----------|--------|---------|
| **Rest** | `translate(0, 0)` | `4px 4px` | `1` |
| **Hover** | `translate(-2px, -2px)` | `6px 6px` | `1` |
| **Active** | `translate(2px, 2px)` | `none` | `0.9` |
| **Focus** | Same as hover | Same as hover | `1` |
| **Disabled** | `translate(0, 0)` | `4px 4px` | `0.5` |

### Form Input States
```css
/* Base */
bg-white border-4 border-black

/* Focus */
focus:outline-none 
focus:shadow-[4px_4px_0px_0px_#000000]
```

### Card/Container Hover
```css
hover:scale-[1.01]
hover:shadow-[8px_8px_0px_0px_#000000]
hover:z-10
```

---

## 11. Responsive Behavior

### Mobile-First Approach
Base styles target mobile, with `md:` and `lg:` overrides.

### Key Breakpoints

**Typography:**
```css
text-4xl md:text-6xl              /* Hero titles */
text-xl md:text-2xl               /* Large body text */
p-6 md:p-8                        /* Container padding */
```

**Layout:**
```css
grid-cols-1 md:grid-cols-2        /* Two-column cards */
grid-cols-1 md:grid-cols-12       /* Asymmetric layouts */
hidden md:flex                    /* Desktop-only elements */
md:hidden                         /* Mobile-only elements */
```

### Mobile Navigation
- Hamburger menu (Menu/X icon toggle)
- Full-width dropdown on mobile
- Horizontal nav on desktop

---

## 12. Accessibility Guidelines

### Color Contrast
- Navy on Cream: **AAA** (very high contrast)
- White on Teal: **AA** minimum
- White on Coral: **AA** minimum
- All interactive elements maintain minimum **4.5:1** contrast ratio

### Interaction Targets
- Minimum touch target: **44×44px** (iOS/Android guidelines)
- Button padding: `px-6 py-3` = 48×48px minimum

### Focus States
- All interactive elements have visible focus styles
- Focus inherits hover styles (shadow + transform)
- Never remove outline without replacement

### Keyboard Navigation
- All buttons/links are keyboard accessible
- Logical tab order maintained
- Sticky note tooltips support both hover and click

### Screen Readers
- Semantic HTML structure
- Icon buttons should include `aria-label` where text isn't visible
- Form inputs must have associated labels

---

## 13. Content Guidelines

### Voice & Tone
- **Direct**: No corporate jargon, speak plainly
- **Confident**: Strong opinions, backed by experience
- **Technical but Accessible**: Explain concepts without condescension
- **Slightly Playful**: Personality without unprofessionalism

### Typography Hierarchy in Content
1. **Section Title**: Largest, all-caps, with decorative bullet
2. **Card Title**: Large, title case, bold
3. **Body Large**: Intros, callouts, emphasis
4. **Body**: Standard paragraph text
5. **Metadata**: Small, uppercase, high tracking

### Content Formatting
- **No bullet points in prose**: Write lists as natural sentences
- **Border-left emphasis**: Use `border-l-4 border-black pl-4` for callouts
- **Footnotes**: Inline via Marginalia component, not bottom-of-page
- **Code snippets**: Monospace font with appropriate background

---

## 14. Component Usage Examples

### Hero Section Pattern
```jsx
<div className="grid grid-cols-1 md:grid-cols-12 gap-8">
  <div className="md:col-span-7">
    {/* Badge */}
    <div className="inline-block transform -rotate-2">
      <div className="bg-[#e9c46a] border-2 border-black px-4 py-1 
                      font-black tracking-widest uppercase text-sm 
                      shadow-[4px_4px_0px_0px_#000000]">
        Badge Text
      </div>
    </div>
    
    {/* Title */}
    <h1 className="text-6xl md:text-8xl font-black leading-[0.9] 
                   tracking-tighter text-[#264653]">
      MAIN TITLE
    </h1>
    
    {/* Description Card */}
    <div className="relative p-6 bg-white border-4 border-black 
                    shadow-[8px_8px_0px_0px_#000000] transform rotate-1">
      <p className="text-xl text-black font-bold">Description</p>
    </div>
    
    {/* CTA Buttons */}
    <div className="flex gap-4">
      <TapeButton color={THEME.colors.primary}>Primary</TapeButton>
      <TapeButton color={THEME.colors.secondary}>Secondary</TapeButton>
    </div>
  </div>
</div>
```

### Blog Card Pattern
```jsx
<StickyNote color="stickyYellow" rotate={-1}>
  {/* Header */}
  <div className="flex justify-between border-b-4 border-black pb-2">
    <span className="text-xs font-bold uppercase bg-[#264653] 
                     text-white px-2 py-1 border-2 border-black">
      Category
    </span>
    <span className="text-sm font-bold text-gray-700">Date</span>
  </div>
  
  {/* Title */}
  <h3 className="text-2xl font-black mb-3 leading-tight">Title</h3>
  
  {/* Excerpt */}
  <p className="text-black font-medium border-l-4 border-black pl-4">
    Excerpt text...
  </p>
  
  {/* Read More */}
  <div className="flex items-center gap-2 font-black text-sm uppercase">
    Read <ArrowRight size={18} strokeWidth={3} />
  </div>
</StickyNote>
```

### Form Input Pattern
```jsx
<input 
  type="email"
  className="w-full bg-white border-4 border-black p-3 
             focus:outline-none 
             focus:shadow-[4px_4px_0px_0px_#000000] 
             font-bold text-lg"
  placeholder="Email Address"
/>
```

---

## 15. Background System

### Reactive Background
The site features an animated parallax background with geometric shapes:

**Shape Types:**
- Circles (filled with pattern-dots)
- Rectangles (filled with pattern-hatch)
- Implicit triangles (filled with pattern-grid)

**Animation Properties:**
- **Mouse parallax**: Shapes drift based on cursor position
- **Scroll parallax**: Shapes move at different speeds while scrolling
- **Ripple effect**: Triggered by interactions (button clicks)
- **Performance**: Uses direct DOM manipulation via refs to avoid React re-renders

**Visual Specs:**
- Opacity: `0.6`
- Stroke: `2px black`
- Sizes: 80-180px
- Speeds: `0.02-0.08` scroll multiplier
- Float factors: `-2` to `2` (mouse parallax strength)

---

## 16. Z-Index Layering

### Stack Order (lowest to highest)

| Layer | Z-Index | Elements |
|-------|---------|----------|
| **Background** | `z-0` | Animated SVG shapes |
| **Content Base** | `z-10` | Main content, cards, sections |
| **Hover Elements** | `z-10` (hover) | Cards on hover state |
| **Sticky Nav** | `z-50` | Header navigation |
| **Tooltips** | `z-50` | Marginalia tooltips |

---

## 17. Special Features

### Reading Mode Toggle
Blog posts feature a **Deep Dive / Skim** toggle:

**Deep Dive Mode:**
- Full article content with marginalia
- Footnotes appear as inline tooltips
- Handwritten font (Comic Sans) for footnotes
- Long-form reading experience

**Skim Mode:**
- Executive summary format
- Key takeaways in numbered list
- Yellow accent background
- Quick consumption focused

### Canvas-Based Experiments
Three interactive experiments showcase different interaction patterns:

1. **Gyro Maze**: Device orientation / touch controls
2. **Life Simulation**: Play/pause animation controls
3. **Fitts's Law Test**: Performance measurement UI

---

## 18. File Structure & Organization

### Component Hierarchy
```
App (Main)
├── Header (Sticky Navigation)
├── ReactiveBackground (Animated shapes)
├── Main Content (Route-based)
│   ├── Hero
│   ├── BlogList → BlogPost
│   ├── About
│   ├── Experiments
│   │   └── ExperimentCard
│   │       ├── MazeGame
│   │       ├── LifeSim
│   │       └── FittsLaw
│   └── Contact
└── Footer
```

### Shared Components
- `TapeButton`
- `StickyNote`
- `SectionTitle`
- `Marginalia`
- `ExperimentCard`
- `PatternDefs` (SVG patterns)

---

## 19. Brand Assets

### Logo Treatment
```
EMILIO.HARRISON
```
- Format: `FIRSTNAME.LASTNAME`
- Typography: Font black, tracking tight
- Accent: Red dot separator (Coral `#e76f51`)
- Hover: Text color shift to gray

### Tagline/Badge
```
"UX Researcher & Creative Technologist"
```
- Style: Mustard background, rotated -2deg
- Border: 2px black
- Typography: Bold, tracking widest, uppercase, xs

---

## 20. Do's and Don'ts

### ✅ Do:
- Use hard-edged, offset shadows exclusively
- Rotate elements within -3° to +3° range
- Maintain 4px border on all primary containers
- Use bold or black font weights (no regular/light)
- Write all labels in UPPERCASE
- Stack layers with consistent shadow direction (down-right)
- Use system fonts for performance
- Provide hover states for all interactive elements

### ❌ Don't:
- Use soft/blurred shadows or gradients
- Rotate elements beyond ±3° (readability suffers)
- Use borders thinner than 2px on major elements
- Use font weights below 500
- Use sentence case for UI labels
- Mix shadow directions
- Add custom fonts without strong justification
- Create interactions without clear visual feedback

---

## 21. Implementation Notes

### CSS Framework
- **Tailwind CSS** (utility-first)
- Custom configuration for brand colors
- Arbitrary values used for precise spacing/colors

### React Patterns
- Functional components with hooks
- `useRef` for performance-critical animations
- `useState` for UI state management
- `useEffect` for lifecycle/side effects
- `useMemo` for expensive computations

### Performance Optimizations
- Direct DOM manipulation for background animations
- `requestAnimationFrame` for smooth 60fps animation
- Passive event listeners for scroll/touch
- ResizeObserver for responsive canvas sizing
- Minimal React re-renders via refs

---

## 22. Future Considerations

### Scalability
- Component library extraction
- Storybook documentation
- Design tokens in JSON format
- Dark mode variant system

### Accessibility Enhancements
- Reduced motion preferences
- High contrast mode
- Screen reader announcements
- Keyboard shortcut system

### Progressive Enhancement
- Touch gesture library
- WebGL background upgrade
- PWA capabilities
- Offline reading mode

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 27, 2025 | Initial design system documentation |

---

**Maintained by:** Emilio Harrison  
**Contact:** hello@emilioharrison.com  
**License:** Proprietary - All Rights Reserved