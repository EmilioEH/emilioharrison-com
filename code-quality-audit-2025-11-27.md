# Code Quality Audit Report
**Date**: 2025-11-27  
**Codebase**: emilioharrison-com  
**Tech Stack**: Astro + React + TailwindCSS + TypeScript + Cloudflare Pages

---

## Executive Summary

This audit systematically reviewed the codebase against the comprehensive criteria in [`code-quality-criteria.md`](file:///Users/emilioharrison/Desktop/emilioharrison-com/code-quality-criteria.md). The analysis combined automated tools (depcheck, jscpd, ESLint) with manual code inspection across accessibility, performance, organization, and security categories.

**Overall Status**: ⚠️ **Moderate Issues Found**

**Key Findings**:
- 4 ESLint errors (React hooks violations)
- 5 code duplications (~3% duplication rate)
- 2 unused dev dependencies + 1 missing dependency
- 10 components using `client:load` (performance optimization opportunity)
- Missing SEO essentials (404 page, sitemap, robots.txt)
- No image alt text validation found

---

## Critical Issues (High Priority)

### Issue #1: ESLint Errors in Lab Components
- **Files**: 
  - [`src/components/features/lab/experiments/ChemistryGame.jsx`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/features/lab/experiments/ChemistryGame.jsx)
  - [`src/components/features/lab/experiments/LifeSim.jsx`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/features/lab/experiments/LifeSim.jsx)
  - [`src/components/features/lab/experiments/MazeGame.jsx`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/features/lab/experiments/MazeGame.jsx)
- **Type**: Code Quality / React Best Practices
- **Description**: 
  - ChemistryGame.jsx: Cannot call impure function `Date.now()` within render (line 24)
  - LifeSim.jsx: Calling `setState()` within `useEffect` causes cascading renders (line 25)
  - MazeGame.jsx: Unused variable 'e' (line 36)
- **Impact**: 
  - Impure function calls can cause hydration mismatches and inconsistent rendering
  - Cascading renders hurt performance and violate React patterns
  - Unused variables indicate incomplete refactoring
- **Recommendation**: 
  - Move `Date.now()` calls to `useEffect` or event handlers
  - Refactor `LifeSim` to use proper effect lifecycle
  - Remove unused variable `e`
- **Priority**: **High**

---

### Issue #2: Missing Dependency - astro:content
- **File**: [`package.json`](file:///Users/emilioharrison/Desktop/emilioharrison-com/package.json)
- **Type**: Dependency
- **Description**: Depcheck reports missing dependency `astro:content` which is imported in [`src/content/config.ts`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/content/config.ts)
- **Impact**: This is actually a false positive - `astro:content` is a built-in Astro module, not an npm package
- **Recommendation**: Configure depcheck to ignore Astro built-in modules or add to ignore list
- **Priority**: **Low** (False positive, but should be addressed in tooling config)

---

### Issue #3: Inefficient Client Hydration Strategy
- **Files**: Multiple files using `client:load`
  - [`src/layouts/Layout.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro) (4 instances: PatternDefs, ReactiveBackground, Navbar, Footer)
  - [`src/pages/index.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/index.astro) (Hero)
  - [`src/pages/about.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/about.astro) (AboutContent)
  - [`src/pages/contact.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/contact.astro) (ContactContent)
  - [`src/pages/lab.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/lab.astro) (LabContent)
  - [`src/pages/shop.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/shop.astro) (ShopContent)
  - [`src/pages/fieldnotes/[slug].astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/fieldnotes/%5Bslug%5D.astro) (BlogPostContent)
- **Type**: Performance
- **Description**: 10 components use `client:load` which loads JavaScript immediately. Most components could use more efficient hydration strategies.
- **Impact**: 
  - Increased initial page load time
  - More JavaScript parsed/executed upfront
  - Violates Astro's zero-JS by default philosophy
- **Recommendation**:
  - **PatternDefs**: Could be server-rendered (no interactivity needed)
  - **ReactiveBackground**: Use `client:idle` (non-critical visual enhancement)
  - **Navbar**: Keep `client:load` (critical navigation)
  - **Footer**: Use `client:idle` (below-the-fold, non-critical)
  - **Hero, AboutContent, ContactContent, LabContent, ShopContent**: Use `client:visible` (deferred until in viewport)
  - **BlogList**: Already optimized with `client:visible` ✓
- **Priority**: **High** (Performance impact)

---

## Moderate Issues (Medium Priority)

### Issue #4: Code Duplication in AboutContent.jsx
- **File**: [`src/components/features/about/AboutContent.jsx`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/features/about/AboutContent.jsx)
- **Type**: Redundancy
- **Description**: jscpd detected significant code duplication:
  - Lines 79-96 duplicated in lines 69-82 (17 lines, 317 tokens)
  - Lines 102-146 duplicated in lines 96-120 (44 lines, 476 tokens)
  - Three JSX patterns duplicated (9 lines each, 115 tokens)
- **Impact**: 
  - Maintenance burden - changes need to be made in multiple places
  - Increased file size (195 lines, could be reduced)
  - Violates DRY principle
- **Recommendation**: 
  - Abstract repeated patterns into reusable components:
    - Create `<QuoteBlock>` component for philosophy quotes
    - Create `<SkillCategory>` component for skill cards (Research Methods, AI, Tools, Technical)
  - Reduces file from 195 to ~120 lines
- **Priority**: **Medium**

---

### Issue #5: Pattern Duplication Between PatternDefs and ReactiveBackground
- **Files**: 
  - [`src/components/ui/PatternDefs.jsx`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/ui/PatternDefs.jsx) (lines 4-16)
  - [`src/components/ui/ReactiveBackground.jsx`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/ui/ReactiveBackground.jsx) (lines 68-80)
- **Type**: Redundancy
- **Description**: 12 lines of SVG pattern definitions duplicated (278 tokens)
- **Impact**: 
  - Code maintenance - pattern changes need to be synced
  - Increased bundle size
- **Recommendation**: 
  - Consolidate pattern definitions in one location
  - PatternDefs should be the single source of truth for SVG patterns
  - ReactiveBackground should reference patterns from PatternDefs
- **Priority**: **Medium**

---

### Issue #6: Unused Dev Dependencies
- **File**: [`package.json`](file:///Users/emilioharrison/Desktop/emilioharrison-com/package.json)
- **Type**: Dependency
- **Description**: Depcheck identified 2 unused devDependencies:
  - `autoprefixer` (line 33)
  - `postcss` (line 39)
- **Impact**: 
  - NOTE: These are actually USED by TailwindCSS and required in the build process
  - This is a depcheck false positive - both packages are necessary for TailwindCSS to work
- **Recommendation**: 
  - Keep dependencies as-is
  - Configure depcheck to recognize PostCSS/Tailwind toolchain dependencies
  - Add `.depcheckrc` with ignoreMatches for these packages
- **Priority**: **Low** (False positive)

---

### Issue #7: Missing Custom 404 Page
- **File**: Missing `src/pages/404.astro`
- **Type**: Error Handling / UX
- **Description**: No custom 404 error page exists
- **Impact**: 
  - Users see generic Cloudflare/Astro 404 page
  - Missed opportunity for brand consistency
  - No navigation back to site
- **Recommendation**: 
  - Create `src/pages/404.astro` with:
    - Branded error message
    - Navigation links back to home/main sections
    - Theme-aware styling matching design system
- **Priority**: **Medium**

---

### Issue #8: Missing Sitemap Integration
- **File**: [`astro.config.mjs`](file:///Users/emilioharrison/Desktop/emilioharrison-com/astro.config.mjs)
- **Type**: SEO
- **Description**: No `@astrojs/sitemap` integration configured
- **Impact**: 
  - No `sitemap.xml` generated
  - Reduced SEO discoverability
  - Search engines have to crawl instead of using sitemap
- **Recommendation**:
  ```bash
  npm install @astrojs/sitemap
  ```
  Add to `astro.config.mjs`:
  ```javascript
  import sitemap from '@astrojs/sitemap';
  export default defineConfig({
    site: 'https://emilioharrison.com',
    integrations: [react(), tailwind(), sitemap()]
  });
  ```
- **Priority**: **Medium**

---

### Issue #9: Missing robots.txt
- **File**: Missing `public/robots.txt`
- **Type**: SEO
- **Description**: No `robots.txt` file to guide search engine crawlers
- **Impact**: 
  - No explicit crawl directives
  - Can't reference sitemap
  - Missed SEO best practice
- **Recommendation**:
  Create `public/robots.txt`:
  ```
  User-agent: *
  Allow: /
  Sitemap: https://emilioharrison.com/sitemap.xml
  ```
- **Priority**: **Medium**

---

## Minor Issues (Low Priority)

### Issue #10: No Alt Text Validation
- **Type**: Accessibility
- **Description**: No images with `alt` attributes found in grep search (though this may be handled by Astro Image API)
- **Impact**: 
  - Potential accessibility violations if images lack alt text
  - SEO impact from missing image descriptions
- **Recommendation**: 
  - Audit all images to ensure alt text is present
  - Use content collections schema to require alt text
  - Add ESLint rule for jsx-a11y/alt-text
- **Priority**: **Low** (Needs verification)

---

### Issue #11: Missing Skip-to-Content Link
- **File**: [`src/layouts/Layout.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro)
- **Type**: Accessibility
- **Description**: No skip-to-content link for keyboard/screen reader users
- **Impact**: 
  - Keyboard users must tab through entire navbar
  - Reduced accessibility for screen reader users
- **Recommendation**:
  Add skip link before navbar:
  ```astro
  <a href="#main-content" class="sr-only focus:not-sr-only">
    Skip to main content
  </a>
  <Navbar client:load />
  <main id="main-content" class="...">
  ```
- **Priority**: **Low** (Accessibility improvement)

---

### Issue #12: Open Graph Tags Missing
- **File**: [`src/layouts/Layout.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro)
- **Type**: SEO
- **Description**: No Open Graph meta tags for social sharing
- **Impact**: 
  - Poor social media preview cards
  - Missed opportunity for branded shares
- **Recommendation**:
  Add to `<head>`:
  ```astro
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description || "UX Researcher & Creative Technologist"} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={Astro.url} />
  <meta property="og:image" content="/og-image.jpg" />
  ```
- **Priority**: **Low**

---

### Issue #13: No Schema Markup (JSON-LD)
- **File**: [`src/layouts/Layout.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro)
- **Type**: SEO
- **Description**: No structured data for person/professional schema
- **Impact**: 
  - Lost opportunity for rich search results
  - Less semantic information for search engines
- **Recommendation**:
  Add JSON-LD for Person schema:
  ```astro
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Emilio Harrison",
    "jobTitle": "UX Research Strategist",
    "url": "https://emilioharrison.com"
  }
  </script>
  ```
- **Priority**: **Low**

---

### Issue #14: Font Loading Strategy Not Optimized
- **File**: [`src/layouts/Layout.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro) (lines 23-26)
- **Type**: Performance
- **Description**: Using Google Fonts CDN with preconnect, but could be more optimized
- **Impact**: 
  - External font loading blocks rendering
  - FOUT (Flash of Unstyled Text) possible
- **Recommendation**:
  - Add `&display=swap` to Google Fonts URL (already present ✓)
  - Consider using `@fontsource` packages for self-hosted fonts
  - Or add `font-display: swap` CSS rule
- **Priority**: **Low** (Already has display=swap)

---

### Issue #15: Unused setupTests.js
- **File**: [`src/setupTests.js`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/setupTests.js)
- **Type**: Dead Files
- **Description**: setupTests.js exists but may not be used (36 bytes)
- **Impact**: Minimal - small file
- **Recommendation**: Verify if this is loaded by Vitest config, if not, remove
- **Priority**: **Low**

---

### Issue #16: No Content Security Policy
- **Type**: Security
- **Description**: No CSP headers configured
- **Impact**: 
  - Vulnerability to XSS attacks
  - No defense-in-depth security
- **Recommendation**:
  Create `public/_headers`:
  ```
  /*
    Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:;
    X-Frame-Options: DENY
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
  ```
- **Priority**: **Low** (Cloudflare provides some defaults)

---

### Issue #17: No Unit Test Coverage for UI Components
- **Type**: Testing
- **Description**: Only 2 test files found (BrutalButton.test.jsx, BrutalCard.test.jsx) out of 10 UI components
- **Impact**: 
  - Limited test coverage
  - Risk of regressions
- **Recommendation**: 
  - Add tests for remaining UI components:
    - SectionTitle.jsx
    - StickyNote.jsx
    - TapeButton.jsx
    - Marginalia.jsx
    - PatternDefs.jsx (if needed)
    - ReactiveBackground.jsx (if needed)
- **Priority**: **Low**

---

### Issue #18: README Incomplete
- **File**: [`README.md`](file:///Users/emilioharrison/Desktop/emilioharrison-com/README.md)
- **Type**: Documentation
- **Description**: README missing some recommended sections from criteria:
  - How to add new content (fieldnotes, case studies)
  - Environment variables documentation
  - Testing instructions beyond `npm test`
- **Impact**: 
  - Harder for new contributors to understand workflows
  - Missing context for content management
- **Recommendation**: 
  Add sections:
  - "Adding New Field Notes" with frontmatter schema
  - "Environment Variables" section (even if none currently used)
  - Expand testing section with what's tested
- **Priority**: **Low**

---

### Issue #19: Inline Script in Layout.astro
- **File**: [`src/layouts/Layout.astro`](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro) (lines 40-64)
- **Type**: Code Organization
- **Description**: Theme subscription logic in inline `<script>` tag
- **Impact**: 
  - Harder to test
  - Mixed concerns in layout file
  - CSP issues with inline scripts
- **Recommendation**: 
  - Extract to separate module: `src/lib/themeInit.ts`
  - Import in Astro script tag: `<script src="../lib/themeInit.ts"></script>`
- **Priority**: **Low**

---

### Issue #20: No TypeScript Strict Mode
- **File**: Missing `tsconfig.json` with strict settings
- **Type**: Code Quality
- **Description**: No evidence of TypeScript strict mode configuration
- **Impact**: 
  - Missing type safety benefits
  - Won't catch unused variables/parameters
- **Recommendation**:
  Create/update `tsconfig.json`:
  ```json
  {
    "extends": "astro/tsconfigs/strict",
    "compilerOptions": {
      "noUnusedLocals": true,
      "noUnusedParameters": true
    }
  }
  ```
- **Priority**: **Low**

---

## Positive Findings ✅

The codebase demonstrates several **excellent practices**:

1. **✓ No console.log statements** in production code
2. **✓ Clean component organization** (ui/, features/, layout/)
3. **✓ Proper use of Content Collections** with TypeScript schema
4. **✓ TailwindCSS properly configured** with purge paths
5. **✓ Good README with deployment workflow**
6. **✓ Minimal code duplication** (3.36% is acceptable)
7. **✓ Modern React patterns** (hooks, functional components)
8. **✓ Proper separation of concerns** (Astro for structure, React for interactivity)
9. **✓ Theme system with Nanostores** for cross-component state
10. **✓ SPA fallback configured** (_redirects file present)
11. **✓ Semantic HTML** in most components
12. **✓ Mobile-first responsive design** with Tailwind breakpoints

---

## Priority Summary

### Immediate Action (High Priority)
1. **Fix ESLint errors** in lab experiments (Issue #1)
2. **Optimize client hydration** - switch to client:idle/client:visible (Issue #3)
3. **Refactor AboutContent duplications** (Issue #4)

### Short-term (Medium Priority)
4. Consolidate pattern definitions (Issue #5)
5. Create custom 404 page (Issue #7)
6. Add sitemap integration (Issue #8)
7. Add robots.txt (Issue #9)

### Long-term / Nice-to-Have (Low Priority)
8. Configure depcheck ignore list (Issue #2, #6)
9. Add skip-to-content link (Issue #11)
10. Implement Open Graph tags (Issue #12)
11. Add JSON-LD schema (Issue #13)
12. Expand test coverage (Issue #17)
13. Enhance README documentation (Issue #18)

---

## Recommendations for Next Steps

### Phase 1: Critical Fixes (1-2 hours)
```bash
# Fix ESLint errors
# Edit lab experiment files
# Test with npm run lint

# Optimize hydration
# Update all page files to use client:visible/client:idle
# Verify functionality
```

### Phase 2: SEO & Structure (1-2 hours)
```bash
# Add sitemap
npm install @astrojs/sitemap

# Create 404 page, robots.txt
# Add Open Graph tags
```

### Phase 3: Refactoring (2-4 hours)
```bash
# Extract AboutContent components
# Consolidate pattern definitions
# Extract inline script to module
```

---

## Automated Tools Used

- **depcheck**: Dependency analysis
- **jscpd**: Code duplication detection  
- **ESLint**: JavaScript/React linting
- **Manual inspection**: Accessibility, SEO, security review

---

## Conclusion

The codebase is in **good overall health** with a solid foundation in Astro best practices. The issues identified are primarily **optimization opportunities** rather than critical flaws. Addressing the high-priority items (ESLint errors and hydration strategy) will yield the most immediate benefits to code quality and performance.

The 3.36% code duplication rate is within acceptable ranges, and the clear separation of concerns between Astro and React components demonstrates strong architectural decisions.

**Next step**: Prioritize fixing the ESLint errors and optimizing client hydration, then tackle SEO improvements for better discoverability.
