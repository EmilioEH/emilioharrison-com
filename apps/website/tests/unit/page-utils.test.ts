import { describe, it, expect } from 'vitest'
import { formatPageList } from '../../src/lib/page-utils'

describe('formatPageList', () => {
  it('should format pages correctly using frontmatter title', () => {
    const pages = [
      {
        url: '/protected/page-1',
        frontmatter: { title: 'Page One', description: 'desc 1' },
      },
    ]
    const result = formatPageList(pages)
    expect(result).toEqual([
      { title: 'Page One', href: '/protected/page-1', description: 'desc 1' },
    ])
  })

  it('should fallback to filename if title is missing', () => {
    const pages = [
      {
        url: '/protected/my-page',
        frontmatter: {},
      },
    ]
    const result = formatPageList(pages)
    expect(result).toEqual([
      { title: 'my-page', href: '/protected/my-page', description: '' },
    ])
  })

  it('should exclude the current index page', () => {
    const pages = [
      { url: '/protected/', frontmatter: { title: 'Dashboard' } },
      { url: '/protected', frontmatter: { title: 'Dashboard' } },
      { url: '/protected/other', frontmatter: { title: 'Other' } },
    ]
    const result = formatPageList(pages, '/protected')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Other')
  })

  it('should sort pages alphabetically by title', () => {
    const pages = [
      { url: '/p/b', frontmatter: { title: 'Zebra' } },
      { url: '/p/a', frontmatter: { title: 'Alpha' } },
    ]
    const result = formatPageList(pages)
    expect(result[0].title).toBe('Alpha')
    expect(result[1].title).toBe('Zebra')
  })
})
