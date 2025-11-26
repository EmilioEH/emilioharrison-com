import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionTitle from './ui/SectionTitle';
import BrutalCard from './ui/BrutalCard';
import { BLOG_POSTS } from '../lib/content';

const BlogList = ({ theme }) => {
    const navigate = useNavigate();
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <SectionTitle theme={theme}>Field Notes</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {BLOG_POSTS.map(post => (
                    <BrutalCard
                        key={post.id}
                        theme={theme}
                        className="flex flex-col h-full group"
                        onClick={() => navigate(`/fieldnotes/${post.slug}`)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-xs font-bold border-2 ${theme.id === 'blueprint' ? 'border-blue-200 bg-blue-900 text-blue-100' : 'border-black bg-yellow-200 text-black'} px-2 py-0.5`}>
                                {post.category}
                            </span>
                            <span className={`text-sm font-medium ${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-500'}`}>{post.date}</span>
                        </div>
                        <h3 className="text-2xl font-black mb-3 leading-tight group-hover:underline decoration-2 underline-offset-2">
                            {post.title}
                        </h3>
                        <p className={`${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-600'} mb-6 flex-grow leading-relaxed line-clamp-3`}>
                            {post.excerpt}
                        </p>
                        <button
                            className={`flex items-center gap-2 font-bold mt-auto border-b-2 border-transparent w-fit pb-0.5 ${theme.id === 'blueprint' ? 'hover:border-blue-200' : 'hover:border-black'}`}
                        >
                            Read Article <ArrowRight size={16} />
                        </button>
                    </BrutalCard>
                ))}
            </div>
        </div>
    )
};

export default BlogList;
