import React, { useState } from 'react';
import { ArrowRight, FileText, Zap } from 'lucide-react';

import Button from '../../ui/Button';
import BrutalCard from '../../ui/BrutalCard';
import { useTheme } from '../../../hooks/useTheme';

import Tag from '../../ui/Tag';
import CategoryBadge from '../../ui/CategoryBadge';
import { Heading, Text, Label } from '../../ui/Typography';

const BlogPostContent = ({ post, categoryLabel, tagsWithLabels, children }) => {
    const theme = useTheme();
    const [readMode, setReadMode] = useState('deep');

    if (!post) return <div className="text-center py-20">Post not found</div>;

    const displayTags = tagsWithLabels || (post.data.tags || []).map(tag => ({ slug: tag, label: tag }));

    return (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
            <a href="/fieldnotes" className="mb-8 font-bold flex items-center gap-2 hover:underline no-underline text-inherit">
                <ArrowRight className="rotate-180" size={16} /> Back to Field Notes
            </a>

            <div className={`sticky top-24 z-40 mb-8 p-2 ${theme.colors.card} ${theme.border} ${theme.shadow} flex justify-between items-center transition-all duration-300`}>
                <span className="font-bold text-sm uppercase tracking-widest pl-2 hidden md:block">Reading Mode:</span>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button onClick={() => setReadMode('deep')} intent={readMode === 'deep' ? 'primary' : 'secondary'}>
                        <FileText size={16} /> Deep Dive
                    </Button>
                    <Button onClick={() => setReadMode('skim')} intent={readMode === 'skim' ? 'primary' : 'secondary'}>
                        <Zap size={16} /> Skim
                    </Button>
                </div>
            </div>

            <BrutalCard theme={theme} className="p-8 md:p-12 min-h-[60vh] transition-all duration-500">
                <div className="mb-8">
                    {post.data.category && (
                        <div className="mb-4 flex items-center gap-2">
                            <Label variant="eyebrow" className="text-gray-500">Category:</Label>
                            <a href={`/fieldnotes?category=${encodeURIComponent(post.data.category)}&from=${post.slug}`} className="no-underline">
                                <CategoryBadge category={categoryLabel || post.data.category} className="hover:bg-black hover:text-white" />
                            </a>
                        </div>
                    )}
                    <Heading variant="display-l" className="mb-2 leading-tight">{post.data.title}</Heading>
                    <Text variant="body-l" className="font-bold text-gray-800 mb-1">By: Emilio Harrison</Text>
                    <Text variant="fine" className="font-mono text-gray-500 mb-4">Published: {post.data.date}</Text>
                    <div className="flex flex-wrap items-center gap-2">
                        <Label variant="eyebrow" className="text-gray-500">Tags:</Label>
                        {displayTags.map(tagObj => (
                            <a key={tagObj.slug} href={`/fieldnotes?tags=${encodeURIComponent(tagObj.slug)}&from=${post.slug}`} className="no-underline">
                                <Tag tag={tagObj.label} className="hover:bg-black hover:text-white" />
                            </a>
                        ))}
                    </div>
                </div>

                <hr className={`border-t-4 border-black mb-8`} />

                {post.data.cover && (
                    <div className="mb-8">
                        <img
                            src={post.data.cover.src}
                            alt={post.data.coverAlt || post.data.title}
                            className={`w-full h-auto object-cover border-2 border-black ${theme.shadow}`}
                        />
                    </div>
                )}

                {readMode === 'deep' ? (
                    <div className={`prose prose-lg prose-headings:font-black prose-p:text-gray-800 animate-in fade-in duration-500`}>

                        <div>
                            {/* Content is now passed as children from Astro */}
                            {children}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <div className={`${theme.colors.accent} p-4 border-2 border-black mb-8 flex items-center gap-2 ${theme.shadow} text-black`}>
                            <Zap /> <Heading variant="heading-m">TL;DR — THE UTILITY</Heading>
                        </div>
                        <div className="grid gap-6">
                            {post.data.takeaways ? post.data.takeaways.map((takeaway, idx) => (
                                <div key={idx} className="group">
                                    <Heading variant="heading-s" className="mb-2 flex items-center gap-3">
                                        <span className={`bg-black text-white w-8 h-8 flex items-center justify-center text-sm rounded-full`}>{idx + 1}</span>
                                        {takeaway.title}
                                    </Heading>
                                    <Text variant="body-l" className={`leading-relaxed border-l-4 pl-6 py-2 transition-colors border-gray-200 text-gray-800 group-hover:border-teal`}>
                                        {takeaway.text}
                                    </Text>
                                </div>
                            )) : (
                                <Text>No summary available for this post.</Text>
                            )}
                        </div>
                        <div className={`mt-12 p-6 border-2 border-dashed text-center border-black`}>
                            <Text variant="body-base" className={`font-bold mb-4 text-gray-500`}>Interested in the context behind these insights?</Text>
                            <button onClick={() => setReadMode('deep')} className={`underline font-black text-lg hover:${theme.colors.highlight}`}>
                                Switch to Deep Dive
                            </button>
                        </div>
                    </div>
                )}
            </BrutalCard>
        </div>
    );
};

export default BlogPostContent;
