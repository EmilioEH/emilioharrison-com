import React from 'react'
import { Search, ListFilter, ChevronDown, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LibraryToolbarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  sort: string
  setSort: (sort: string) => void
  onOpenFilters: () => void
  activeFilterCount?: number
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
}

export const LibraryToolbar: React.FC<LibraryToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  sort,
  setSort,
  onOpenFilters,
  activeFilterCount = 0,
  viewMode,
  setViewMode,
}) => {
  const sortOptions = [
    { id: 'protein', label: 'Protein' },
    { id: 'mealType', label: 'Meal Type' },
    { id: 'dishType', label: 'Dish Type' },
    { id: 'alpha', label: 'A-Z' },
    { id: 'recent', label: 'Recent' },
    { id: 'time', label: 'Time' },
    { id: 'rating', label: 'Rating' },
    { id: 'cost-low', label: 'Cheapest' },
    { id: 'cost-high', label: 'Pricey' },
  ]

  return (
    <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* View Mode Toggle */}
      <div className="hidden items-center gap-1 rounded-full border border-border bg-card p-1 sm:flex">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setViewMode('grid')}
          aria-label="Grid View"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setViewMode('list')}
          aria-label="List View"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>

      {/* Sort Dropdown */}
      <div className="relative">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 appearance-none rounded-full border border-border bg-card py-2 pl-3 pr-8 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary"
        >
          {sortOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Filter Button */}
      <button
        onClick={onOpenFilters}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-all hover:bg-muted"
        aria-label="Open Filters"
      >
        <ListFilter className="h-5 w-5 text-muted-foreground" />
        {activeFilterCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeFilterCount}
          </span>
        )}
      </button>
    </div>
  )
}
