# Implementation Plan: Code Quality Audit Remediation

**Date**: 2025-11-27  
**Objective**: Address findings from code quality audit systematically across 3 implementation phases  
**Total Estimated Time**: 4-8 hours

---

## User Review Required

> [!IMPORTANT]
> **Phase 1 (High Priority)** includes fixes to React components that may affect functionality. Please review the proposed changes to lab experiments before proceeding.

> [!WARNING]
> **Hydration strategy changes** in Phase 1 will reduce initial JavaScript load but require testing to ensure all interactive features work correctly with deferred hydration.

---

## Proposed Changes

### Phase 1: Critical Fixes (High Priority)
**Estimated Time**: 1-2 hours  
**Impact**: Performance improvements, fixes React violations, reduces code duplication

---

#### Component: Lab Experiments

##### [MODIFY] [FittsLaw.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/features/lab/experiments/FittsLaw.jsx)

**Issue**: ESLint error - Cannot call impure function `Date.now()` within render

**Changes**:
- Move `Date.now()` call from render to `useEffect` or event handler
- Store timestamp in ref or state initialized properly
- Line 24: Refactor `lastClick.current = { x: ..., y: ..., time: Date.now() }`

**Example Fix**:
```javascript
// Before (line 24)
lastClick.current = { x: canvasRef.current.width / 2, y: canvasRef.current.height / 2, time: Date.now() };

// After 
// Initialize without Date.now() in render
lastClick.current = { x: canvasRef.current.width / 2, y: canvasRef.current.height / 2, time: 0 };
// Then update in useEffect:
useEffect(() => {
  if (lastClick.current.time === 0) {
    lastClick.current.time = Date.now();
  }
}, []);
```

---

##### [MODIFY] [LifeSim.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/features/lab/experiments/LifeSim.jsx)

**Issue**: ESLint error - Calling `setState()` synchronously within `useEffect` causes cascading renders

**Changes**:
- Line 25: Refactor conditional `init()` call in useEffect
- Move initialization logic outside effect or use proper dependency array
- Ensure `init()` is called appropriately without causing cascade

**Example Fix**:
```javascript
// Before (line 25)
if (!s.current.orgs.length) init();

// After - move to separate effect or initialization
useEffect(() => {
  // Only initialize once on mount
  if (s.current.orgs.length === 0) {
    init();
  }
}, []); // Empty deps - runs once
```

---

##### [MODIFY] [MazeGame.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/features/lab/experiments/MazeGame.jsx)

**Issue**: ESLint error - Unused variable 'e'

**Changes**:
- Line 36: Remove or use unused variable `e`
- Clean up incomplete refactoring

---

#### Component: Hydration Strategy Optimization

##### [MODIFY] [Layout.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro)

**Issue**: All components use `client:load` which loads JavaScript immediately

**Changes**:
- Line 29: `PatternDefs` → Remove `client:load` (server-render only, no interactivity)
- Line 30: `ReactiveBackground` → Change to `client:idle`
- Line 33: `Navbar` → Keep `client:load` (critical navigation)
- Line 37: `Footer` → Change to `client:idle`

**Before**:
```astro
<PatternDefs client:load />
<ReactiveBackground client:load rippleTrigger={false} />
<Navbar client:load />
<Footer client:load />
```

**After**:
```astro
<PatternDefs />
<ReactiveBackground client:idle rippleTrigger={false} />
<Navbar client:load />
<Footer client:idle />
```

---

##### [MODIFY] [index.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/index.astro)

**Changes**:
- Line 13: `Hero client:load` → `Hero client:visible`

**Before**: `<Hero client:load />`  
**After**: `<Hero client:visible />`

---

##### [MODIFY] [about.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/about.astro)

**Changes**:
- Line 7: `AboutContent client:load` → `AboutContent client:visible`

---

##### [MODIFY] [contact.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/contact.astro)

**Changes**:
- Line 7: `ContactContent client:load` → `ContactContent client:visible`

---

##### [MODIFY] [lab.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/lab.astro)

**Changes**:
- Line 7: `LabContent client:load` → `LabContent client:visible`

---

##### [MODIFY] [shop.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/shop.astro)

**Changes**:
- Line 7: `ShopContent client:load` → `ShopContent client:visible`

---

