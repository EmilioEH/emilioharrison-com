import React from 'react'
import { ArrowRight } from 'lucide-react'
import SectionTitle from '../../ui/SectionTitle'
import StickyNote from '../../ui/StickyNote'
import { Heading, Text, Label } from '../../ui/Typography'

const FieldNotesSection = ({ posts }) => {
  return (
    <div className="animate-in fade-in relative z-10 space-y-12 duration-500">
      <div className="flex items-end justify-between">
        <SectionTitle>Field Notes</SectionTitle>
        <a
          href="/fieldnotes"
          className="mb-4 border-b-4 border-black transition-colors hover:text-gray-600"
        >
          <Label variant="eyebrow" className="text-xl">
            View All →
          </Label>
        </a>
      </div>

      <div className="grid grid-cols-1 gap-8 px-2 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, idx) => {
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
                          {post.data.category || 'Uncategorized'}
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
                      <div className="mt-auto flex items-center gap-2 pt-4 text-ink">
                        <Label variant="eyebrow" className="flex items-center gap-2">
                          Read <ArrowRight size={18} strokeWidth={3} />
                        </Label>
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
                        {post.data.category || 'Uncategorized'}
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
                    <div className="mt-auto flex items-center gap-2 pt-4 text-ink">
                      <Label variant="eyebrow" className="flex items-center gap-2">
                        Read <ArrowRight size={18} strokeWidth={3} />
                      </Label>
                    </div>
                  </>
                )}
              </StickyNote>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default FieldNotesSection
