# Code Quality Audit Report

**Date:** 2025-11-27
**Scope:** `src/`, `public/`, `package.json`

## 1. Redundant Code

### Duplicate Image Assets

- **File**: `src/assets/blogIMG` and `public/images/blog`
- **Type**: Redundancy
- **Description**: The same set of high-resolution blog images exists in both directories, consuming ~12MB each (24MB total).
- **Impact**: Doubles the repository size, confusing source of truth for assets.
- **Recommendation**: Choose one location. If using Astro's image optimization (recommended), keep them in `src/assets` and remove `public/images/blog`. Update all references to import from `src/assets`.
- **Priority**: High

### Unused Dependencies

- **File**: `package.json`
- **Type**: Redundancy
- **Description**: The following dependencies appear unused based on `depcheck` and manual review:
  - `react-markdown`: Blog posts are rendered via Astro's content collections (passing `children`), not by parsing markdown in React.
  - `buffer`: Likely a leftover polyfill.
  - `gray-matter`: Astro handles frontmatter parsing internally via `astro:content`.
- **Impact**: Increases `node_modules` size and install time; potential security surface area.
- **Recommendation**: Uninstall these packages.
- **Priority**: Medium

### Code Duplication in Page Content

- **File**: `src/components/pages/LabContent.jsx` and `src/components/pages/AboutContent.jsx`
- **Type**: Redundancy
- **Description**: `jscpd` identified significant duplication (13.2% in JS files) between these components, particularly in how they handle theme-based styling for cards and section titles.
- **Impact**: Maintenance burden; changes to theme logic require updates in multiple files.
- **Recommendation**: Abstract the common "Themed Card" or "Section Header" patterns into reusable UI components (e.g., `ThemedSection`, `ExperimentCard`).
- **Priority**: Medium

## 2. Unused Code & Dead Files

### Broken Component Usage

- **File**: `src/pages/fieldnotes/index.astro`
- **Type**: Unused Code / Bug
- **Description**: The `<BlogList client:load />` component is used without passing the required `posts` prop.
- **Impact**: The component will likely crash or render an empty list at runtime.
- **Recommendation**: Fetch posts using `getCollection('posts')` in the Astro frontmatter and pass them to the component: `<BlogList client:load posts={posts} />`.
- **Priority**: High

## 3. Illogical Patterns

### Unnecessary Client Hydration

- **File**: `src/pages/index.astro`, `src/pages/fieldnotes/index.astro`
- **Type**: Illogical Pattern
- **Description**: `BlogList` is hydrated with `client:load`. If the list is purely presentational (just links), it should be static. However, it uses `useStore` for theming.
- **Impact**: unnecessary JavaScript sent to the client, slowing down TTI (Time to Interactive).
- **Recommendation**: If the theme can be determined server-side or via CSS variables, remove `client:load`. If dynamic theming is essential, consider `client:visible` to defer loading until needed, or refactor to use CSS variables for theming to avoid React re-renders.
- **Priority**: Medium

### Hardcoded Data in Components

- **File**: `src/components/pages/AboutContent.jsx`
- **Type**: Illogical Pattern
- **Description**: Large arrays of data (skills, certifications, expertise) are hardcoded inside the component function.
- **Impact**: Bloats the component file (234 lines), mixing data with presentation.
- **Recommendation**: Move this data to a separate `src/data/about.json` or `src/config/resume.ts` file and import it.
- **Priority**: Low

## 4. Performance Issues

### Large Unoptimized Images

- **File**: `src/assets/blogIMG`
- **Type**: Performance
- **Description**: The blog images are large JPEGs (total 12MB).
- **Impact**: Slow page loads if not properly optimized.
- **Recommendation**: Ensure `<Image />` component from `astro:assets` is used for these images to automatically optimize/resize them.
- **Priority**: High

## 5. File Organization Problems

### Top-Level Experiments Directory

- **File**: `src/experiments/`
- **Type**: Organization
- **Description**: `experiments` sits at the top level of `src`, which is non-standard.
- **Impact**: Clutters `src` root.
- **Recommendation**: Move to `src/components/experiments/`.
- **Priority**: Low

### Page Content Components

- **File**: `src/components/pages/`
- **Type**: Organization
- **Description**: Having a dedicated folder for "Page Content" components (`AboutContent.jsx`, `LabContent.jsx`) that are essentially full pages is a bit unusual.
- **Impact**: Makes it harder to find where a page's logic lives (Astro page vs React component).
- **Recommendation**: If these are main page views, they could live in `src/views` or just be part of the `src/pages` Astro files if they don't need to be React components (though they use `useStore`, so they do).
- **Priority**: Low

## 6. Code Smells

### Prop Drilling for Theme

- **File**: Multiple components
- **Type**: Code Smell
- **Description**: The `theme` object is retrieved from the store in every component and passed down or re-retrieved.
- **Impact**: Repetitive code (`const currentThemeId = useStore(themeId); const theme = THEMES[currentThemeId];`).
- **Recommendation**: Create a custom hook `useTheme()` that returns the current theme object directly, or use a Context Provider if the tree is deep (though Nanostores handles this well, the repetition is the issue).
- **Priority**: Low

## Summary of Automated Checks

- **Depcheck**: Found 3 unused dependencies.
- **JSCPD**: Found 13% duplication in JS files.
- **Knip**: (Not fully run, but manual check confirms unused exports/files).
