import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import SectionTitle from '../../ui/SectionTitle';
import StickyNote from '../../ui/StickyNote';
import SearchFilterBar from './SearchFilterBar';
import { applyAllFilters } from '../../../lib/filterPosts';

const BlogList = ({ posts, allTags, allCategories, tagsMap = {}, categoriesMap = {}, initialFilters = {} }) => {
    // State for filters
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [selectedTags, setSelectedTags] = useState(initialFilters.tags ? initialFilters.tags.split(',').filter(Boolean) : []);
    const [selectedCategories, setSelectedCategories] = useState(initialFilters.category ? [initialFilters.category] : []);
    const [sortOrder, setSortOrder] = useState(initialFilters.sort || 'newest');

    // Filtered posts state
    const [filteredPosts, setFilteredPosts] = useState(posts);

    // Check for 'from' parameter to show back link
    const [backLink, setBackLink] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const fromSlug = params.get('from');
            return fromSlug ? `/fieldnotes/${fromSlug}` : null;
        }
        return null;
    });

    // Update URL when filters change
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
        if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','));
        if (sortOrder !== 'newest') params.set('sort', sortOrder);

        // Preserve 'from' parameter if it exists in state
        if (backLink) {
            const fromSlug = backLink.split('/').pop();
            if (fromSlug) params.set('from', fromSlug);
        }

        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);

        // Apply filters
        const results = applyAllFilters(posts, {
            search: searchQuery,
            tags: selectedTags,
            categories: selectedCategories,
            sort: sortOrder
        });
        setFilteredPosts(results);
    }, [searchQuery, selectedTags, selectedCategories, sortOrder, posts, backLink]);

    return (
        <div className="space-y-12 animate-in fade-in duration-500 relative z-10">
            {backLink && (
                <a href={backLink} className="inline-flex items-center gap-2 font-bold hover:underline mb-4 text-gray-600 hover:text-black transition-colors">
                    <ArrowRight className="rotate-180" size={20} /> Back to Note
                </a>
            )}
            <SectionTitle>Field Notes</SectionTitle>

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
                <div className="text-center py-20 border-4 border-dashed border-gray-300 rounded-lg">
                    <p className="text-2xl font-bold text-gray-400 mb-4">No field notes found.</p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setSelectedTags([]);
                            setSelectedCategories([]);
                            setSortOrder('newest');
                        }}
                        className="text-black font-bold underline hover:text-gray-600"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
                    {filteredPosts.map((post, idx) => {
                        // Alternate colors/rotations based on index
                        const colors = ['bg-mustard', 'bg-teal', 'bg-coral'];
                        const color = colors[idx % colors.length];
                        const rotate = idx % 2 === 0 ? -1 : 1;

                        return (
                            <a key={post.slug} href={`/fieldnotes/${post.slug}`} className="no-underline block h-full group">
                                <StickyNote color={color} rotate={rotate} className="h-full flex flex-col group-hover:bg-white transition-colors">
                                    <div className="flex justify-between items-start mb-4 border-b-4 border-black pb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-white px-2 py-1 bg-ink border-2 border-black">
                                            {categoriesMap[post.data.category] || post.data.category || 'Uncategorized'}
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
            )}
        </div>
    );
};

export default BlogList;
