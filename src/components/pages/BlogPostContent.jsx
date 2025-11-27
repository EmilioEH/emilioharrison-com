import React, { useState } from 'react';
import { ArrowRight, FileText, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import BrutalButton from '../ui/BrutalButton';
import BrutalCard from '../ui/BrutalCard';
import { useStore } from '@nanostores/react';
import { themeId } from '../../lib/store';
import { THEMES } from '../../lib/themes';

const BlogPostContent = ({ post }) => {
    const currentThemeId = useStore(themeId);
    const theme = THEMES[currentThemeId];
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
                <div className={`mb-8 border-b-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} pb-6`}>
                    <span className={`inline-block ${theme.colors.accent} border-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} px-3 py-1 font-bold text-sm mb-4 text-black`}>
                        {post.category}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">{post.title}</h1>
                    <p className={`${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-500'} font-medium`}>Published on {post.date} • By Emilio Harrison</p>
                </div>

                {readMode === 'deep' ? (
                    <div className={`prose prose-lg prose-headings:font-black ${theme.id === 'blueprint' ? 'prose-invert prose-p:text-blue-100 prose-headings:text-blue-50' : 'prose-p:text-gray-800'} animate-in fade-in duration-500`}>
                        <p className="lead text-xl font-medium mb-6 italic">{post.excerpt}</p>
                        <div>
                            <ReactMarkdown
                                components={{
                                    img: ({ node, ...props }) => <img {...props} className="rounded-lg border-2 border-black shadow-lg my-8" />,
                                    code: ({ node, inline, className, children, ...props }) => {
                                        return !inline ? (
                                            <pre className={`bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6 border-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>
                                                <code {...props} className={className}>
                                                    {children}
                                                </code>
                                            </pre>
                                        ) : (
                                            <code {...props} className={`bg-gray-200 text-red-600 px-1 py-0.5 rounded font-mono text-sm`}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {post.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right-4 duration-300">
                        <div className={`${theme.colors.accent} p-4 border-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} font-black text-xl mb-8 flex items-center gap-2 ${theme.shadow} text-black`}>
                            <Zap /> TL;DR — THE UTILITY
                        </div>
                        <div className="grid gap-6">
                            {post.takeaways ? post.takeaways.map((takeaway, idx) => (
                                <div key={idx} className="group">
                                    <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                                        <span className={`${theme.id === 'blueprint' ? 'bg-blue-200 text-blue-900' : 'bg-black text-white'} w-8 h-8 flex items-center justify-center text-sm rounded-full`}>{idx + 1}</span>
                                        {takeaway.title}
                                    </h3>
                                    <p className={`text-xl leading-relaxed border-l-4 pl-6 py-2 transition-colors ${theme.id === 'blueprint' ? 'border-blue-800 text-blue-100 group-hover:border-blue-400' : 'border-gray-200 text-gray-800 group-hover:border-[#2a9d8f]'}`}>
                                        {takeaway.text}
                                    </p>
                                </div>
                            )) : (
                                <p>No summary available for this post.</p>
                            )}
                        </div>
                        <div className={`mt-12 p-6 border-2 border-dashed text-center ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>
                            <p className={`font-bold mb-4 ${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-500'}`}>Interested in the context behind these insights?</p>
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
