import React from 'react';
import { ArrowRight } from 'lucide-react';
import SectionTitle from '../../ui/SectionTitle';
import StickyNote from '../../ui/StickyNote';
import { Heading, Text, Label } from '../../ui/Typography';

const FieldNotesSection = ({ posts }) => {
    return (
        <div className="space-y-12 animate-in fade-in duration-500 relative z-10">
            <div className="flex justify-between items-end">
                <SectionTitle>Field Notes</SectionTitle>
                <a href="/fieldnotes" className="border-b-4 border-black hover:text-gray-600 transition-colors mb-4">
                    <Label variant="eyebrow" className="text-xl">View All →</Label>
                </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                {posts.map((post, idx) => {
                    // Alternate colors/rotations based on index
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

                    const hasCover = !!post.data.cover;
                    const size = hasCover ? 'rectangle' : 'square';
                    const colSpan = hasCover ? 'md:col-span-2' : '';

                    return (
                        <a key={post.slug} href={`/fieldnotes/${post.slug}`} className={`no-underline block h-full group ${colSpan}`}>
                            <StickyNote color={color} rotate={rotate} size={size} variant="action" padding={!hasCover} className="h-full flex flex-col group-hover:bg-white transition-colors">
                                {hasCover ? (
                                    <div className="flex flex-col-reverse md:flex-row h-full">
                                        <div className="flex-1 p-6 md:p-8 flex flex-col">
                                            <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-2">
                                                <Label variant="tag" className="text-white px-2 py-1 bg-ink border-2 border-black">
                                                    {post.data.category || 'Uncategorized'}
                                                </Label>
                                                <Text variant="fine" className="font-bold text-gray-700">{new Date(post.data.date).toLocaleDateString()}</Text>
                                            </div>
                                            <Heading variant="heading-m" className="mb-3 leading-tight group-hover:underline decoration-4 underline-offset-4 decoration-black text-ink">
                                                {post.data.title}
                                            </Heading>
                                            <Text variant="body-base" className="text-black mb-6 flex-grow leading-relaxed font-medium border-l-4 border-black pl-4 opacity-80 line-clamp-3">
                                                {post.data.excerpt}
                                            </Text>
                                            <div className="mt-auto pt-4 flex items-center gap-2 text-ink">
                                                <Label variant="eyebrow" className="flex items-center gap-2">Read <ArrowRight size={18} strokeWidth={3} /></Label>
                                            </div>
                                        </div>
                                        <div className="w-full md:w-2/5 h-48 md:h-auto relative border-b-4 md:border-b-0 md:border-l-4 border-black">
                                            <img
                                                src={post.data.cover.src}
                                                alt={post.data.coverAlt || post.data.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-2">
                                            <Label variant="tag" className="text-white px-2 py-1 bg-ink border-2 border-black">
                                                {post.data.category || 'Uncategorized'}
                                            </Label>
                                            <Text variant="fine" className="font-bold text-gray-700">{new Date(post.data.date).toLocaleDateString()}</Text>
                                        </div>
                                        <Heading variant="heading-m" className="mb-3 leading-tight group-hover:underline decoration-4 underline-offset-4 decoration-black text-ink">
                                            {post.data.title}
                                        </Heading>
                                        <Text variant="body-base" className="text-black mb-6 flex-grow leading-relaxed font-medium border-l-4 border-black pl-4 opacity-80 line-clamp-3">
                                            {post.data.excerpt}
                                        </Text>
                                        <div className="mt-auto pt-4 flex items-center gap-2 text-ink">
                                            <Label variant="eyebrow" className="flex items-center gap-2">Read <ArrowRight size={18} strokeWidth={3} /></Label>
                                        </div>
                                    </>
                                )}
                            </StickyNote>
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default FieldNotesSection;
