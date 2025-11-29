import React, { useState } from 'react';
import { ArrowRight, FileText, Zap } from 'lucide-react';

import BrutalButton from '../../ui/BrutalButton';
import BrutalCard from '../../ui/BrutalCard';
import { useTheme } from '../../../hooks/useTheme';

import Tag from '../../ui/Tag';
import CategoryBadge from '../../ui/CategoryBadge';

const BlogPostContent = ({ post, children }) => {
    const theme = useTheme();
    const [readMode, setReadMode] = useState('deep');

    if (!post) return <div className="text-center py-20">Post not found</div>;

    return (
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
            <a href="/fieldnotes" className="mb-8 font-bold flex items-center gap-2 hover:underline no-underline text-inherit">
                <ArrowRight className="rotate-180" size={16} /> Back to Field Notes
            </a>

            <div className={`sticky top-24 z-40 mb-8 p-2 ${theme.colors.card} ${theme.border} ${theme.shadow} flex justify-between items-center transition-all duration-300`}>
                <span className="font-bold text-sm uppercase tracking-widest pl-2 hidden md:block">Reading Mode:</span>
                <div className="flex gap-2 w-full md:w-auto">
                    <BrutalButton theme={theme} onClick={() => setReadMode('deep')} active={readMode === 'deep'} color={readMode === 'deep' ? theme.colors.primary : theme.colors.card} className={readMode === 'deep' ? 'text-white' : ''}>
                        <FileText size={16} /> Deep Dive
                    </BrutalButton>
                    <BrutalButton theme={theme} onClick={() => setReadMode('skim')} active={readMode === 'skim'} color={readMode === 'skim' ? theme.colors.accent : theme.colors.card} className={readMode === 'skim' ? 'text-black' : ''}>
                        <Zap size={16} /> Skim
                    </BrutalButton>
                </div>
            </div>

            <BrutalCard theme={theme} className="p-8 md:p-12 min-h-[60vh] transition-all duration-500">
                <div className="mb-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {post.data.category && (
                            <a href={`/fieldnotes?category=${encodeURIComponent(post.data.category)}`} className="no-underline">
                                <CategoryBadge category={post.data.category} className="hover:bg-black hover:text-white" />
                            </a>
                        )}
                        {post.data.tags && post.data.tags.map(tag => (
                            <a key={tag} href={`/fieldnotes?tags=${encodeURIComponent(tag)}`} className="no-underline">
                                <Tag tag={tag} className="hover:bg-black hover:text-white" />
                            </a>
                        ))}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-2 leading-tight">{post.data.title}</h1>
                    <p className={`text-xl font-bold text-gray-800 mb-1`}>By: Emilio Harrison</p>
                    <p className={`text-sm font-mono text-gray-500`}>Published: {post.data.date}</p>
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
                        <p className="lead text-xl font-medium mb-6 italic">{post.data.excerpt}</p>
                        <div>
                            {/* Content is now passed as children from Astro */}
                            {children}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <div className={`${theme.colors.accent} p-4 border-2 border-black font-black text-xl mb-8 flex items-center gap-2 ${theme.shadow} text-black`}>
                            <Zap /> TL;DR — THE UTILITY
                        </div>
                        <div className="grid gap-6">
                            {post.data.takeaways ? post.data.takeaways.map((takeaway, idx) => (
                                <div key={idx} className="group">
                                    <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                                        <span className={`bg-black text-white w-8 h-8 flex items-center justify-center text-sm rounded-full`}>{idx + 1}</span>
                                        {takeaway.title}
                                    </h3>
                                    <p className={`text-xl leading-relaxed border-l-4 pl-6 py-2 transition-colors border-gray-200 text-gray-800 group-hover:border-teal`}>
                                        {takeaway.text}
                                    </p>
                                </div>
                            )) : (
                                <p>No summary available for this post.</p>
                            )}
                        </div>
                        <div className={`mt-12 p-6 border-2 border-dashed text-center border-black`}>
                            <p className={`font-bold mb-4 text-gray-500`}>Interested in the context behind these insights?</p>
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
