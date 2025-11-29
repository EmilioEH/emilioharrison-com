import React, { useState, useEffect } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import Tag from '../../ui/Tag';
import CategoryBadge from '../../ui/CategoryBadge';
import BrutalButton from '../../ui/BrutalButton';
import { useTheme } from '../../../hooks/useTheme';

const SearchFilterBar = ({
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    selectedCategories,
    setSelectedCategories,
    sortOrder,
    setSortOrder,
    allTags,
    allCategories,
    tagsMap = {},
    categoriesMap = {},
    resultCount
}) => {
    const theme = useTheme();
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Toggle tag selection
    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    // Toggle category selection
    const toggleCategory = (category) => {
        if (selectedCategories.includes(category)) {
            setSelectedCategories(selectedCategories.filter(c => c !== category));
        } else {
            setSelectedCategories([...selectedCategories, category]);
        }
    };

    // Clear all filters
    const clearAll = () => {
        setSearchQuery('');
        setSelectedTags([]);
        setSelectedCategories([]);
        setSortOrder('newest');
    };

    const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedCategories.length > 0 || sortOrder !== 'newest';

    return (
        <div className="mb-12 space-y-6">
            {/* Search Input */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="text-gray-400" size={24} strokeWidth={3} />
                </div>
                <input
                    type="text"
                    placeholder="Search field notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`
                        w-full pl-14 pr-4 py-4 text-xl font-bold border-4 border-black bg-white
                        focus:outline-none focus:ring-4 focus:ring-black/20 transition-all
                        placeholder:text-gray-300
                    `}
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-black"
                    >
                        <X size={24} strokeWidth={3} />
                    </button>
                )}
            </div>

            {/* Filter Controls Toggle (Mobile/Desktop) */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="flex items-center gap-2 font-bold uppercase tracking-wider text-sm hover:underline"
                >
                    <Filter size={16} strokeWidth={3} />
                    {isFiltersOpen ? 'Hide Filters' : 'Show Filters'}
                    {isFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-gray-500 font-bold">
                        {resultCount} {resultCount === 1 ? 'Result' : 'Results'}
                    </span>

                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="font-bold border-2 border-black px-2 py-1 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            {/* Expandable Filter Area */}
            {isFiltersOpen && (
                <div className="p-6 border-4 border-black bg-gray-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Categories */}
                        <div>
                            <h3 className="font-black uppercase tracking-widest text-sm mb-4 text-gray-500">Categories</h3>
                            <div className="flex flex-wrap gap-2">
                                {allCategories.map(category => (
                                    <CategoryBadge
                                        key={category}
                                        category={categoriesMap[category] || category}
                                        isActive={selectedCategories.includes(category)}
                                        onClick={() => toggleCategory(category)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <h3 className="font-black uppercase tracking-widest text-sm mb-4 text-gray-500">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {allTags.map(tag => (
                                    <Tag
                                        key={tag}
                                        tag={tagsMap[tag] || tag}
                                        isActive={selectedTags.includes(tag)}
                                        onClick={() => toggleTag(tag)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <div className="mt-8 pt-6 border-t-2 border-gray-200 flex justify-end">
                            <button
                                onClick={clearAll}
                                className="text-red-500 font-bold hover:underline flex items-center gap-1 text-sm uppercase tracking-wider"
                            >
                                <X size={16} /> Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Active Filters Summary (when panel is closed) */}
            {!isFiltersOpen && hasActiveFilters && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-bold uppercase text-gray-400 mr-2">Active:</span>
                    {selectedCategories.map(cat => (
                        <CategoryBadge key={cat} category={categoriesMap[cat] || cat} isActive={true} onClick={() => toggleCategory(cat)} className="scale-90" />
                    ))}
                    {selectedTags.map(tag => (
                        <Tag key={tag} tag={tagsMap[tag] || tag} isActive={true} onClick={() => toggleTag(tag)} className="scale-90" />
                    ))}
                    <button onClick={clearAll} className="ml-2 text-xs font-bold text-red-500 hover:underline">Clear</button>
                </div>
            )}
        </div>
    );
};

export default SearchFilterBar;
