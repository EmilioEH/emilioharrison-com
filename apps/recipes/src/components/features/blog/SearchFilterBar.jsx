import React, { useState } from 'react'
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import Tag from '../../ui/Tag'
import CategoryBadge from '../../ui/CategoryBadge'
import { Text, Label } from '../../ui/Typography'

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
  resultCount,
}) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Toggle tag selection
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  // Toggle category selection
  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  // Clear all filters
  const clearAll = () => {
    setSearchQuery('')
    setSelectedTags([])
    setSelectedCategories([])
    setSortOrder('newest')
  }

  const hasActiveFilters =
    searchQuery ||
    selectedTags.length > 0 ||
    selectedCategories.length > 0 ||
    sortOrder !== 'newest'

  return (
    <div className="mb-12 space-y-6">
      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className="text-gray-400" size={24} strokeWidth={3} />
        </div>
        <input
          type="text"
          placeholder="Search field notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full border-4 border-black bg-white py-4 pl-14 pr-4 font-body text-xl font-bold transition-all placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-black/20`}
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
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:underline"
        >
          <Filter size={16} strokeWidth={3} />
          <Label variant="eyebrow">{isFiltersOpen ? 'Hide Filters' : 'Show Filters'}</Label>
          {isFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <div className="flex items-center gap-4">
          <Text variant="fine" className="font-bold text-gray-500">
            {resultCount} {resultCount === 1 ? 'Result' : 'Results'}
          </Text>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="cursor-pointer border-2 border-black bg-white px-2 py-1 font-body font-bold focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Expandable Filter Area */}
      {isFiltersOpen && (
        <div className="animate-in slide-in-from-top-2 border-4 border-black bg-gray-50 p-6 duration-200">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Categories */}
            <div>
              <Label variant="eyebrow" className="mb-4 text-gray-500">
                Categories
              </Label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((category) => (
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
              <Label variant="eyebrow" className="mb-4 text-gray-500">
                Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
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
            <div className="mt-8 flex justify-end border-t-2 border-gray-200 pt-6">
              <button
                onClick={clearAll}
                className="flex items-center gap-1 font-bold uppercase tracking-wider text-red-500 hover:underline"
              >
                <Label variant="eyebrow" className="flex items-center gap-1">
                  <X size={16} /> Clear All Filters
                </Label>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Summary (when panel is closed) */}
      {!isFiltersOpen && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Label variant="eyebrow" className="mr-2 text-gray-400">
            Active:
          </Label>
          {selectedCategories.map((cat) => (
            <CategoryBadge
              key={cat}
              category={categoriesMap[cat] || cat}
              isActive={true}
              onClick={() => toggleCategory(cat)}
              className="scale-90"
            />
          ))}
          {selectedTags.map((tag) => (
            <Tag
              key={tag}
              tag={tagsMap[tag] || tag}
              isActive={true}
              onClick={() => toggleTag(tag)}
              className="scale-90"
            />
          ))}
          <button
            onClick={clearAll}
            className="ml-2 text-xs font-bold text-red-500 hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default SearchFilterBar
