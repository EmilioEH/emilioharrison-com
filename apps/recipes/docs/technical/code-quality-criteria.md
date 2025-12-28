# Code Quality Criteria Checklist

**Tech Stack**: Astro + React + TailwindCSS + TypeScript + Cloudflare Pages

---

## Accessibility (Code Implementation)

- [ ] Semantic HTML in Astro components (`<nav>`, `<main>`, `<article>`, `<section>`, etc.)
- [ ] Proper heading hierarchy (single `<h1>`, logical `<h2>`-`<h6>` structure)
- [ ] Alt text for all images (including images imported via Astro's asset system)
- [ ] ARIA labels where semantic HTML isn't sufficient (especially in React components)
- [ ] Keyboard navigation support (focus states, tab order, focus-visible utilities)
- [ ] Skip-to-content link for screen readers
- [ ] Form labels properly associated with inputs (using `htmlFor` in JSX)
- [ ] Client directives accessibility: Ensure interactive islands (`client:*`) maintain focus management

---

## Performance

- [ ] Astro's zero-JS by default: Only use client directives (`client:load`, `client:visible`, etc.) when necessary
- [ ] Optimized images via Astro Image API: Use `<Image>` and `<Picture>` components from `astro:assets`
- [ ] Lazy loading: Use `client:visible` for below-the-fold interactive components
- [ ] Minified CSS: Automatic via Astro build process
- [ ] TailwindCSS purging: Ensure unused classes are removed (verify `tailwind.config.js` content paths)
- [ ] Efficient component hydration: Prefer `client:idle` or `client:visible` over `client:load`
- [ ] No render-blocking resources: Verify Astro's default inlining of critical CSS
- [ ] Font loading strategy: Use `@fontsource` packages or proper Google Fonts with `font-display: swap`
- [ ] Static generation: Leverage Astro's SSG capabilities for all non-dynamic pages
- [ ] Content Collections performance: Use `getCollection()` efficiently, avoid unnecessary filtering

---

## Code Organization & Maintainability

- [ ] Clear file structure:
  - [ ] `src/pages/`: Route-based pages (Astro or framework components)
  - [ ] `src/components/`: Reusable components (Astro and React)
  - [ ] `src/components/ui/`: Atomic UI components (`BrutalButton`, `BrutalCard`, etc.)
  - [ ] `src/layouts/`: Layout wrappers (`Layout.astro`, etc.)
  - [ ] `src/lib/`: Utilities, stores, themes, and business logic
  - [ ] `src/content/`: Content collections (fieldnotes, case studies, etc.)
  - [ ] `src/assets/`: Images and static assets processed by Astro
- [ ] Modular, reusable components: Avoid repetition, follow DRY principle
- [ ] Consistent naming conventions:
  - [ ] PascalCase for components (`BlogList.jsx`, `Layout.astro`)
  - [ ] camelCase for utilities and stores (`themes.js`, `store.js`)
  - [ ] kebab-case for routes (`/field-notes/`, etc.)
- [ ] Comments for complex logic: Especially in React state management and Astro frontmatter
- [ ] Separation of concerns:
  - [ ] Astro components for layout/structure
  - [ ] React components for interactivity
  - [ ] TailwindCSS for styling
  - [ ] Nanostores for shared state
- [ ] Version control: Meaningful commit messages

---

## Astro-Specific Quality

- [ ] Proper frontmatter usage: Type-safe imports, clear separation from template
- [ ] Content Collections schema: Define TypeScript schemas in `src/content/config.ts`
- [ ] Client directive justification: Document why each `client:*` directive is needed
- [ ] Component islands: Keep interactive islands small and focused
- [ ] Props validation: Use TypeScript interfaces for component props
- [ ] Astro.props destructuring: Clear, documented prop interfaces at component top
- [ ] Slot usage: Proper use of `<slot />` for flexible component composition
- [ ] Astro.glob() usage: Prefer Content Collections over `Astro.glob()` when possible

---

## HTML Quality

- [ ] Valid HTML: No unclosed tags, proper nesting
- [ ] No deprecated elements: Avoid `<font>`, `<center>`, etc.
- [ ] Proper document structure:
  - [ ] DOCTYPE in `Layout.astro`
  - [ ] `lang` attribute on `<html>`
  - [ ] Meta tags for charset, viewport, description
- [ ] Descriptive class names: Follow TailwindCSS conventions + semantic patterns
- [ ] Minimal inline styles: Use TailwindCSS utilities or theme-based classes
- [ ] JSX vs HTML syntax: Proper `className`, `htmlFor` in React; `class`, `for` in Astro

---

## CSS Quality (TailwindCSS)

- [ ] Utility-first approach: Leverage Tailwind utilities over custom CSS
- [ ] Theme integration: Use design tokens from `src/lib/themes.js` via dynamic classes
- [ ] CSS variables: Define reusable values in `tailwind.config.js` or theme object
- [ ] Mobile-first responsive: Use `md:`, `lg:` breakpoint prefixes appropriately
- [ ] No unused Tailwind classes: Verify purge configuration in `tailwind.config.js`
- [ ] Consistent units: Primarily Tailwind's spacing scale (rem-based)
- [ ] Specificity management: Avoid `!important` unless overriding third-party styles
- [ ] Custom CSS minimal: Limited to `src/index.css` (Tailwind directives only)
- [ ] Typography plugin: Use `@tailwindcss/typography` for markdown/prose styling
- [ ] Theme consistency: All components use theme-aware classes

---

## JavaScript/TypeScript Quality

- [ ] TypeScript for configs: Use `.ts` for `src/content/config.ts` and other type-safe files
- [ ] Modern ES6+ syntax: Arrow functions, destructuring, template literals
- [ ] Error handling: Try-catch for async operations (especially in Astro server code)
- [ ] No console.log in production: Remove debug statements before deploy
- [ ] React best practices:
  - [ ] Proper hooks usage (`useState`, `useEffect`, `useRef`)
  - [ ] Clean up effects (return cleanup functions)
  - [ ] Memoization where appropriate (`useMemo`, `useCallback`)
- [ ] Nanostores usage: Shared state via `nanostores` for cross-component state
- [ ] Event listeners: Properly attached in React components or Astro `<script>` tags
- [ ] No memory leaks: Especially in interactive components with intervals/event listeners
- [ ] Minimal dependencies: Review `package.json` regularly, remove unused packages
- [ ] Graceful degradation: Ensure core content works without client-side JS

---

## Cross-Browser Compatibility

- [ ] Modern browser support: Chrome, Safari, Firefox, Edge (last 2 versions)
- [ ] Astro SSG output: Static HTML works universally
- [ ] TailwindCSS autoprefixer: Automatic via PostCSS (verify `postcss.config.js`)
- [ ] Fallbacks for modern CSS: Use `@supports` where needed
- [ ] Tested on desktop and mobile browsers

---

## SEO Fundamentals

- [ ] Astro SEO advantages: Pre-rendered HTML is SEO-friendly by default
- [ ] Title tags: Unique, descriptive `<title>` in each page's `<Layout>` component
- [ ] Meta descriptions: Pass to layout component or define in frontmatter
- [ ] Heading structure: Logical hierarchy in content
- [ ] Descriptive URLs: Leverage Astro's file-based routing (`/fieldnotes/[slug].astro`)
- [ ] Image alt attributes: Required for accessibility and SEO
- [ ] Open Graph tags: Define in `Layout.astro` with dynamic props
- [ ] Schema markup: JSON-LD for person/professional data
- [ ] Sitemap: Add `@astrojs/sitemap` integration
- [ ] robots.txt: Include in `public/` directory

---

## Security

- [ ] HTTPS via Cloudflare: Enabled by default on Cloudflare Pages
- [ ] No exposed secrets: Keep API keys in environment variables (`.env`, Cloudflare settings)
- [ ] Sanitized inputs: Validate/sanitize on server (Astro endpoints or Cloudflare Functions)
- [ ] Content Security Policy: Configure headers in `public/_headers` or Cloudflare settings
- [ ] No inline scripts: Use Astro `<script>` tags or external modules
- [ ] Dependencies up to date: Run `npm audit` and `npm outdated` regularly
- [ ] XSS prevention: Astro auto-escapes variables; use `set:html` cautiously
- [ ] CORS configuration: Manage via Cloudflare Pages or `_headers` file

---

## Build & Deployment (Cloudflare Pages)

- [ ] Clear README: Setup instructions with tech stack overview
- [ ] Environment variables:
  - [ ] Local: `.env` files (gitignored)
  - [ ] Production: Cloudflare Pages dashboard
- [ ] Deployment via Git: Connected to GitHub repo with auto-deploy on push
- [ ] Build command: `npm run build` (configured in Cloudflare)
- [ ] Output directory: `dist/` (Astro default)
- [ ] .gitignore: Excludes `node_modules/`, `dist/`, `.env`, `.astro/`
- [ ] package.json scripts: Clear, documented (`dev`, `build`, `preview`, `test`, `lint`)
- [ ] SPA fallback: `public/_redirects` if needed for client-side routing
- [ ] Build optimizations: Verify Astro build output is minimal and efficient

---

## Error Handling & Resilience

- [ ] Custom 404 page: Create `src/pages/404.astro` with styled error message
- [ ] Broken images: Use Astro image error handling or fallback images
- [ ] External links: Include `rel="noopener noreferrer"` on `target="_blank"` links
- [ ] Form validation:
  - [ ] Client-side: Astro/React validation
  - [ ] Server-side: Validate in Astro endpoints
- [ ] No console errors: Test in browser console before production deploy
- [ ] Fallback content: For `client:*` components, provide server-rendered fallback HTML
- [ ] Content Collection errors: Handle missing fields gracefully with TypeScript types

---

## Testing & Quality Assurance

### Automated Testing (Always Run)

- [ ] Unit tests: Vitest setup (configured in `package.json`)
- [ ] Component tests: React Testing Library for interactive components
- [ ] E2E tests: Playwright tests (`npm run test:e2e`) before any task is complete
- [ ] ESLint: Configured with React hooks plugin
- [ ] Type checking: Run `astro check` for TypeScript validation
- [ ] Build verification: Test `npm run build` locally before pushing
- [ ] Preview testing: Use `npm run preview` to test production build locally

### Browser Agent Visual Verification (For UI Changes)

When implementing or fixing visual/UI features, coding agents should use the **browser subagent** to provide visual proof:

1. **Open the app**: Navigate to `http://localhost:4321/protected/recipes` (dev) or port 8788 (wrangler preview)
2. **Navigate to affected screen**: Go to the page/component that changed
3. **Perform the user action**: Click, type, or interact as a user would
4. **Record a video or screenshot**: Capture the working feature
5. **Include in walkthrough**: Add the recording/screenshot to the walkthrough artifact for user review

This "taste test" approach lets the user **see the change works** before approving, rather than just trusting test output.

### Manual QA Checklist

- [ ] Check critical user flows (navigation, theme switching, content loading)
- [ ] Verify mobile responsiveness (enable mobile viewports in Playwright)

---

## Documentation

- [ ] README.md:
  - [ ] Project overview
  - [ ] Tech stack
  - [ ] Setup instructions (`npm install`, `npm run dev`)
  - [ ] Deployment process
  - [ ] How to add content (new fieldnotes, case studies)
- [ ] design-system.md: Document all design tokens, components, and conventions
- [ ] Code comments: Explain non-obvious logic in:
  - [ ] Astro frontmatter (complex queries, data transformations)
  - [ ] React components (state management, side effects)
  - [ ] Theme/store logic (`src/lib/`)
- [ ] Component props: Document expected props with TypeScript interfaces or JSDoc
- [ ] Content Collections schema: Clear field descriptions in `src/content/config.ts`

---

## Astro + React Integration Best Practices

- [ ] Minimize React usage: Use Astro components by default; React only for interactivity
- [ ] Shared state: Use Nanostores (not React Context) for cross-component state
- [ ] Hydration strategy:
  - [ ] `client:load`: Critical, immediately visible interactivity
  - [ ] `client:idle`: Deferred, non-critical widgets
  - [ ] `client:visible`: Below-the-fold interactive elements
- [ ] Props passing: Pass serializable props to React components (no functions from Astro)
- [ ] CSS coordination: Ensure TailwindCSS classes work in both Astro and React components

---

## Content Management (Content Collections)

- [ ] Type-safe schemas: Define in `src/content/config.ts` with Zod
- [ ] Markdown quality:
  - [ ] Valid frontmatter YAML
  - [ ] Consistent formatting
  - [ ] Optimized image references (use Astro assets)
- [ ] Collection organization: Separate collections for different content types
- [ ] Slug generation: Use Astro's auto-slug or define manually in frontmatter
- [ ] Image handling: Store in `src/assets/` and reference via imports

---

## Performance Monitoring

- [ ] Lighthouse audits: Run regularly (target 90+ on all metrics)
- [ ] Cloudflare Analytics: Monitor page views, load times, errors
- [ ] Core Web Vitals: Track LCP, FID, CLS
- [ ] Bundle size: Check `dist/` size after builds; investigate large bundles

---

## Workflow Automation

- [ ] Git hooks: Consider pre-commit hooks for linting/formatting
- [ ] CI/CD: Cloudflare auto-deploys on push
- [ ] Automated testing: Run tests in CI (GitHub Actions or Cloudflare CI)
- [ ] Dependency updates: Use Dependabot or manual `npm outdated` checks

---

## Code Quality & Maintenance

- [ ] No duplicate/redundant code: Run duplicate detection tools
- [ ] No unused files: Verify with `knip` or manual audit
- [ ] No unused dependencies: Run `depcheck` and `npm outdated`
- [ ] No unused CSS: Check for unused Tailwind classes and custom CSS
- [ ] No commented-out code: Clean up before production
- [ ] TypeScript strict mode: Catches unused locals/parameters
- [ ] Cognitive complexity under 15: Simplify nested logic and branching
- [ ] Files under 400 lines: Split large components
- [ ] No deeply nested conditionals: Max 3 levels
- [ ] No magic numbers: Use named constants
- [ ] Bundle size monitored: Track with visualizer
- [ ] Appropriate abstraction level: Not over-engineered or under-engineered
- [ ] Consistent patterns: Similar problems solved similarly

---

---

---

## Design System Compliance

- [ ] **Design Tokens**: Verify usage of tokens from `design-system.md` (colors, typography, spacing).
- [ ] **Component Usage**: Ensure UI components match the patterns documented in `design-system.md`.
- [ ] **Consistency**: Check for ad-hoc styles that deviate from the design system.
- [ ] **Documentation**: Update `design-system.md` if new patterns or components are introduced.

---

## Code Quality Tools

**Automated Detection:**

- [ ] **Depcheck**: Finds unused dependencies
  ```bash
  npx depcheck
  ```
- [ ] **ESLint with plugins**: Catches unused variables, imports
  ```bash
  npm install -D eslint-plugin-unused-imports
  ```
- [ ] **Knip**: Finds unused files, exports, dependencies
  ```bash
  npx knip
  ```
- [ ] **Bundle analyzer**: Visualizes what's taking up space
  ```bash
  npm install -D rollup-plugin-visualizer
  # Add to astro.config.mjs
  ```
- [ ] **TypeScript compiler**: Strict mode catches unused code
  ```bash
  npx tsc --noEmit --noUnusedLocals --noUnusedParameters
  ```
- [ ] **Duplicate code detection**:
  ```bash
  npx jscpd src/
  ```
- [ ] **Lighthouse CI**: Automated performance regression detection
- [ ] **Size-limit**: Enforce bundle size limits
  ```bash
  npm install -D size-limit @size-limit/file
  ```

---

## Audit Categories (Periodic Review)

### 1. Redundant Code

- [ ] **Duplicate Logic**: Identify duplicate functions or components with similar logic (use `jscpd`).
- [ ] **Repeated Blocks**: Abstract repeated code blocks into utilities.
- [ ] **Copy-Paste**: Refactor copy-pasted code with minor variations into configurable components.
- [ ] **Redundant Imports**: Remove unused or duplicate imports.

### 2. Unused Code & Dead Files

- [ ] **Dead Components**: Remove components/utilities that are never imported or used.
- [ ] **Unused CSS**: Remove unused CSS classes (especially custom CSS outside Tailwind).
- [ ] **Commented-out Code**: Delete commented-out code blocks; rely on git history.
- [ ] **Dead Files**: Remove files in the repo that serve no purpose.
- [ ] **Unused Dependencies**: Remove unused packages from `package.json` (use `depcheck`).
- [ ] **Orphaned Assets**: Delete images/fonts not referenced anywhere.

### 3. Illogical Patterns

- [ ] **Over-Complexity**: Simplify overly complex logic.
- [ ] **Unnecessary Abstraction**: Remove abstraction layers that add no value.
- [ ] **Single Responsibility**: Ensure components have one clear responsibility.
- [ ] **State Management**: Use Nanostores for shared state instead of deep prop drilling.
- [ ] **Separation of Concerns**: Keep business logic out of UI components where possible.
- [ ] **Client Directives**: Verify `client:*` directives are actually needed (prefer server rendering).

### 4. Performance Issues

- [ ] **Client-Side Weight**: Reduce heavy client-side JavaScript where static HTML suffices.
- [ ] **Re-renders**: Optimize React components to avoid unnecessary re-renders.
- [ ] **Dependency Weight**: Replace large dependencies with lighter alternatives (e.g., date-fns vs moment).
- [ ] **Image Optimization**: Ensure all images use Astro's `<Image />` or are optimized.
- [ ] **Bundle Size**: Monitor and reduce bundle size.

### 5. File Organization Problems

- [ ] **Directory Structure**: Ensure files are in the correct directories (`src/components`, `src/pages`, etc.).
- [ ] **Naming Conventions**: Enforce consistent naming (PascalCase for components, camelCase for logic).
- [ ] **Colocation**: Colocate related components and styles/tests.
- [ ] **Nesting**: Avoid deeply nested folder structures (> 3 levels) unless necessary.

### 6. Dependencies

- [ ] **Overlap**: Remove packages that overlap in functionality.
- [ ] **Modern Alternatives**: Replace outdated packages with modern, lighter alternatives.
- [ ] **Dev Dependencies**: Ensure `devDependencies` are correctly categorized.

### 7. Code Smells

- [ ] **Cognitive Complexity**: Reduce cognitive complexity above 15 (nested logic, deep branching).
- [ ] **File Length**: Split files longer than 300-400 lines.
- [ ] **Complexity**: Flatten deeply nested conditionals (> 3 levels).
- [ ] **Magic Numbers**: Replace hard-coded values with constants.
- [ ] **Error Handling**: Ensure consistent error handling patterns.
- [ ] **Type Safety**: Eliminate implicit `any` in TypeScript.

---

---

## Audit Output Instructions

When performing a code quality audit based on this checklist, the coding agent must output the results in a new Markdown file named `code-quality-audit-[YYYY-MM-DD].md` (e.g., `code-quality-audit-2025-11-27.md`).

**Output format:**

For each issue found, provide:

- **File path**: Exact location
- **Issue type**: (Redundancy/Unused/Illogical/Performance/Organization/Dependency)
- **Description**: What's wrong
- **Impact**: Why it matters (bundle size, maintenance, performance, etc.)
- **Recommendation**: Specific fix or refactor suggestion
- **Priority**: High/Medium/Low

**Example output:**

```markdown
## Issue #1

- **File**: `src/components/Button.jsx` and `src/components/ui/BrutalButton.jsx`
- **Type**: Redundancy
- **Description**: Two button components with 80% overlapping functionality
- **Impact**: Maintenance burden, inconsistent UI, larger bundle
- **Recommendation**: Consolidate into single button with variant props
- **Priority**: High
```

**Scope of Check:**

- All files in `src/`
- `package.json` dependencies
- Static assets in `public/` and `src/assets/`
- All imports across the codebase

**Prioritization:**
Prioritize issues by impact:

1. Bundle size reduction
2. Maintainability improvement
3. Performance gains

---

**Focus**: Clean, maintainable, accessible code optimized for Astro's SSG architecture, with minimal client-side JavaScript and maximum performance on Cloudflare Pages.
