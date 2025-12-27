import React from 'react'
import { Search, ListFilter, ChevronDown } from 'lucide-react'

export const LibraryToolbar = ({
  searchQuery,
  setSearchQuery,
  sort,
  setSort,
  onOpenFilters,
  activeFilterCount = 0,
}) => {
  const sortOptions = [
    { id: 'protein', label: 'Protein' },
    { id: 'mealType', label: 'Meal Type' },
    { id: 'dishType', label: 'Dish Type' },
    { id: 'alpha', label: 'A-Z' },
    { id: 'recent', label: 'Recent' },
    { id: 'time', label: 'Time' },
    { id: 'rating', label: 'Rating' },
  ]

  return (
    <div className="flex items-center gap-2 border-b border-md-sys-color-outline bg-md-sys-color-surface px-4 py-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-md-sys-color-on-surface-variant" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="placeholder:text-md-sys-color-on-surface-variant/50 w-full rounded-full border border-md-sys-color-outline bg-md-sys-color-surface-variant py-2 pl-9 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-md-sys-color-primary"
        />
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="appearance-none rounded-full border border-md-sys-color-outline bg-md-sys-color-surface py-2 pl-3 pr-8 text-sm font-medium text-md-sys-color-on-surface outline-none focus:ring-2 focus:ring-md-sys-color-primary"
        >
          {sortOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-md-sys-color-on-surface-variant" />
      </div>

      {/* Filter Button */}
      <button
        onClick={onOpenFilters}
        className="relative rounded-full border border-md-sys-color-outline bg-md-sys-color-surface p-2 transition-colors hover:bg-md-sys-color-surface-variant"
        aria-label="Open Filters"
      >
        <ListFilter className="h-5 w-5 text-md-sys-color-on-surface-variant" />
        {activeFilterCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-md-sys-color-primary text-[10px] font-bold text-md-sys-color-on-primary">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  )
}
