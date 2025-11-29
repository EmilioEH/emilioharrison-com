# Code Quality Audit Checklist

**Tech Stack**: Astro + React + TailwindCSS + TypeScript + Cloudflare Pages

**Purpose**: Systematic code review checklist for autonomous coding agents to evaluate codebase quality, identify issues, and generate actionable audit reports.

---

## How to Use This Checklist (Agent Instructions)

### Required Reading Before Starting

**CRITICAL**: Before beginning the audit, the agent MUST:

1. **Read `design-system.md`** in its entirety
   - Location: Root directory or `/docs/design-system.md`
   - This document defines the source of truth for:
     - Color palette and theme tokens
     - Typography system (fonts, sizes, weights, line heights)
     - Spacing scale and layout patterns
     - Component library and variants
     - Animation/transition standards
     - Border radius, shadows, and other visual treatments
   - If file doesn't exist: Flag as CRITICAL issue and note that design system compliance cannot be validated

2. **Extract Design System Rules** from the document:
   - Create a checklist of all defined tokens, components, and patterns
   - Note any explicit "do's and don'ts"
   - Identify all component variants and their props
   - Document the approved color palette

3. **Keep `design-system.md` Open** for reference throughout the audit
   - Cross-reference every component against documented patterns
   - Validate all color values against defined tokens
   - Check spacing against the spacing scale
   - Verify typography usage matches the system

### Execution Flow

**Phase 0: Design System Review (5 min)**
1. Locate and read `design-system.md`
2. Extract all design tokens and component specifications
3. Create mental model of the design system

**Phase 1: Pre-Audit Setup & Automated Detection (5-10 min)**
1. Install required audit tools
2. Run automated analysis tools
3. Collect baseline metrics

**Phase 2: Systematic Manual Review (20-40 min)**
1. Work through sections in order (1-8)
2. **Continuously validate against `design-system.md`**
3. Mark items: ✓ (compliant), ✗ (issue found), N/A (not applicable)
4. Document all ✗ items with file paths and descriptions

**Phase 3: Output Generation (5 min)**
1. Create `code-quality-audit-[YYYY-MM-DD].md`
2. Include dedicated "Design System Compliance" section
3. Organize findings by category and priority
4. Provide actionable recommendations

### Review Notation
- ✓ = Compliant / Passes check
- ✗ = Issue found (document in audit file)
- N/A = Not applicable to this project
- ⚠ = Warning / Needs attention but not blocking

### Severity Levels
- **[CRITICAL]**: Breaks functionality, security vulnerabilities, accessibility violations
- **[HIGH]**: Performance issues, maintenance problems, user experience impacts
- **[MEDIUM]**: Code quality, organization, best practices
- **[LOW]**: Documentation, minor optimizations, nice-to-haves

---

## Phase 1: Pre-Audit Setup

### Install Audit Tools

```bash
# Install all required audit tools
npm install -D \
  depcheck \
  knip \
  jscpd \
  eslint-plugin-unused-imports \
  rollup-plugin-visualizer \
  size-limit \
  @size-limit/file
```

### Run Automated Checks

```bash
# Create audit output directory
mkdir -p audit-results

# 0. Design System Analysis (run first)
# Check if design-system.md exists
if [ -f "design-system.md" ]; then
  echo "Design system found: design-system.md" > audit-results/design-system.txt
  echo "\nExtracting color palette..." >> audit-results/design-system.txt
  grep -i "color\|palette\|theme" design-system.md >> audit-results/design-system.txt 2>&1
elif [ -f "docs/design-system.md" ]; then
  echo "Design system found: docs/design-system.md" > audit-results/design-system.txt
  echo "\nExtracting color palette..." >> audit-results/design-system.txt
  grep -i "color\|palette\|theme" docs/design-system.md >> audit-results/design-system.txt 2>&1
else
  echo "ERROR: design-system.md not found in root or docs/" > audit-results/design-system.txt
  echo "Design system compliance cannot be validated!" >> audit-results/design-system.txt
fi

# Extract all color usage from codebase
echo "\nScanning codebase for color usage..." >> audit-results/design-system.txt
grep -r "bg-\|text-\|border-" src/ --include="*.astro" --include="*.jsx" --include="*.tsx" | \
  grep -v "node_modules" > audit-results/color-usage.txt 2>&1

# Extract hex color values
grep -r "#[0-9a-fA-F]\{3,6\}" src/ --include="*.css" --include="*.astro" --include="*.jsx" \
  > audit-results/hex-colors.txt 2>&1

# Extract typography usage
grep -r "font-\|text-xs\|text-sm\|text-base\|text-lg\|text-xl" src/ --include="*.astro" --include="*.jsx" | \
  grep -v "text-\(white\|black\|gray\)" > audit-results/typography-usage.txt 2>&1

# Extract spacing usage
grep -r "p-\|m-\|gap-\|space-" src/ --include="*.astro" --include="*.jsx" \
  > audit-results/spacing-usage.txt 2>&1

# Find arbitrary Tailwind values (potential design system violations)
grep -r "\[.*\]" src/ --include="*.astro" --include="*.jsx" --include="*.tsx" | \
  grep "className\|class=" > audit-results/arbitrary-values.txt 2>&1

# 1. Unused dependencies
npx depcheck > audit-results/depcheck.txt 2>&1

# 2. Unused files and exports
npx knip > audit-results/knip.txt 2>&1

# 3. Duplicate code detection
npx jscpd src/ > audit-results/duplicates.txt 2>&1

# 4. TypeScript strict checking
npx tsc --noEmit --noUnusedLocals --noUnusedParameters > audit-results/typescript.txt 2>&1

# 5. Security audit
npm audit > audit-results/security.txt 2>&1

# 6. Astro type checking
npx astro check > audit-results/astro-check.txt 2>&1

# 7. Build verification
npm run build > audit-results/build.txt 2>&1

# 8. Bundle analysis (if visualizer is configured)
# Results will be in dist/stats.html
```

### Collect Baseline Metrics

```bash
# Count files
echo "Total files:" > audit-results/metrics.txt
find src/ -type f | wc -l >> audit-results/metrics.txt

# Count lines of code
echo "\nLines of code:" >> audit-results/metrics.txt
find src/ -name "*.astro" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.ts" | xargs wc -l >> audit-results/metrics.txt

# Bundle size
echo "\nBundle size:" >> audit-results/metrics.txt
du -sh dist/ >> audit-results/metrics.txt

# Dependencies count
echo "\nDependencies:" >> audit-results/metrics.txt
cat package.json | grep -A 9999 "dependencies" | grep ":" | wc -l >> audit-results/metrics.txt

# Design System Metrics
echo "\n=== DESIGN SYSTEM METRICS ===" >> audit-results/metrics.txt

echo "\nTotal color usages:" >> audit-results/metrics.txt
wc -l < audit-results/color-usage.txt >> audit-results/metrics.txt

echo "\nTotal hex color values:" >> audit-results/metrics.txt
wc -l < audit-results/hex-colors.txt >> audit-results/metrics.txt

echo "\nTotal arbitrary Tailwind values:" >> audit-results/metrics.txt
wc -l < audit-results/arbitrary-values.txt >> audit-results/metrics.txt

echo "\nUI Components:" >> audit-results/metrics.txt
find src/components/ui -type f 2>/dev/null | wc -l >> audit-results/metrics.txt

echo "\nDesign system file:" >> audit-results/metrics.txt
if [ -f "design-system.md" ]; then
  echo "✓ Found at root" >> audit-results/metrics.txt
elif [ -f "docs/design-system.md" ]; then
  echo "✓ Found in docs/" >> audit-results/metrics.txt
else
  echo "✗ NOT FOUND" >> audit-results/metrics.txt
fi
```