##### [MODIFY] [fieldnotes/[slug].astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/fieldnotes/%5Bslug%5D.astro)

**Changes**:
- Line 19: `BlogPostContent client:load` → `BlogPostContent client:visible`

---

#### Component: AboutContent Refactoring

##### [NEW] [QuoteBlock.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/ui/QuoteBlock.jsx)

**Purpose**: Extract repeated quote pattern into reusable component

**Content**:
```jsx
import React from 'react';

const QuoteBlock = ({ quote, attribution, theme }) => {
  return (
    <div className={`border-l-4 pl-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-gray-300'}`}>
      <p className={`italic text-lg mb-2 ${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-700'}`}>
        {quote}
      </p>
      <p className={`text-sm ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}>
        {attribution}
      </p>
    </div>
  );
};

export default QuoteBlock;
```

---

##### [NEW] [SkillCategory.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/ui/SkillCategory.jsx)

**Purpose**: Extract repeated skill card pattern

**Content**:
```jsx
import React from 'react';
import BrutalCard from './BrutalCard';

const SkillCategory = ({ title, skills, theme }) => {
  return (
    <BrutalCard theme={theme} className="p-6">
      <h3 className="text-xl font-black mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span 
            key={index} 
            className={`${theme.border} ${theme.colors.card} px-3 py-1 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`}
          >
            {skill}
          </span>
        ))}
      </div>
    </BrutalCard>
  );
};

export default SkillCategory;
```

---

##### [MODIFY] [AboutContent.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/features/about/AboutContent.jsx)

**Changes**:
- Import new components: `QuoteBlock`, `SkillCategory`
- Replace lines 73-77 (first quote) with `<QuoteBlock>`
- Replace lines 82-86 (second quote) with `<QuoteBlock>`
- Replace lines 98-107 (Research Methods card) with `<SkillCategory>`
- Replace lines 109-118 (AI card) with `<SkillCategory>`
- Replace lines 120-129 (Tools card) with `<SkillCategory>`
- Replace lines 131-140 (Technical card) with `<SkillCategory>`
- Expected reduction: 195 lines → ~120 lines

---

### Phase 2: SEO & Structure (Medium Priority)
**Estimated Time**: 1-2 hours  
**Impact**: SEO improvements, better UX, discoverability

---

#### Component: SEO Enhancements

##### [MODIFY] [astro.config.mjs](file:///Users/emilioharrison/Desktop/emilioharrison-com/astro.config.mjs)

**Changes**:
- Add `@astrojs/sitemap` integration
- Add `site` configuration for sitemap

**Dependencies**: `npm install @astrojs/sitemap`

**Before**:
```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
    integrations: [react(), tailwind()]
});
```

**After**:
```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    site: 'https://emilioharrison.com',
    integrations: [react(), tailwind(), sitemap()]
});
```

---

##### [NEW] [robots.txt](file:///Users/emilioharrison/Desktop/emilioharrison-com/public/robots.txt)

**Purpose**: Guide search engine crawlers

**Content**:
```
User-agent: *
Allow: /
Sitemap: https://emilioharrison.com/sitemap.xml
```

---

##### [NEW] [404.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/pages/404.astro)

**Purpose**: Custom branded 404 error page

**Content**:
```astro
---
import Layout from '../layouts/Layout.astro';
import BrutalButton from '../components/ui/BrutalButton';
---

<Layout title="404 - Page Not Found | Emilio Harrison">
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div class="mb-8">
            <h1 class="text-6xl md:text-8xl font-black mb-4">404</h1>
            <p class="text-2xl md:text-3xl font-bold mb-4">Page Not Found</p>
            <p class="text-lg text-gray-600 max-w-md mx-auto">
                Looks like you've wandered off the map. Let's get you back on track.
            </p>
        </div>
        
        <div class="flex flex-wrap gap-4 justify-center">
            <BrutalButton client:load href="/">
                ← Back to Home
            </BrutalButton>
            <BrutalButton client:load href="/fieldnotes">
                Read Field Notes
            </BrutalButton>
            <BrutalButton client:load href="/lab">
                Explore Lab
            </BrutalButton>
        </div>
    </div>
</Layout>
```

---

##### [MODIFY] [Layout.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro)

**Changes**: Add Open Graph tags, JSON-LD schema, and description prop

**Updates to Props interface** (lines 7-9):
```typescript
export interface Props {
    title: string;
    description?: string;
}

const { title, description } = Astro.props;
const defaultDescription = "UX Researcher & Creative Technologist building utility-focused AI tools";
```

**Add to `<head>`** (after line 22):
```astro
<!-- SEO Meta Tags -->
<meta name="description" content={description || defaultDescription} />

<!-- Open Graph -->
<meta property="og:title" content={title} />
<meta property="og:description" content={description || defaultDescription} />
<meta property="og:type" content="website" />
<meta property="og:url" content={Astro.url} />
<meta property="og:site_name" content="Emilio Harrison" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description || defaultDescription} />

<!-- JSON-LD Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Emilio Harrison",
  "jobTitle": "UX Research Strategist",
  "url": "https://emilioharrison.com",
  "alumniOf": "University of Texas at Austin",
  "workLocation": "Austin, TX"
}
</script>
```

---

#### Component: Pattern Consolidation

##### [MODIFY] [PatternDefs.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/ui/PatternDefs.jsx)

**Issue**: Pattern definitions duplicated between PatternDefs and ReactiveBackground

**Changes**:
- Ensure PatternDefs is the single source of SVG pattern definitions
- Export patterns for reuse if needed

---

##### [MODIFY] [ReactiveBackground.jsx](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/components/ui/ReactiveBackground.jsx)

**Changes**:
- Remove duplicate pattern definitions (lines 68-80)
- Reference patterns from PatternDefs instead
- Ensure patterns are available in component scope

---

### Phase 3: Accessibility & Enhancement (Low Priority)
**Estimated Time**: 2-4 hours  
**Impact**: Accessibility improvements, code organization, testing

---

#### Component: Accessibility

##### [MODIFY] [Layout.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro)

**Changes**: Add skip-to-content link

**Add before Navbar** (line 33):
```astro
<!-- Skip to content link for accessibility -->
<a 
  href="#main-content" 
  class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-mustard focus:text-black focus:font-bold focus:border-4 focus:border-black focus:shadow-hard"
>
  Skip to main content
</a>
```

**Update main tag** (line 34):
```astro
<main id="main-content" class="flex-grow container mx-auto px-4 py-8 md:py-12 max-w-6xl">
```

---

#### Component: Code Organization

##### [NEW] [themeInit.ts](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/lib/themeInit.ts)

**Purpose**: Extract inline theme subscription logic from Layout.astro

**Content**:
```typescript
import { themeId } from './store';
import { THEMES } from './themes';

// Initialize theme subscription
export function initTheme() {
  const wrapper = document.getElementById('theme-wrapper');
  const bgLayer = document.createElement('div');
  bgLayer.className = "fixed inset-0 pointer-events-none opacity-10 z-0";
  bgLayer.style.backgroundImage = 'linear-gradient(#4db8ff 1px, transparent 1px), linear-gradient(90deg, #4db8ff 1px, transparent 1px)';
  bgLayer.style.backgroundSize = '40px 40px';
  
  // Subscribe to theme changes
  themeId.subscribe(id => {
    const theme = THEMES[id];
    if (wrapper) {
      wrapper.className = `min-h-screen ${theme.colors.bg} ${theme.colors.text} ${theme.font} transition-colors duration-500 overflow-hidden relative`;
      
      // Handle blueprint background
      if (id === 'blueprint') {
        if (!wrapper.contains(bgLayer)) wrapper.appendChild(bgLayer);
      } else {
        if (wrapper.contains(bgLayer)) wrapper.removeChild(bgLayer);
      }
    }
  });
}

// Auto-initialize
if (typeof window !== 'undefined') {
  initTheme();
}
```

---

##### [MODIFY] [Layout.astro](file:///Users/emilioharrison/Desktop/emilioharrison-com/src/layouts/Layout.astro)

**Changes**:
- Replace inline `<script>` (lines 40-64) with import
- Use external module for theme initialization

**Before** (lines 40-64): Inline script tag  
**After**:
```astro
<script src="../lib/themeInit.ts"></script>
```

---

#### Component: Configuration

##### [NEW] [tsconfig.json](file:///Users/emilioharrison/Desktop/emilioharrison-com/tsconfig.json)

**Purpose**: Enable TypeScript strict mode

**Content**:
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strictNullChecks": true
  }
}
```

---

##### [NEW] [.depcheckrc](file:///Users/emilioharrison/Desktop/emilioharrison-com/.depcheckrc)

**Purpose**: Configure depcheck to ignore false positives

**Content**:
```json
{
  "ignores": [
    "autoprefixer",
    "postcss"
  ],
  "skip-missing": true
}
```

---

#### Component: Documentation

##### [MODIFY] [README.md](file:///Users/emilioharrison/Desktop/emilioharrison-com/README.md)

**Changes**: Add missing sections

**Add after line 18**:
```markdown
## Adding New Field Notes

