import React, { useState, useEffect, useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import SectionTitle from '../../ui/SectionTitle'
import StickyNote from '../../ui/StickyNote'
import Button from '../../ui/Button'
import SearchFilterBar from './SearchFilterBar'
import { Heading, Text, Label } from '../../ui/Typography'
import { applyAllFilters } from '../../../lib/filterPosts'

const BlogList = ({
  posts,
  allTags,
  allCategories,
  tagsMap = {},
  categoriesMap = {},
  initialFilters = {},
}) => {
  // State for filters
  const [searchQuery, setSearchQuery] = useState(initialFilters.search || '')
  const [selectedTags, setSelectedTags] = useState(
    initialFilters.tags ? initialFilters.tags.split(',').filter(Boolean) : [],
  )
  const [selectedCategories, setSelectedCategories] = useState(
    initialFilters.category ? [initialFilters.category] : [],
  )
  const [sortOrder, setSortOrder] = useState(initialFilters.sort || 'newest')

  // Filtered posts derived state
  const filteredPosts = useMemo(
    () =>
      applyAllFilters(posts, {
        search: searchQuery,
        tags: selectedTags,
        categories: selectedCategories,
        sort: sortOrder,
      }),
    [posts, searchQuery, selectedTags, selectedCategories, sortOrder],
  )

  // Check for 'from' parameter to show back link
  const [backLink] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const fromSlug = params.get('from')
      return fromSlug ? `/fieldnotes/${fromSlug}` : null
    }
    return null
  })

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','))
    if (sortOrder !== 'newest') params.set('sort', sortOrder)

    // Preserve 'from' parameter if it exists in state
    if (backLink) {
      const fromSlug = backLink.split('/').pop()
      if (fromSlug) params.set('from', fromSlug)
    }

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    window.history.replaceState({}, '', newUrl)
  }, [searchQuery, selectedTags, selectedCategories, sortOrder, backLink])

  return (
    <div className="animate-in fade-in relative z-10 space-y-12 duration-500">
      {backLink && (
        <a
          href={backLink}
          className="mb-4 inline-flex items-center gap-2 font-bold text-gray-600 transition-colors hover:text-black hover:underline"
        >
          <ArrowRight className="rotate-180" size={20} /> Back to Note
        </a>
      )}
      <SectionTitle>Field Notes</SectionTitle>
      <Text variant="body-xl" className="mb-12 max-w-3xl font-medium leading-relaxed text-gray-800">
        Writing about what I'm stuck on, what I'm learning, and what's worth building.
      </Text>

      <SearchFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        allTags={allTags}
        allCategories={allCategories}
        tagsMap={tagsMap}
        categoriesMap={categoriesMap}
        resultCount={filteredPosts.length}
      />

      {filteredPosts.length === 0 ? (
        <div className="rounded-lg border-4 border-dashed border-gray-300 py-20 text-center">
          <p className="mb-4 text-2xl font-bold text-gray-400">No field notes found.</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedTags([])
              setSelectedCategories([])
              setSortOrder('newest')
            }}
            className="font-bold text-black underline hover:text-gray-600"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 px-2 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post, idx) => {
            // Alternate colors/rotations based on index
            const colors = [
              'bg-sticky-yellow',
              'bg-sticky-green',
              'bg-sticky-pink',
              'bg-sticky-blue',
              'bg-sticky-purple',
              'bg-sticky-orange',
            ]
            const color = colors[idx % colors.length]
            const rotate = idx % 2 === 0 ? -1 : 1

            const hasCover = !!post.data.cover
            const size = hasCover ? 'rectangle' : 'square'
            const colSpan = hasCover ? 'md:col-span-2' : ''

            return (
              <a
                key={post.slug}
                href={`/fieldnotes/${post.slug}`}
                className={`group block h-full no-underline ${colSpan}`}
              >
                <StickyNote
                  color={color}
                  rotate={rotate}
                  size={size}
                  variant="action"
                  padding={!hasCover}
                  className="flex h-full flex-col transition-colors group-hover:bg-white"
                >
                  {hasCover ? (
                    <div className="flex h-full flex-col-reverse md:flex-row">
                      <div className="flex flex-1 flex-col p-6 md:p-8">
                        <div className="mb-4 flex items-start justify-between border-b-4 border-black pb-2">
                          <Label
                            variant="tag"
                            className="border-2 border-black bg-ink px-2 py-1 text-white"
                          >
                            {categoriesMap[post.data.category] ||
                              post.data.category ||
                              'Uncategorized'}
                          </Label>
                          <Text variant="fine" className="font-bold text-gray-700">
                            {new Date(post.data.date).toLocaleDateString()}
                          </Text>
                        </div>
                        <Heading
                          variant="heading-m"
                          className="mb-3 leading-tight text-ink decoration-black decoration-4 underline-offset-4 group-hover:underline"
                        >
                          {post.data.title}
                        </Heading>
                        <Text
                          variant="body-base"
                          className="mb-6 line-clamp-3 flex-grow border-l-4 border-black pl-4 font-medium leading-relaxed text-black opacity-80"
                        >
                          {post.data.excerpt}
                        </Text>
                        <div className="mt-auto pt-4">
                          <Button
                            intent="tertiary"
                            className="p-0 hover:bg-transparent hover:text-black"
                          >
                            Read <ArrowRight size={18} strokeWidth={3} />
                          </Button>
                        </div>
                      </div>
                      <div className="relative h-48 w-full border-b-4 border-black md:h-auto md:w-2/5 md:border-b-0 md:border-l-4">
                        <img
                          src={post.data.cover.src}
                          alt={post.data.coverAlt || post.data.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-start justify-between border-b-4 border-black pb-2">
                        <Label
                          variant="tag"
                          className="border-2 border-black bg-ink px-2 py-1 text-white"
                        >
                          {categoriesMap[post.data.category] ||
                            post.data.category ||
                            'Uncategorized'}
                        </Label>
                        <Text variant="fine" className="font-bold text-gray-700">
                          {new Date(post.data.date).toLocaleDateString()}
                        </Text>
                      </div>
                      <Heading
                        variant="heading-m"
                        className="mb-3 leading-tight text-ink decoration-black decoration-4 underline-offset-4 group-hover:underline"
                      >
                        {post.data.title}
                      </Heading>
                      <Text
                        variant="body-base"
                        className="mb-6 line-clamp-3 flex-grow border-l-4 border-black pl-4 font-medium leading-relaxed text-black opacity-80"
                      >
                        {post.data.excerpt}
                      </Text>
                      <div className="mt-auto pt-4">
                        <Button
                          intent="tertiary"
                          className="p-0 hover:bg-transparent hover:text-black"
                        >
                          Read <ArrowRight size={18} strokeWidth={3} />
                        </Button>
                      </div>
                    </>
                  )}
                </StickyNote>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BlogList