---

## 1. Foundation & Static Analysis [HIGH]

### 1.1 Automated Tool Results

Review output from automated tools:

- [ ] **Depcheck**: No unused dependencies found
  - Check: `audit-results/depcheck.txt`
  - Action: Remove any unused packages from `package.json`

- [ ] **Knip**: No unused files or dead exports
  - Check: `audit-results/knip.txt`
  - Action: Remove unused files and exports

- [ ] **JSCPD**: Duplicate code < 5% of codebase
  - Check: `audit-results/duplicates.txt`
  - Target: < 5% duplication ratio
  - Action: Refactor duplicates into shared utilities

- [ ] **TypeScript**: No type errors or unused code
  - Check: `audit-results/typescript.txt`
  - Action: Fix type errors and remove unused variables

- [ ] **npm audit**: No high/critical security vulnerabilities
  - Check: `audit-results/security.txt`
  - Action: Update vulnerable packages

- [ ] **Astro check**: Passes type validation
  - Check: `audit-results/astro-check.txt`
  - Action: Fix Astro-specific type issues

- [ ] **Build**: Completes without errors
  - Check: `audit-results/build.txt`
  - Action: Fix build errors before proceeding

### 1.2 TypeScript Quality [HIGH]

- [ ] **Strict mode enabled**: `tsconfig.json` has `"strict": true`
- [ ] **No implicit any**: All variables have explicit types
- [ ] **Props interfaces**: All components have TypeScript interfaces for props
  ```typescript
  interface ButtonProps {
    variant: 'primary' | 'secondary';
    children: React.ReactNode;
    onClick?: () => void;
  }
  ```
- [ ] **Content Collections**: Schemas defined in `src/content/config.ts` with Zod
- [ ] **Type imports**: Use `import type` for type-only imports
- [ ] **No type assertions**: Avoid `as` casts unless absolutely necessary
- [ ] **Enum usage**: Use string literal unions over enums
- [ ] **Return types**: Explicit return types on exported functions

**Metrics:**
- Target: 0 `any` types outside of `node_modules`
- Check: `grep -r "any" src/ --include="*.ts" --include="*.tsx"`

### 1.3 Dependencies [MEDIUM]

- [ ] **Minimal dependency count**: < 30 production dependencies
  - Current count: `cat package.json | grep -A 9999 "\"dependencies\"" | grep ":" | wc -l`
- [ ] **No overlapping functionality**: Each dependency serves unique purpose
- [ ] **Modern packages**: All packages updated within last 12 months
  - Check: `npm outdated`
- [ ] **Correct categorization**: Dev tools in `devDependencies`
- [ ] **No deprecated packages**: Check npm warnings during install
- [ ] **Lightweight alternatives**: Large packages replaced where possible
  - Example: `date-fns` over `moment`, `dayjs` over `moment`
- [ ] **Tree-shakeable imports**: Use named imports from modular packages
  ```javascript
  // Good
  import { format } from 'date-fns';
  // Avoid
  import _ from 'lodash'; // Prefer lodash-es for tree-shaking
  ```

**Metrics:**
- Total dependencies: [AUTO-FILL from metrics.txt]
- Bundle size impact: Check `dist/stats.html` if available

---

## 2. Architecture & Structure [MEDIUM]

### 2.1 File Organization [MEDIUM]

- [ ] **Clear directory structure**:
  ```
  src/
  ├── pages/          # Route-based pages (file-based routing)
  ├── components/     # Reusable components
  │   └── ui/         # Atomic UI components (BrutalButton, BrutalCard, etc.)
  ├── layouts/        # Layout wrappers (Layout.astro, etc.)
  ├── lib/            # Utilities, stores, themes, business logic
  ├── content/        # Content collections (markdown/mdx files)
  │   └── config.ts   # Content collection schemas
  └── assets/         # Images and static assets (processed by Astro)
  public/             # Static files (copied as-is)
  ```

- [ ] **Naming conventions**:
  - PascalCase: Components (`BlogList.jsx`, `Layout.astro`)
  - camelCase: Utilities, stores, functions (`themes.js`, `formatDate.ts`)
  - kebab-case: Routes and content slugs (`/field-notes/`, `my-post.md`)

- [ ] **Colocation**: Related files grouped together
  - Example: `Button.jsx`, `Button.test.jsx`, `button.stories.jsx` in same directory

- [ ] **Maximum nesting depth**: ≤ 3 levels deep
  - Avoid: `src/components/layout/header/navigation/mobile/MobileMenu.jsx`
  - Prefer: `src/components/ui/MobileMenu.jsx` or `src/components/MobileMenu.jsx`

- [ ] **No orphaned files**: Every file in `src/` is imported somewhere
  - Verified by: `audit-results/knip.txt`

**Audit Action:**
- Document any files in wrong directories
- Flag deeply nested structures (>3 levels)
- Identify orphaned files

### 2.2 Code Organization & Maintainability [MEDIUM]

