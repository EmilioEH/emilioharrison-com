export interface PageLink {
  title: string
  href: string
  description?: string
}

export interface AstroPageGlob {
  url?: string
  frontmatter?: Record<string, unknown>
  file?: string
}

/**
 * Formats a list of Astro page globs into a list of links.
 * fast-glob / Astro.glob returns objects with url, frontmatter, etc.
 *
 * @param pages - Array of page modules from Astro.glob
 * @param currentPath - The current page's path (to exclude self/index)
 * @returns Array of PageLink objects
 */
export function formatPageList(
  pages: AstroPageGlob[],
  currentPath: string = '/protected'
): PageLink[] {
  return pages
    .filter((page) => {
      // Filter out files that don't have a URL (shouldn't happen for pages)
      if (!page.url) return false
      
      // Filter out the index page itself
      // We assume the index page is the one matching currentPath or ends in /protected/
      if (page.url === currentPath || page.url === currentPath + '/') return false
      
      // Also filter out explicitly hidden pages if we add that feature later
      return true
    })
    .map((page) => {
      const url = page.url || ''
      // Fallback title to the last segment of the URL (filename-ish)
      const fallbackTitle = url.split('/').filter(Boolean).pop() || 'Untitled'
      
      const title = typeof page.frontmatter?.title === 'string' 
        ? page.frontmatter.title 
        : fallbackTitle
      
      const description = typeof page.frontmatter?.description === 'string'
        ? page.frontmatter.description
        : ''

      return {
        title,
        href: url,
        description,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}
