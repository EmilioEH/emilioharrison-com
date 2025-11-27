import React from 'react';
import { ArrowRight } from 'lucide-react';
import SectionTitle from '../../ui/SectionTitle';
import StickyNote from '../../ui/StickyNote';

const BlogList = ({ posts }) => {
    return (
        <div className="space-y-12 animate-in fade-in duration-500 relative z-10">
            <SectionTitle>Field Notes</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                {posts.map((post, idx) => {
                    // Alternate colors/rotations based on index
                    const colors = ['bg-mustard', 'bg-teal', 'bg-coral'];
                    const color = colors[idx % colors.length];
                    const rotate = idx % 2 === 0 ? -1 : 1;

                    return (
                        <a key={post.slug} href={`/fieldnotes/${post.slug}`} className="no-underline block h-full group">
                            <StickyNote color={color} rotate={rotate} className="h-full flex flex-col group-hover:bg-white transition-colors">
                                <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-white px-2 py-1 bg-ink border-2 border-black">
                                        {post.data.category}
                                    </span>
                                    <span className="text-sm font-bold text-gray-700">{new Date(post.data.date).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-2xl font-black mb-3 leading-tight group-hover:underline decoration-4 underline-offset-4 decoration-black text-ink">
                                    {post.data.title}
                                </h3>
                                <p className="text-black mb-6 flex-grow leading-relaxed font-medium border-l-4 border-black pl-4 opacity-80 line-clamp-3">
                                    {post.data.excerpt}
                                </p>
                                <div className="mt-auto pt-4 flex items-center gap-2 font-black text-sm uppercase tracking-wider text-ink">
                                    Read <ArrowRight size={18} strokeWidth={3} />
                                </div>
                            </StickyNote>
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default BlogList;