Field notes are managed through Astro Content Collections:

1. Create a new `.md` file in `src/content/posts/`
2. Add required frontmatter:
```yaml
---
title: "Your Post Title"
date: "2025-11-27"
category: "Research | Design | Development"
excerpt: "Brief summary of the post"
---
```

3. Write your content in Markdown
4. Run `npm run dev` to preview locally

## Environment Variables

Currently, no environment variables are required for local development. 

For production deployment on Cloudflare Pages:
- All environment variables are managed through the Cloudflare Pages dashboard
- No secrets are committed to the repository

## Testing

Run tests with:
```bash
npm test        # Run all unit tests with Vitest
npm run lint    # Check code quality with ESLint
```

Current test coverage:
- UI Components: BrutalButton, BrutalCard
- More tests coming soon!
```

---

## Verification Plan

### Automated Tests

**Phase 1 Verification**:
```bash
# 1. Run ESLint - should pass with 0 errors
npm run lint

# 2. Run build - verify no errors
npm run build

# 3. Check bundle size - should be reduced
ls -lh dist/_astro/
```

**Phase 2 Verification**:
```bash
# 1. Build and check for sitemap
npm run build
ls dist/sitemap*.xml  # Should exist

# 2. Verify robots.txt
cat public/robots.txt

# 3. Check 404 page
npm run preview
# Visit http://localhost:4321/nonexistent-page
```

**Phase 3 Verification**:
```bash
# 1. TypeScript check
npx tsc --noEmit