- [ ] **Single Responsibility Principle**: Each component/function has one clear purpose
- [ ] **DRY (Don't Repeat Yourself)**: No duplicate logic
  - Measured by: `audit-results/duplicates.txt` (<5% duplication)
- [ ] **Separation of concerns**:
  - Astro components: Layout, structure, server-side logic
  - React components: Client-side interactivity only
  - TailwindCSS: All styling
  - Nanostores: Shared state management
  - `src/lib/`: Pure business logic and utilities

- [ ] **Function complexity**: Functions ≤ 50 lines
  - Check: `find src/ -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | xargs -I {} sh -c 'echo "File: {}"; grep -c "^" {} | awk "{if (\$1 > 300) print \"WARNING: Long file\"}"'`

- [ ] **File length**: Files ≤ 400 lines
  - Exceptions: Configuration files, generated code

- [ ] **Conditional nesting**: Maximum 3 levels deep
  ```javascript
  // Avoid
  if (a) {
    if (b) {
      if (c) {
        if (d) { // Too deep!
          // ...
        }
      }
    }
  }
  ```

- [ ] **Magic numbers**: No hard-coded values
  ```javascript
  // Bad
  if (width > 768) { ... }
  
  // Good
  const TABLET_BREAKPOINT = 768;
  if (width > TABLET_BREAKPOINT) { ... }
  ```

- [ ] **Comments for complex logic**: Non-obvious code is documented
  - Focus on: Astro frontmatter queries, React state management, algorithm logic

- [ ] **Consistent patterns**: Similar problems solved similarly across codebase

**Metrics:**
- Average function length: [Calculate from codebase]
- Files >400 lines: [List them]
- Cyclomatic complexity: Use ESLint `complexity` rule if configured

### 2.3 Astro-Specific Quality [HIGH]

- [ ] **Proper frontmatter usage**:
  ```astro
  ---
  // Type-safe imports at top
  import { getCollection } from 'astro:content';
  import Layout from '@/layouts/Layout.astro';
  
  // Clear data fetching
  const posts = await getCollection('blog');
  
  // Props destructuring with types
  interface Props {
    title: string;
  }
  const { title } = Astro.props;
  ---
  ```

- [ ] **Content Collections over Astro.glob()**: Use Content Collections API
  - Prefer: `getCollection('blog')` over `Astro.glob('../pages/blog/*.md')`

- [ ] **Props validation**: TypeScript interfaces for all Astro components
  ```astro
  ---
  interface Props {
    title: string;
    description?: string;
    image?: ImageMetadata;
  }
  type Props = astroHTML.JSX.IntrinsicElements['div'] & { customProp: string };
  ---
  ```

- [ ] **Slot usage**: Proper use of `<slot />` for composition
  ```astro
  <div class="card">
    <slot name="header" />
    <slot /> <!-- default slot -->
    <slot name="footer" />
  </div>
  ```

- [ ] **Client directives justified**: Each `client:*` has documented reason
  - `client:load`: Critical, immediately visible interactivity
  - `client:idle`: Deferred, non-critical widgets
  - `client:visible`: Below-the-fold interactive elements
  - `client:only`: Framework-specific components that can't be server-rendered

- [ ] **Minimal client-side JS**: Most pages ship zero JavaScript
  - Target: >80% of pages are static HTML only
  - Check: Build output, look for `.js` files per route

- [ ] **Component islands**: Interactive components are small and focused
  - Each island < 50KB hydrated

**Audit Action:**
- List all `client:load` usages and verify they're necessary
- Document any use of `Astro.glob()` that should be Content Collections
- Flag components without proper Props interfaces

### 2.4 Astro + React Integration [HIGH]

- [ ] **React usage minimized**: Astro components used by default
  - Rule: Use React ONLY when client-side interactivity is required

- [ ] **Shared state via Nanostores**: Not React Context
  ```javascript
  // src/lib/store.js
  import { atom } from 'nanostores';
  export const themeStore = atom('light');
  
  // In React component
  import { useStore } from '@nanostores/react';
  import { themeStore } from '@/lib/store';
  
  function ThemeToggle() {
    const theme = useStore(themeStore);
    // ...
  }
  ```

- [ ] **Serializable props only**: No functions passed from Astro to React
  ```astro
  ---
  // Bad
  const handleClick = () => console.log('clicked');
  ---
  <ReactComponent onClick={handleClick} /> <!-- Will fail -->
  
  ---
  // Good - handle events inside React component
  ---
  <ReactComponent initialValue="hello" />
  ```

- [ ] **CSS coordination**: TailwindCSS classes work in both Astro and React
  - Verify: Same class names produce same styles

- [ ] **Hydration strategy documented**: Each React component has clear hydration reason
  ```astro
  <!-- Interactive form - needs immediate interactivity -->
  <ContactForm client:load />
  
  <!-- Theme switcher - can wait for idle -->
  <ThemeToggle client:idle />
  
  <!-- Newsletter signup below fold - only load when visible -->
  <Newsletter client:visible />
  ```

**Metrics:**
- React components vs Astro components ratio: [Calculate]
- Target: <20% of components are React

---

## 3. Code Implementation [MEDIUM-HIGH]

### 3.1 HTML Quality [MEDIUM]

- [ ] **Valid HTML**: No unclosed tags, proper nesting
  - Verify: Build completes without HTML warnings

- [ ] **No deprecated elements**: Avoid `<font>`, `<center>`, `<marquee>`, `<blink>`

- [ ] **Proper document structure** (in `Layout.astro` or base layout):
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="...">
    <title>Page Title</title>
  </head>
  <body>
    <!-- content -->
  </body>
  </html>
  ```

- [ ] **Descriptive class names**: Semantic and consistent
  - Follow TailwindCSS conventions
  - Use BEM or similar for custom classes

- [ ] **Minimal inline styles**: Use TailwindCSS utilities
  - Inline styles only for dynamic values (e.g., `style={{ width: `${percent}%` }}`)

- [ ] **JSX vs HTML syntax**:
  - React: `className`, `htmlFor`, camelCase attributes
  - Astro: `class`, `for`, lowercase attributes

**Audit Action:**
- Flag any deprecated HTML elements
- List files with excessive inline styles (>3 inline style attributes)

### 3.2 CSS Quality (TailwindCSS) [MEDIUM]

**Note**: All CSS must comply with `design-system.md`. Cross-reference color, spacing, and typography choices against the design system throughout this section.

- [ ] **Utility-first approach**: Leverage Tailwind over custom CSS
  - Custom CSS limited to `src/index.css` (Tailwind directives only)

- [ ] **Theme integration**: Use design tokens from `src/lib/themes.js` AND `design-system.md`
  ```javascript
  // Dynamic theme classes should match design system
  <div className={`bg-${theme}-primary text-${theme}-text`}>
  ```
  - **Validate**: Theme tokens match colors defined in design-system.md

- [ ] **CSS variables defined**: In `tailwind.config.js` or theme object
  ```javascript
  theme: {
    extend: {
      colors: {
        // These should match design-system.md color palette
        'brutal-primary': 'var(--color-primary)',
      }
    }
  }
  ```
  - **Validate**: All CSS variables defined in config match design-system.md

- [ ] **Color usage compliance**:
  - [ ] Every color class references design system tokens
  - [ ] No hard-coded color values (e.g., `bg-blue-500` if not in design system)
  - [ ] No arbitrary color values (e.g., `bg-[#ff0000]`) unless documented exception
  - **Validation**: Cross-reference all colors against design-system.md palette

- [ ] **Mobile-first responsive**: Use `md:`, `lg:`, `xl:` breakpoints appropriately
  ```html
  <!-- Base styles for mobile, then layer up -->
  <div class="p-4 md:p-6 lg:p-8">
  ```
  - **Validate**: Breakpoints match design-system.md responsive specifications

- [ ] **No unused Tailwind classes**: Verified by purge configuration
  - Check: `tailwind.config.js` has correct `content` paths
  ```javascript
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'
  ],
  ```

- [ ] **Consistent spacing**: Use Tailwind's spacing scale (rem-based)
  - Avoid: `p-[13px]` arbitrary values unless documented in design-system.md
  - Prefer: `p-3` (0.75rem), `p-4` (1rem), etc.
  - **Validate**: Spacing scale matches design-system.md spacing system

- [ ] **Typography consistency**:
  - [ ] Font families match design-system.md specifications
  - [ ] Font sizes use approved scale from design system
  - [ ] Font weights consistent with design system
  - **Validation**: All `font-*` and `text-*` classes reference design system

- [ ] **Border radius compliance**:
  - [ ] All `rounded-*` values match design-system.md
  - [ ] No arbitrary radius values unless justified
  - **Validation**: Check design-system.md for approved border-radius scale

- [ ] **Shadow usage**:
  - [ ] All `shadow-*` classes match design-system.md
  - [ ] No custom shadow values outside design system
  - **Validation**: Verify shadows against design system specifications

- [ ] **Specificity management**: Avoid `!important` unless overriding third-party
  - Use Tailwind's built-in specificity (later classes win)

- [ ] **Typography plugin**: Use `@tailwindcss/typography` for prose content
  ```html
  <article class="prose lg:prose-xl">
    <!-- Markdown content -->
  </article>
  ```
  - **Validate**: Prose styling aligns with design-system.md typography

- [ ] **Theme consistency**: All components use theme-aware classes
  - No hard-coded colors like `bg-blue-500` if theme system exists
  - **Validate**: Theme tokens exist in design-system.md

**Metrics:**
- Custom CSS lines: `wc -l src/index.css` (target: <100 lines excluding Tailwind directives)
- Arbitrary values: `grep -r "\[.*\]" src/ | wc -l` (target: <10 uses)
- Colors not in design system: [Document count]

**Audit Action:**
- List any custom CSS beyond Tailwind directives
- Flag inconsistent color usage (non-theme colors)
- **Document all colors used and validate against design-system.md**
- **List all arbitrary spacing/sizing values**
- **Verify typography scale matches design system**
- **Check border-radius and shadow usage against design system**

### 3.3 JavaScript/TypeScript Quality [HIGH]

- [ ] **Modern ES6+ syntax**: Arrow functions, destructuring, template literals
  ```javascript
  // Prefer modern syntax
  const greet = (name) => `Hello, ${name}!`;
  const { id, title } = post;
  ```

- [ ] **Error handling**: Try-catch for async operations
  ```javascript
  try {
    const data = await fetch('/api/data');
    const json = await data.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    // Handle error appropriately
  }
  ```

- [ ] **No console.log in production**: Remove debug statements
  - Check: `grep -r "console.log" src/`
  - Exception: Intentional logging in error handlers

- [ ] **React best practices**:
  - [ ] Proper hooks usage (`useState`, `useEffect`, `useRef`)
  - [ ] Effect cleanup functions
    ```javascript
    useEffect(() => {
      const timer = setInterval(() => {...}, 1000);
      return () => clearInterval(timer); // Cleanup
    }, []);
    ```
  - [ ] Memoization where appropriate (`useMemo`, `useCallback`)
    - Only when expensive calculations or preventing child re-renders

- [ ] **Nanostores for shared state**: Cross-component state via `nanostores`
  ```javascript
  // Avoid prop drilling
  // Use nanostores for app-wide state
  import { atom } from 'nanostores';
  export const cartStore = atom([]);
  ```

- [ ] **Event listeners**: Properly attached and cleaned up
  - React: Use `useEffect` with cleanup
  - Astro: Use `<script>` tags or client components

- [ ] **No memory leaks**: Clean up intervals, listeners, subscriptions
  - Check: All `setInterval`, `setTimeout`, `addEventListener` have cleanup

- [ ] **Minimal dependencies**: Regular review and removal of unused packages

- [ ] **Graceful degradation**: Core content works without client-side JS
  - Test: Disable JavaScript in browser, verify content is accessible

**Metrics:**
- Console statements in production code: `grep -r "console\." src/ --exclude-dir=node_modules | wc -l`
- Target: 0 (except in error handlers)

**Audit Action:**
- List all `console.log/warn/error` statements
- Flag useEffect hooks without cleanup returns
- Document any memory leak risks

---

## 4. Content & Data [MEDIUM]

### 4.1 Content Management (Content Collections) [MEDIUM]

- [ ] **Type-safe schemas**: Defined in `src/content/config.ts` with Zod
  ```typescript
  import { defineCollection, z } from 'astro:content';
  
  const blog = defineCollection({
    schema: z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.date(),
      author: z.string(),
      image: z.string().optional(),
      tags: z.array(z.string()).default([]),
    }),
  });
  
  export const collections = { blog };
  ```

- [ ] **Markdown quality**:
  - [ ] Valid frontmatter YAML (no syntax errors)
  - [ ] Consistent formatting (use Prettier)
  - [ ] Optimized image references (use Astro assets)
    ```markdown
    ---
    title: "My Post"
    image: "../../assets/hero.jpg"  # Relative path for optimization
    ---
    ```

- [ ] **Collection organization**: Separate collections for different content types
  ```
  src/content/
  ├── blog/
  ├── fieldnotes/
  ├── case-studies/
  └── config.ts
  ```

- [ ] **Slug generation**: Consistent slug strategy
  - Auto-generated from filename, or
  - Manually defined in frontmatter

- [ ] **Image handling**: Store in `src/assets/`, reference via imports
  ```astro
  ---
  import { Image } from 'astro:assets';
  import heroImage from '@/assets/hero.jpg';
  ---
  <Image src={heroImage} alt="Hero" />
  ```

**Audit Action:**
- Verify all content collections have schemas
- Check for markdown files with invalid frontmatter
- List images in `public/` that should be in `src/assets/`

### 4.2 Design System Compliance [HIGH]

**CRITICAL**: This section requires continuous validation against `design-system.md`. The agent must have already read this file in Phase 0.

#### Design System Validation Process

For each component and style in the codebase:
1. **Identify the pattern** (button, card, typography, color usage, etc.)
2. **Locate specification** in `design-system.md`
3. **Compare implementation** to specification
4. **Document deviations** as issues

#### Color Palette Compliance

- [ ] **Extract color palette** from `design-system.md`
  - List all approved color tokens (e.g., `brutal-yellow`, `brutal-black`, `theme-primary`)
  - Note any color value specifications (hex, RGB, CSS variables)

- [ ] **Scan codebase for color usage**:
  ```bash
  # Find all color classes
  grep -r "bg-\|text-\|border-" src/ --include="*.astro" --include="*.jsx" --include="*.tsx" | \
    grep -v "node_modules" > audit-results/color-usage.txt
  
  # Find hex color values
  grep -r "#[0-9a-fA-F]\{3,6\}" src/ --include="*.css" --include="*.astro" --include="*.jsx" > audit-results/hex-colors.txt
  ```

- [ ] **Validate all colors** against design system:
  - Every `bg-*`, `text-*`, `border-*` class should use tokens from design system
  - No arbitrary color values (e.g., `bg-[#ff0000]`) unless justified
  - No hard-coded hex values in components

- [ ] **Flag deviations**:
  ```markdown
  Issue: Color not in design system
  File: src/components/Button.jsx
  Found: `bg-purple-600`
  Design System: Only allows brutal-yellow, brutal-black, theme-primary, theme-secondary
  Recommendation: Replace with `bg-theme-primary` or document why purple is needed
  ```

**Audit Action:**
- List every unique color value found in codebase
- Cross-reference each against design-system.md
- Document all non-standard colors

#### Typography System Compliance

- [ ] **Extract typography scale** from `design-system.md`
  - Font families
  - Font sizes (text-xs, text-sm, text-base, text-lg, etc.)
  - Font weights (font-normal, font-bold, etc.)
  - Line heights
  - Letter spacing

- [ ] **Scan for typography usage**:
  ```bash
  # Find font classes
  grep -r "font-\|text-" src/ --include="*.astro" --include="*.jsx" | \
    grep -v "text-\(white\|black\|gray\)" > audit-results/typography-usage.txt
  ```

- [ ] **Validate font usage**:
  - All font families match design system
  - Font sizes use approved scale
  - Font weights are consistent with system
  - No arbitrary text sizes (e.g., `text-[17px]`)

- [ ] **Heading hierarchy** matches design system specifications:
  - `<h1>` through `<h6>` styling defined and followed
  - Consistent sizing and weight across pages

**Audit Action:**
- List all font-family declarations
- List all unique text size classes
- Flag any deviations from design system typography

#### Spacing & Layout Compliance

- [ ] **Extract spacing scale** from `design-system.md`
  - Approved spacing values (Tailwind scale or custom)
  - Layout patterns (container widths, grid systems)
  - Padding/margin standards

- [ ] **Scan for spacing usage**:
  ```bash
  # Find spacing classes
  grep -r "p-\|m-\|gap-\|space-" src/ --include="*.astro" --include="*.jsx" > audit-results/spacing-usage.txt
  ```

- [ ] **Validate spacing**:
  - All spacing uses design system scale
  - No arbitrary values (e.g., `p-[13px]`) unless justified
  - Consistent spacing patterns across similar components

- [ ] **Layout patterns** match design system:
  - Container max-widths
  - Grid column counts
  - Responsive breakpoints

**Audit Action:**
- List all unique spacing values
- Flag arbitrary spacing values
- Verify layout patterns match design system

#### Component Library Compliance

- [ ] **Extract component specifications** from `design-system.md`:
  - List all documented components (BrutalButton, BrutalCard, etc.)
  - Note component variants and props
  - Document usage examples and restrictions

- [ ] **Inventory all UI components** in codebase:
  ```bash
  # List all components in ui directory
  find src/components/ui -name "*.jsx" -o -name "*.astro" -o -name "*.tsx"
  ```

- [ ] **Cross-reference components**:
  - Every component in `src/components/ui/` should be documented in design-system.md
  - Component implementations should match specifications
  - Props should match documented API

- [ ] **Validate component usage**:
  ```bash
  # Find all button usages
  grep -r "<Button\|<BrutalButton" src/ --include="*.astro" --include="*.jsx"
  
  # Find all card usages
  grep -r "<Card\|<BrutalCard" src/ --include="*.astro" --include="*.jsx"
  ```

- [ ] **Check for one-off components**:
  - Identify components that duplicate design system components
  - Flag similar-looking components that should be consolidated
  - Find "Button2", "CustomButton" that should use BrutalButton

**Audit Action:**
- List all components in `src/components/ui/`
- Check if each is documented in design-system.md
- Find duplicate or similar components
- Document undocumented components

#### Visual Treatment Compliance

- [ ] **Border radius** matches design system:
  - Extract: `rounded-*` values from design-system.md
  - Validate: All border-radius uses approved values
  - Flag: Arbitrary values like `rounded-[13px]`

- [ ] **Shadows** match design system:
  - Extract: `shadow-*` definitions
  - Validate: Component shadows use design tokens
  - Flag: Custom shadow values

- [ ] **Transitions/animations** follow standards:
  - Extract: Animation timing, easing functions
  - Validate: Transitions use design system values
  - Flag: Arbitrary durations or easing

**Audit Action:**
- List all unique border-radius values
- List all shadow implementations
- Document animation/transition patterns

#### Ad-hoc Style Detection

- [ ] **Identify style deviations**:
  ```bash
  # Find arbitrary values (likely ad-hoc styles)
  grep -r "\[.*\]" src/ --include="*.astro" --include="*.jsx" | \
    grep "className\|class=" > audit-results/arbitrary-values.txt
  ```

- [ ] **Flag inline styles**:
  ```bash
  # Find inline style attributes
  grep -r "style={{" src/ --include="*.jsx" --include="*.tsx" > audit-results/inline-styles.txt
  ```

- [ ] **Custom CSS audit**:
  ```bash
  # Find custom CSS files
  find src/ -name "*.css" -not -path "*/node_modules/*"
  
  # Check for custom styles outside Tailwind directives
  ```

**Audit Action:**
- Document all arbitrary Tailwind values with justification check
- List all inline styles (should be minimal)
- Review custom CSS files for design system violations

#### Design System Documentation Updates

- [ ] **Identify new patterns** not in design-system.md:
  - New components created
  - New color combinations
  - New spacing patterns
  - New typography usage

- [ ] **Recommendation**: Update design-system.md to include:
  - Any new components that have been added
  - Any new patterns that are being used consistently
  - Any approved one-off solutions

**Audit Action:**
- List all UI components not documented in design-system.md
- Recommend which should be added to the design system
- Flag which should be refactored to use existing design system components

---

#### Design System Compliance Metrics

**Target Metrics:**
- Color compliance: 100% (all colors from design system)
- Typography compliance: 100% (all fonts/sizes from system)
- Component usage: >90% (most components use design system)
- Arbitrary values: <5% of total style declarations
- Custom CSS: <100 lines outside design system

**Calculation:**
```bash
# Total color usages
total_colors=$(grep -r "bg-\|text-\|border-" src/ | wc -l)

# Non-design-system colors (manual review needed)
# Document as: compliant_colors / total_colors = compliance_rate
```

---

## 5. User-Facing Quality [HIGH-CRITICAL]

### 5.1 Accessibility (Code Implementation) [CRITICAL]

- [ ] **Semantic HTML**: Use semantic elements
  ```html
  <nav>, <main>, <article>, <section>, <aside>, <header>, <footer>
  ```

- [ ] **Heading hierarchy**: Single `<h1>`, logical `<h2>`-`<h6>` structure
  - No skipped levels (h1 → h3 without h2)
  - Check: Each page has exactly one `<h1>`

- [ ] **Alt text for images**: All `<img>` and `<Image>` components have `alt`
  ```astro
  <Image src={hero} alt="Descriptive text for screen readers" />
  ```
  - Decorative images: `alt=""`

- [ ] **ARIA labels**: Where semantic HTML isn't sufficient
  ```html
  <button aria-label="Close menu">
    <IconX /> <!-- Icon without text -->
  </button>
  ```

- [ ] **Keyboard navigation**:
  - [ ] All interactive elements focusable (buttons, links, inputs)
  - [ ] Focus states visible (use `focus-visible:` in Tailwind)
  - [ ] Logical tab order (use `tabindex` sparingly, prefer natural DOM order)
  - [ ] No keyboard traps

- [ ] **Skip-to-content link**: For screen readers
  ```html
  <a href="#main-content" class="sr-only focus:not-sr-only">
    Skip to content
  </a>
  ```

- [ ] **Form labels**: Properly associated with inputs
  ```jsx
  <label htmlFor="email">Email</label>
  <input id="email" type="email" />
  ```

- [ ] **Client directives accessibility**: Interactive islands maintain focus
  - Test: Tab through interactive components before and after hydration

- [ ] **Color contrast**: WCAG AA minimum (4.5:1 for normal text, 3:1 for large)
  - Use contrast checker on all theme combinations

- [ ] **No reliance on color alone**: Use icons, text, patterns in addition to color

**Testing:**
```bash
# Automated accessibility testing (add to package.json)
npm install -D @axe-core/cli
npx axe http://localhost:4321 --exit
```

**Metrics:**
- Missing alt text: `grep -r "<img" src/ --include="*.astro" --include="*.jsx" | grep -v "alt=" | wc -l`
- Target: 0

**Audit Action:**
- Test keyboard navigation through all interactive elements
- Run axe or similar accessibility scanner
- Document all accessibility violations with severity

### 5.2 Performance [HIGH]

- [ ] **Zero-JS by default**: Most pages ship no JavaScript
  - Verify: Check `dist/` folder for `.js` files per route

- [ ] **Client directives**: Only when necessary
  - [ ] `client:load`: <3 uses per page (critical interactivity only)
  - [ ] `client:idle`: Preferred for non-critical widgets
  - [ ] `client:visible`: Use for below-the-fold content

- [ ] **Optimized images**: All images use Astro Image API
  ```astro
  import { Image, Picture } from 'astro:assets';
  
  <!-- Automatic format conversion, resizing, lazy loading -->
  <Image src={myImage} alt="..." />
  <Picture src={myImage} formats={['avif', 'webp']} alt="..." />
  ```

- [ ] **Lazy loading**: Images and components below fold
  - Images: Automatic with Astro Image
  - Components: `client:visible` directive

- [ ] **Minified CSS**: Automatic via Astro build

- [ ] **TailwindCSS purging**: Unused classes removed
  - Verify: `tailwind.config.js` content paths are correct
  - Check: `dist/` CSS file size is small

- [ ] **Efficient hydration strategy**:
  - Prefer: `client:idle` > `client:visible` > `client:load`
  - Avoid: `client:load` unless critical

- [ ] **No render-blocking resources**: Astro inlines critical CSS automatically

- [ ] **Font loading strategy**:
  ```html
  <!-- Use font-display: swap -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="..." media="print" onload="this.media='all'">
  
  <!-- Or use @fontsource packages -->
  ```

- [ ] **Static generation**: Leverage SSG for all non-dynamic pages
  - Astro default: All pages pre-rendered at build time

- [ ] **Content Collections performance**: Efficient queries
  ```astro
  ---
  // Good: Filter early
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  
  // Avoid: Load all, then filter
  const allPosts = await getCollection('blog');
  const posts = allPosts.filter(p => !p.data.draft);
  ---
  ```

**Performance Budget:**
- Lighthouse Performance Score: >90
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Total Blocking Time: <200ms
- Cumulative Layout Shift: <0.1
- Bundle size per page: <100KB (gzipped)

**Metrics:**
```bash
# Run Lighthouse
npx lighthouse http://localhost:4321 --output html --output-path ./audit-results/lighthouse.html

# Check bundle size
du -sh dist/
```

**Audit Action:**
- Run Lighthouse on 5 representative pages
- Document all scores < 90
- List all `client:load` uses and justify each
- Identify large JavaScript bundles (>50KB)

### 5.3 Cross-Browser Compatibility [MEDIUM]

- [ ] **Modern browser support**: Chrome, Safari, Firefox, Edge (last 2 versions)

- [ ] **Astro SSG**: Static HTML works universally (no browser-specific code)

- [ ] **TailwindCSS autoprefixer**: Automatic via PostCSS
  - Verify: `postcss.config.js` or `postcss.config.cjs` includes autoprefixer

- [ ] **Fallbacks for modern CSS**: Use `@supports` where needed
  ```css
  @supports (display: grid) {
    .container { display: grid; }
  }
  ```

- [ ] **Tested on desktop and mobile browsers**: Manual testing checklist
  - Chrome (Desktop + Mobile)
  - Safari (Desktop + iOS)
  - Firefox
  - Edge

**Testing Checklist:**
- [ ] Layout renders correctly
- [ ] Interactive components work
- [ ] Forms submit properly
- [ ] Theme switching functions
- [ ] Images load and display

### 5.4 SEO Fundamentals [HIGH]

- [ ] **Pre-rendered HTML**: Astro SSG provides SEO-friendly HTML by default

- [ ] **Title tags**: Unique, descriptive `<title>` per page
  ```astro
  ---
  const { title } = Astro.props;
  ---
  <title>{title} | Site Name</title>
  ```

- [ ] **Meta descriptions**: Pass to layout or define in frontmatter
  ```astro
  <meta name="description" content={description} />
  ```

- [ ] **Heading structure**: Logical hierarchy in content

- [ ] **Descriptive URLs**: Leverage file-based routing
  - Good: `/fieldnotes/my-post`
  - Avoid: `/post?id=123`

- [ ] **Image alt attributes**: Required for SEO and accessibility

- [ ] **Open Graph tags**: Social media previews
  ```html
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={image} />
  <meta property="og:url" content={canonicalURL} />
  ```

- [ ] **Schema markup**: JSON-LD for structured data
  ```html
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Your Name",
    "url": "https://yoursite.com"
  }
  </script>
  ```

- [ ] **Sitemap**: Add `@astrojs/sitemap` integration
  ```javascript
  // astro.config.mjs
  import sitemap from '@astrojs/sitemap';
  
  export default defineConfig({
    site: 'https://yoursite.com',
    integrations: [sitemap()],
  });
  ```

- [ ] **robots.txt**: Include in `public/` directory
  ```
  User-agent: *
  Allow: /
  
  Sitemap: https://yoursite.com/sitemap-index.xml
  ```

- [ ] **Canonical URLs**: Prevent duplicate content issues
  ```astro
  <link rel="canonical" href={canonicalURL} />
  ```

**Audit Action:**
- Check first 5 pages for unique titles and descriptions
- Verify sitemap generates correctly (`/sitemap-index.xml`)
- Test Open Graph tags with social media validators

---

## 6. Production Readiness [CRITICAL]

### 6.1 Security [CRITICAL]

- [ ] **HTTPS enabled**: Via Cloudflare Pages (automatic)

- [ ] **No exposed secrets**: API keys in environment variables
  - Local: `.env` files (gitignored)
  - Production: Cloudflare Pages dashboard
  - Check: `grep -r "api_key\|secret\|password" src/ --ignore-case`

- [ ] **Sanitized inputs**: Validate/sanitize on server
  - Astro endpoints: Validate all input
  - Forms: Server-side validation required

- [ ] **Content Security Policy**: Configure headers
  ```
  # public/_headers
  /*
    Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
    X-Frame-Options: DENY
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
  ```

- [ ] **No inline scripts with user data**: Avoid XSS vulnerabilities
  - Use Astro `<script>` tags or external modules
  - Never: `<script>{userProvidedData}</script>`

- [ ] **Dependencies up to date**: No known vulnerabilities
  - Run: `npm audit` (check `audit-results/security.txt`)
  - Fix: `npm audit fix`

- [ ] **XSS prevention**: Astro auto-escapes variables
  - Use `set:html` cautiously, only with trusted content
  ```astro
  <div>{userInput}</div> <!-- Safe: Auto-escaped -->
  <div set:html={trustedHTML} /> <!-- Unsafe: Only for trusted content -->
  ```

- [ ] **CORS configuration**: Manage via Cloudflare Pages or `_headers`
  ```
  /api/*
    Access-Control-Allow-Origin: https://yourdomain.com
  ```

**Security Checklist:**
- [ ] No hardcoded credentials
- [ ] All API calls use HTTPS
- [ ] User input validated before processing
- [ ] No critical npm audit warnings

**Audit Action:**
- Review `audit-results/security.txt`
- Search codebase for potential secrets
- Document all high/critical vulnerabilities

### 6.2 Error Handling & Resilience [HIGH]

- [ ] **Custom 404 page**: `src/pages/404.astro` with helpful message
  ```astro
  ---
  import Layout from '@/layouts/Layout.astro';
  ---
  <Layout title="404 - Page Not Found">
    <h1>Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">Return Home</a>
  </Layout>
  ```

- [ ] **Broken images**: Fallback images or error handling
  ```astro
  <Image src={image} alt="..." onerror="this.src='/fallback.jpg'" />
  ```

- [ ] **External links**: Security attributes
  ```html
  <a href="https://external.com" target="_blank" rel="noopener noreferrer">
  ```

- [ ] **Form validation**:
  - [ ] Client-side: Astro/React validation for UX
  - [ ] Server-side: Required for security (validate in Astro endpoints)
  ```astro
  ---
  // src/pages/api/contact.ts
  export async function post({ request }) {
    const data = await request.formData();
    const email = data.get('email');
    
    if (!email || !email.includes('@')) {
      return new Response('Invalid email', { status: 400 });
    }
    // Process form...
  }
  ---
  ```

- [ ] **No console errors**: Test in browser console
  - Check: Build site, navigate through pages, open console

- [ ] **Fallback content**: For client components, provide server-rendered HTML
  ```astro
  <InteractiveWidget client:idle>
    <!-- Fallback content shown before hydration -->
    <div>Loading...</div>
  </InteractiveWidget>
  ```

- [ ] **Content Collection error handling**: Handle missing fields gracefully
  ```astro
  ---
  const posts = await getCollection('blog');
  posts.forEach(post => {
    if (!post.data.title) {
      console.warn(`Post ${post.slug} missing title`);
    }
  });
  ---
  ```

**Audit Action:**
- Manually test error scenarios (broken links, missing images, invalid forms)
- Document any unhandled error states

### 6.3 Build & Deployment (Cloudflare Pages) [HIGH]

- [ ] **Clear README**: Setup instructions
  ```markdown
  ## Setup
  1. Install: `npm install`
  2. Dev: `npm run dev`
  3. Build: `npm run build`
  4. Preview: `npm run preview`
  ```

- [ ] **Environment variables**:
  - [ ] Local: `.env` (gitignored)
  - [ ] Production: Set in Cloudflare Pages dashboard
  - [ ] Documented: List required env vars in README

- [ ] **Git deployment**: Connected to GitHub with auto-deploy
  - Push to main → Auto-builds on Cloudflare

- [ ] **Build command**: `npm run build` (configured in Cloudflare)

- [ ] **Output directory**: `dist/` (Astro default)

- [ ] **.gitignore**: Properly configured
  ```
  node_modules/
  dist/
  .env
  .env.*
  .astro/
  ```

- [ ] **package.json scripts**: Clear and documented
  ```json
  {
    "scripts": {
      "dev": "astro dev",
      "build": "astro build",
      "preview": "astro preview",
      "astro": "astro",
      "lint": "eslint src/",
      "format": "prettier --write src/"
    }
  }
  ```

- [ ] **SPA fallback**: `public/_redirects` if using client-side routing
  ```
  /*    /index.html   200
  ```

- [ ] **Build optimizations**: Verify output is minimal
  - Check `dist/` size: `du -sh dist/`
  - Target: <10MB for typical portfolio site

**Metrics:**
- Build time: [Time `npm run build`]
- Output size: `du -sh dist/`

**Audit Action:**
- Run full build and verify no errors
- Test preview build locally
- Document build warnings

---

## 7. Verification [MEDIUM]

### 7.1 Testing & Quality Assurance [MEDIUM]

- [ ] **Unit tests**: Vitest configured
  ```bash
  npm install -D vitest
  # Add to package.json: "test": "vitest"
  ```

- [ ] **Component tests**: React Testing Library for interactive components
  ```bash
  npm install -D @testing-library/react @testing-library/jest-dom
  ```

- [ ] **ESLint**: Configured with React hooks plugin
  ```bash
  npm install -D eslint eslint-plugin-react eslint-plugin-react-hooks
  ```

- [ ] **Type checking**: Run `astro check`
  ```bash
  npx astro check
  ```

- [ ] **Build verification**: Test locally before deploy
  ```bash
  npm run build && npm run preview
  ```

- [ ] **Manual QA**: Critical user flows tested
  - [ ] Navigation works
  - [ ] Theme switching functions
  - [ ] Forms submit
  - [ ] Content loads correctly
  - [ ] Interactive components respond

**Test Coverage Target:** >70% for business logic and utilities

**Audit Action:**
- Document test coverage percentage (if tests exist)
- List untested critical functions

### 7.2 Performance Monitoring [MEDIUM]

- [ ] **Lighthouse audits**: Run regularly
  ```bash
  npx lighthouse http://localhost:4321 --output html
  ```
  - Target: >90 on all metrics

- [ ] **Cloudflare Analytics**: Enabled in dashboard
  - Monitor: Page views, load times, errors

- [ ] **Core Web Vitals**: Track LCP, FID, CLS
  - Use: PageSpeed Insights, Chrome DevTools

- [ ] **Bundle size monitoring**: Check after each build
  ```bash
  du -sh dist/
  ```
  - Set up alerts if bundle size increases significantly

**Metrics to Track:**
- Lighthouse Performance Score
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Bundle size (total and per-page)

---

## 8. Maintenance & Documentation [LOW-MEDIUM]

### 8.1 Documentation [LOW]

- [ ] **README.md**: Comprehensive
  - [ ] Project overview
  - [ ] Tech stack
  - [ ] Setup instructions
  - [ ] Development workflow
  - [ ] Deployment process
  - [ ] How to add content (fieldnotes, case studies, etc.)
  - [ ] Environment variables needed

- [ ] **design-system.md**: Documents design tokens, components, conventions
  - [ ] Color palette
  - [ ] Typography scale
  - [ ] Spacing system
  - [ ] Component library
  - [ ] Usage examples

- [ ] **Code comments**: Explain non-obvious logic
  - [ ] Astro frontmatter: Complex queries, data transformations
  - [ ] React components: State management, side effects
  - [ ] Theme/store logic: Shared state patterns
  - [ ] Business logic: Algorithms, calculations

- [ ] **Component props**: Documented with TypeScript or JSDoc
  ```typescript
  interface ButtonProps {
    /** Button variant style */
    variant: 'primary' | 'secondary';
    /** Button size */
    size?: 'sm' | 'md' | 'lg';
    /** Click handler */
    onClick?: () => void;
  }
  ```

- [ ] **Content Collections schema**: Clear field descriptions
  ```typescript
  const blog = defineCollection({
    schema: z.object({
      /** Post title (required) */
      title: z.string(),
      /** Short description for meta tags and previews */
      description: z.string(),
      /** Publication date */
      pubDate: z.date(),
    }),
  });
  ```

**Audit Action:**
- Review README completeness
- Check if design-system.md exists and is up to date
- Flag complex code without comments

### 8.2 Workflow Automation [LOW]

- [ ] **Git hooks**: Consider pre-commit hooks
  ```bash
  npm install -D husky lint-staged
  # Configure to run linting/formatting on commit
  ```

- [ ] **CI/CD**: Cloudflare auto-deploys on push (verify it's working)

- [ ] **Automated testing**: Run tests in CI (GitHub Actions or Cloudflare CI)
  ```yaml
  # .github/workflows/test.yml
  name: Test
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - run: npm install
        - run: npm test
        - run: npm run build
  ```

- [ ] **Dependency updates**: Dependabot or manual checks
  ```bash
  npm outdated
  ```

---

## Audit Output Format

### File: `code-quality-audit-[YYYY-MM-DD].md`

```markdown
# Code Quality Audit Report
**Date**: [YYYY-MM-DD]
**Auditor**: [Agent Name/Version]
**Codebase**: [Project Name]
**Commit**: [Git SHA]

---

## Executive Summary

- **Total Issues Found**: [Number]
- **Critical**: [Number]
- **High**: [Number]
- **Medium**: [Number]
- **Low**: [Number]

**Overall Assessment**: [Brief summary]

**Top 3 Priorities**:
1. [Issue reference]
2. [Issue reference]
3. [Issue reference]

---

## Metrics

### Codebase Statistics
- Total Files: [Number]
- Lines of Code: [Number]
- Total Dependencies: [Number]
- Bundle Size: [Size]

### Automated Tool Results
- Depcheck: [Pass/Fail] - [Number] unused dependencies
- Knip: [Pass/Fail] - [Number] unused files/exports
- JSCPD: [Pass/Fail] - [Percentage]% duplication
- TypeScript: [Pass/Fail] - [Number] errors
- npm audit: [Pass/Fail] - [Number] vulnerabilities (High: X, Critical: Y)
- Build: [Pass/Fail]

### Performance Scores (Lighthouse)
- Performance: [Score]/100
- Accessibility: [Score]/100
- Best Practices: [Score]/100
- SEO: [Score]/100

---

## Design System Compliance Analysis

**Design System Document**: `design-system.md` [Found/Not Found]
**Last Updated**: [Date from file metadata]

### Design System Adherence Score

- **Overall Compliance**: [X]% (Target: >95%)
- **Color Compliance**: [X]% ([Y] violations found)
- **Typography Compliance**: [X]% ([Y] violations found)
- **Spacing Compliance**: [X]% ([Y] violations found)
- **Component Usage**: [X]% of components follow design system

### Violations by Type

#### Color Violations ([Number] total)
- Non-design-system colors found: [List]
- Arbitrary color values: [List]
- Hard-coded hex values: [List]

Example violations:
```
File: src/components/Header.jsx
Line 23: className="bg-purple-600"
Design System: Only allows brutal-yellow, brutal-black, theme-primary
Recommendation: Use bg-theme-primary or add purple to design system
```

#### Typography Violations ([Number] total)
- Non-standard font sizes: [List]
- Non-standard font families: [List]
- Arbitrary text values: [List]

#### Spacing Violations ([Number] total)
- Arbitrary spacing values: [List]
- Non-standard padding/margin: [List]

#### Component Violations ([Number] total)
- Components not in design system: [List]
- Duplicate/similar components: [List]
- One-off implementations: [List]

### Undocumented Components

Components found in codebase but not documented in `design-system.md`:
1. `ComponentName` - `src/components/ui/ComponentName.jsx`
   - Usage count: [X] times
   - Recommendation: [Add to design system / Refactor to use existing component]

### Design System Recommendations

1. **Update design-system.md**: Add the following approved patterns:
   - [List new components/patterns that should be documented]

2. **Refactor**: The following should use design system components:
   - [List components that should be refactored]

3. **Consolidate**: Merge duplicate components:
   - [List duplicates and consolidation plan]

---

## Issues by Category

### [CRITICAL] Category Name ([Number] issues)

#### CRIT-001: [Issue Title]
- **Files**: `path/to/file.jsx`, `path/to/other.astro`
- **Type**: [Security/Accessibility/Performance/Functionality]
- **Description**: [What's wrong]
- **Impact**: 
  - [Specific impact on users/performance/security]
  - [Measurable impact if available, e.g., "Adds 45KB to bundle"]
- **Current State**: [Code snippet or description of current implementation]
- **Automated Detection**: [Tool that found it, if applicable]
- **Recommendation**: 
  ```[language]
  // Specific code example of fix
  ```
- **Estimated Fix Time**: [Time estimate]
- **Priority**: CRITICAL
- **Related Issues**: [CRIT-002, HIGH-003]

#### CRIT-002: [Next Issue]
[Same format...]

---

### [HIGH] Category Name ([Number] issues)

[Same format as above...]

---

### [MEDIUM] Category Name ([Number] issues)

[Same format as above...]

---

### [LOW] Category Name ([Number] issues)

[Same format as above...]

---

## Compliance Checklist Summary

### ✓ Passing Sections
- [Section name] - [X/Y items passing]

### ✗ Failing Sections
- [Section name] - [X/Y items failing]

### ⚠ Sections Needing Attention
- [Section name] - [X/Y items with warnings]

---

## Positive Findings

- [Good practice observed]
- [Well-implemented feature]
- [Exemplary code quality in specific area]

---

## Recommendations Summary

### Immediate Actions (Critical)
1. [Action item with reference to issue]
2. [Action item with reference to issue]

### Short-term Improvements (High Priority)
1. **Design System Compliance**: [Summary of design system violations to fix]
2. [Action item]
3. [Action item]

### Long-term Enhancements (Medium/Low Priority)
1. **Design System Documentation**: Update `design-system.md` with [list of additions]
2. [Action item]
3. [Action item]

---

## Technical Debt Assessment

- **Overall Technical Debt**: [Low/Medium/High]
- **Maintainability Score**: [1-10]
- **Code Health Trend**: [Improving/Stable/Declining]

---

## Appendix

### Files Reviewed
- Total: [Number]
- By Type: [Breakdown]

### Tools Used
- [Tool name and version]
- [Tool name and version]

### Exclusions
- [Any files/directories excluded from review]

---

## Next Steps

1. [Recommended next action]
2. [Recommended next action]
3. Schedule next audit: [Suggested date]
```

---

## Issue Numbering Scheme

- **CRIT-XXX**: Critical issues (security, accessibility, breaking bugs)
- **HIGH-XXX**: High priority (performance, major code quality)
- **MED-XXX**: Medium priority (maintainability, minor optimizations)
- **LOW-XXX**: Low priority (documentation, minor improvements)

Where XXX is a zero-padded number (001, 002, etc.)

---

## Prioritization Matrix

**Priority = Impact × Urgency**

### Impact Levels
- **Critical**: Security vulnerabilities, accessibility violations, site-breaking bugs
- **High**: Performance issues affecting users, major maintainability problems
- **Medium**: Code quality issues, minor performance impacts
- **Low**: Documentation, cosmetic issues, minor optimizations

### Urgency Levels
- **Immediate**: Blocks deployment, affects all users
- **Soon**: Affects many users, degrades experience
- **Eventually**: Technical debt, affects developers
- **When possible**: Nice-to-haves

---

## Final Notes

- **Scope**: This checklist covers all files in `src/`, `package.json`, static assets, and **design-system.md** compliance
- **Design System Priority**: `design-system.md` is the source of truth for all visual design decisions. All code must be validated against it.
- **Automated vs Manual**: Run automated tools first, then perform manual review with continuous design system cross-referencing
- **Time Estimate**: Full audit takes 35-70 minutes depending on codebase size (includes design system validation)
- **Frequency**: Run full audit before major releases; run critical sections + design system compliance weekly

**Focus**: Clean, maintainable, accessible code optimized for Astro's SSG architecture, with minimal client-side JavaScript, maximum performance on Cloudflare Pages, and **100% design system compliance**.