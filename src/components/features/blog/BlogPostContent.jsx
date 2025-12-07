import React from 'react';
import { ArrowRight } from 'lucide-react';

import BrutalCard from '../../ui/BrutalCard';
import StickyNote from '../../ui/StickyNote';
import { useTheme } from '../../../hooks/useTheme';

import Tag from '../../ui/Tag';
import CategoryBadge from '../../ui/CategoryBadge';
import { Heading, Text, Label } from '../../ui/Typography';

/**
 * @param {Object} props
 * @param {Object} props.post
 * @param {string} [props.categoryLabel]
 * @param {Array<{slug: string, label: string}>} props.tagsWithLabels
 * @param {Array<Object>} [props.relatedPosts]
 * @param {Object.<string, string>} [props.categoriesMap]
 * @param {React.ReactNode} props.children
 */
const BlogPostContent = ({ post, categoryLabel, tagsWithLabels, relatedPosts = [], categoriesMap = {}, children }) => {
    const theme = useTheme();

    if (!post) return <div className="text-center py-20">Post not found</div>;

    const displayTags = tagsWithLabels || (post.data.tags || []).map(tag => ({ slug: tag, label: tag }));

    return (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
            <a href="/fieldnotes" className="mb-8 font-bold flex items-center gap-2 hover:underline no-underline text-inherit">
                <ArrowRight className="rotate-180" size={16} /> Back to Field Notes
            </a>

            <BrutalCard theme={theme} disableHover={true} className="p-4 md:p-12 min-h-[60vh] transition-all duration-500 relative z-1">
                <div className="mb-8">
                    {post.data.category && (
                        <div className="mb-4 flex items-center gap-2">
                            <Label variant="eyebrow" className="text-gray-500">Category:</Label>
                            <a href={`/fieldnotes?category=${encodeURIComponent(post.data.category)}&from=${post.slug}`} className="no-underline">
                                <CategoryBadge category={categoryLabel || post.data.category} className="hover:bg-black hover:text-white" />
                            </a>
                        </div>
                    )}
                    <Heading variant="display-l" className="mb-6 leading-tight">{post.data.title}</Heading>

                    {post.data.cover && (
                        <div className="mb-8">
                            <img
                                src={post.data.cover.src}
                                alt={post.data.coverAlt || post.data.title}
                                className={`w-full h-auto object-cover border-2 border-black ${theme.shadow}`}
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1 mb-4">
                        <Text variant="body-l" className="font-bold text-gray-800">By: Emilio Harrison</Text>
                        <Text variant="fine" className="font-mono text-gray-500">Published: {new Date(post.data.date).toLocaleDateString()}</Text>
                    </div>
                </div>

                <hr className={`border-t-4 border-black mb-8`} />

                <div className={`prose md:prose-lg prose-headings:font-black prose-p:text-gray-800 animate-in fade-in duration-500 mx-auto relative z-10 cursor-text`}>
                    <div>
                        {children}
                    </div>
                </div>

                <hr className={`border-t-4 border-black my-8`} />

                <div className="flex flex-wrap items-center gap-2 mb-12">
                    <Label variant="eyebrow" className="text-gray-500">Tags:</Label>
                    {displayTags.map(tagObj => (
                        <a key={tagObj.slug} href={`/fieldnotes?tags=${encodeURIComponent(tagObj.slug)}&from=${post.slug}`} className="no-underline">
                            <Tag tag={tagObj.label} className="hover:bg-black hover:text-white" />
                        </a>
                    ))}
                </div>

                {relatedPosts.length > 0 && (
                    <div className="mt-12 pt-8 border-t-2 border-dashed border-gray-300">
                        <Heading variant="heading-l" className="mb-8">Related Field Notes</Heading>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {relatedPosts.map((relatedPost, idx) => {
                                const colors = [
                                    'bg-sticky-yellow',
                                    'bg-sticky-green',
                                    'bg-sticky-pink',
                                    'bg-sticky-blue',
                                    'bg-sticky-purple',
                                    'bg-sticky-orange'
                                ];
                                const color = colors[idx % colors.length];
                                const rotate = idx % 2 === 0 ? -1 : 1;

                                return (
                                    <a key={relatedPost.slug} href={`/fieldnotes/${relatedPost.slug}`} className="no-underline block h-full group">
                                        <StickyNote color={color} rotate={rotate} size="square" variant="action" padding={true} className="h-full flex flex-col group-hover:bg-white transition-colors">
                                            <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-2">
                                                <Label variant="tag" className="text-white px-2 py-1 bg-ink border-2 border-black">
                                                    {categoriesMap[relatedPost.data.category] || relatedPost.data.category || 'Uncategorized'}
                                                </Label>
                                            </div>
                                            <Heading variant="heading-s" className="mb-3 leading-tight group-hover:underline decoration-4 underline-offset-4 decoration-black text-ink line-clamp-2">
                                                {relatedPost.data.title}
                                            </Heading>
                                            <Text variant="fine" className="font-bold text-gray-700 mt-auto">{new Date(relatedPost.data.date).toLocaleDateString()}</Text>
                                        </StickyNote>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}
            </BrutalCard>
        </div>
    );
};

export default BlogPostContent;