# 2. Run depcheck - should show no false positives
npx depcheck
```

---

### Manual Verification

**Phase 1 - Functionality Testing**:
1. Test all interactive features work with new hydration:
   - [ ] Theme switcher in Navbar
   - [ ] Navigation links
   - [ ] Reactive background animations
   - [ ] All page content loads correctly
   - [ ] Lab experiments function properly
2. Test on mobile and desktop
3. Verify no console errors in browser DevTools
4. Check Network tab - JavaScript should load later/smaller bundles

**Phase 2 - SEO Testing**:
1. Visit `/sitemap.xml` - verify all pages listed
2. Test 404 page - navigate to non-existent URL
3. Check social media preview:
   - Use [OpenGraph.xyz](https://www.opengraph.xyz/) to test OG tags
   - Verify title, description, image appear correctly
4. Test skip-to-content link:
   - Tab through page with keyboard
   - Verify skip link appears on focus

**Phase 3 - Code Quality**:
1. Run Lighthouse audit:
   - Performance should improve (reduced JS)
   - Accessibility score should increase (skip link)
   - SEO score should improve (meta tags, sitemap)
2. Verify AboutContent is shorter but functionally identical
3. Test theme switching still works (after extracting script)

---

### Success Criteria

**Phase 1**:
- ✅ All ESLint errors resolved
- ✅ 0 console errors in production
- ✅ All interactive features work correctly
- ✅ Lighthouse Performance score >90

**Phase 2**:
- ✅ Sitemap.xml generated and accessible
- ✅ Custom 404 page displays correctly
- ✅ Open Graph tags render in social previews
- ✅ Lighthouse SEO score >95

**Phase 3**:
- ✅ Skip-to-content link works with keyboard
- ✅ TypeScript compiles with no errors
- ✅ AboutContent reduced by 30%+ lines
- ✅ Lighthouse Accessibility score >95

---

## Execution Order

1. **Start with Phase 1** (Critical fixes - required for code quality)
2. **Then Phase 2** (SEO improvements - quick wins)
3. **Finally Phase 3** (Enhancements - when time permits)

Each phase can be completed independently, committed, and deployed separately for incremental improvements.
