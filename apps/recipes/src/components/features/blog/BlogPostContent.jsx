import React from 'react'
import { ArrowRight } from 'lucide-react'

import BrutalCard from '../../ui/BrutalCard'
import StickyNote from '../../ui/StickyNote'
import { useTheme } from '../../../hooks/useTheme'

import Tag from '../../ui/Tag'
import CategoryBadge from '../../ui/CategoryBadge'
import { Heading, Text, Label } from '../../ui/Typography'

/**
 * @param {Object} props
 * @param {Object} props.post
 * @param {string} [props.categoryLabel]
 * @param {Array<{slug: string, label: string}>} props.tagsWithLabels
 * @param {Array<Object>} [props.relatedPosts]
 * @param {Object.<string, string>} [props.categoriesMap]
 * @param {React.ReactNode} props.children
 */
const BlogPostContent = ({
  post,
  categoryLabel,
  tagsWithLabels,
  relatedPosts = [],
  categoriesMap = {},
  children,
}) => {
  const theme = useTheme()

  if (!post) return <div className="py-20 text-center">Post not found</div>

  const displayTags =
    tagsWithLabels || (post.data.tags || []).map((tag) => ({ slug: tag, label: tag }))

  return (
    <div className="animate-in slide-in-from-bottom-8 mx-auto max-w-3xl duration-500">
      <a
        href="/fieldnotes"
        className="mb-8 flex items-center gap-2 font-bold text-inherit no-underline hover:underline"
      >
        <ArrowRight className="rotate-180" size={16} /> Back to Field Notes
      </a>

      <BrutalCard
        theme={theme}
        disableHover={true}
        className="z-1 relative min-h-[60vh] p-4 transition-all duration-500 md:p-12"
      >
        <div className="mb-8">
          {post.data.category && (
            <div className="mb-4 flex items-center gap-2">
              <Label variant="eyebrow" className="text-gray-500">
                Category:
              </Label>
              <a
                href={`/fieldnotes?category=${encodeURIComponent(post.data.category)}&from=${post.slug}`}
                className="no-underline"
              >
                <CategoryBadge
                  category={categoryLabel || post.data.category}
                  className="hover:bg-black hover:text-white"
                />
              </a>
            </div>
          )}
          <Heading variant="display-l" className="mb-6 leading-tight">
            {post.data.title}
          </Heading>

          {post.data.cover && (
            <div className="mb-8">
              <img
                src={post.data.cover.src}
                alt={post.data.coverAlt || post.data.title}
                className={`h-auto w-full border-2 border-black object-cover ${theme.shadow}`}
              />
            </div>
          )}

          <div className="mb-4 flex flex-col gap-1">
            <Text variant="body-l" className="font-bold text-gray-800">
              By: Emilio Harrison
            </Text>
            <Text variant="fine" className="font-mono text-gray-500">
              Published: {new Date(post.data.date).toLocaleDateString()}
            </Text>
          </div>
        </div>

        <hr className={`mb-8 border-t-4 border-black`} />

        <div
          className={`animate-in fade-in prose relative z-10 mx-auto cursor-text duration-500 md:prose-lg prose-headings:font-black prose-p:text-gray-800`}
        >
          <div>{children}</div>
        </div>

        <hr className={`my-8 border-t-4 border-black`} />

        <div className="mb-12 flex flex-wrap items-center gap-2">
          <Label variant="eyebrow" className="text-gray-500">
            Tags:
          </Label>
          {displayTags.map((tagObj) => (
            <a
              key={tagObj.slug}
              href={`/fieldnotes?tags=${encodeURIComponent(tagObj.slug)}&from=${post.slug}`}
              className="no-underline"
            >
              <Tag tag={tagObj.label} className="hover:bg-black hover:text-white" />
            </a>
          ))}
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-12 border-t-2 border-dashed border-gray-300 pt-8">
            <Heading variant="heading-l" className="mb-8">
              Related Field Notes
            </Heading>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost, idx) => {
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

                return (
                  <a
                    key={relatedPost.slug}
                    href={`/fieldnotes/${relatedPost.slug}`}
                    className="group block h-full no-underline"
                  >
                    <StickyNote
                      color={color}
                      rotate={rotate}
                      size="square"
                      variant="action"
                      padding={true}
                      className="flex h-full flex-col transition-colors group-hover:bg-white"
                    >
                      <div className="mb-4 flex items-start justify-between border-b-4 border-black pb-2">
                        <Label
                          variant="tag"
                          className="bg-ink border-2 border-black px-2 py-1 text-white"
                        >
                          {categoriesMap[relatedPost.data.category] ||
                            relatedPost.data.category ||
                            'Uncategorized'}
                        </Label>
                      </div>
                      <Heading
                        variant="heading-s"
                        className="text-ink mb-3 line-clamp-2 leading-tight decoration-black decoration-4 underline-offset-4 group-hover:underline"
                      >
                        {relatedPost.data.title}
                      </Heading>
                      <Text variant="fine" className="mt-auto font-bold text-gray-700">
                        {new Date(relatedPost.data.date).toLocaleDateString()}
                      </Text>
                    </StickyNote>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </BrutalCard>
    </div>
  )
}

export default BlogPostContent
