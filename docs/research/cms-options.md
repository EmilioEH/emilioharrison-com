# CMS Options for Mobile-Friendly Blogging

Based on your current Astro setup, here are the best ways to upgrade your blogging workflow to be iPhone-friendly without sacrificing the performance of your site.

## 1. Keystatic (Recommended)
Keystatic is a modern, "Git-based" CMS that lives entirely in your repository.
*   **How it works**: You visit `your-site.com/keystatic` to access a beautiful admin dashboard.
*   **Mobile Experience**: It has a responsive web interface that works well on mobile.
*   **Pros**:
    *   **No Database**: Saves content directly to your GitHub repo as Markdown/MDX.
    *   **Visual Editor**: No need to touch raw Markdown or frontmatter.
    *   **Image Handling**: Automatically handles image uploads and paths.
    *   **Astro Integration**: Built specifically to work with Astro Content Collections.
*   **Cons**: Requires a GitHub App setup (one-time setup).

## 2. Decap CMS (formerly Netlify CMS)
A veteran open-source Git-based CMS.
*   **How it works**: Adds an `/admin` page to your site.
*   **Mobile Experience**: Functional, but the UI is a bit dated and less "premium" feeling than Keystatic.
*   **Pros**:
    *   Very simple setup (just one HTML file and a config YAML).
    *   Direct GitHub integration.
*   **Cons**: UI is not as polished; real-time preview can be tricky to configure perfectly with Astro components.

## 3. Notion as a CMS
Use the Notion app on your iPhone to write posts, and have Astro pull them in.
*   **How it works**: You write in a specific Notion database. A script or integration fetches posts at build time.
*   **Mobile Experience**: **Best in class**. The Notion iOS app is native and excellent.
*   **Pros**:
    *   Native mobile app experience.
    *   Offline writing support.
*   **Cons**:
    *   **Complexity**: Requires an API integration and a "loader" to sync content.
    *   **Build Step**: You must rebuild the site to see new changes (unless you use SSR).
    *   **Images**: Hosting Notion images can sometimes be tricky (expiring URLs) without a proper plugin.

## Recommendation
**I recommend Keystatic.** It offers the best balance of a "premium" editing experience, keeps your content in your repo (future-proof), and solves the image/frontmatter complexity completely.

If you prefer a **native app** experience above all else and already use Notion, **Notion** is a strong runner-up.
