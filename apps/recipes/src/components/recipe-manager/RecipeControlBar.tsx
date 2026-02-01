import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Inline } from '../ui/layout'

interface RecipeControlBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onClearSearch: () => void
  onOpenFilters: () => void
  activeFilterCount: number
  isSearchMode: boolean
  onSearchExpandedChange: (expanded: boolean) => void
}

export const RecipeControlBar: React.FC<RecipeControlBarProps> = ({
  searchQuery,
  onSearchChange,
  onClearSearch,
  onOpenFilters,
  activeFilterCount,
  onSearchExpandedChange,
}) => {
  return (
    <div className="sticky top-[56px] z-30 bg-background/95 pb-2 pt-4 shadow-sm backdrop-blur transition-all">
      <Inline spacing="sm" className="px-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery || ''}
            onFocus={() => onSearchExpandedChange?.(true)}
            onBlur={() => {
              if (!searchQuery) {
                onSearchExpandedChange?.(false)
              }
            }}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-10 w-full rounded-full border border-border bg-secondary/50 pl-9 pr-8 text-sm shadow-sm transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => {
                onClearSearch?.()
                onSearchExpandedChange?.(false)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Button */}
        <button
          onClick={onOpenFilters}
          title="Open Filters"
          aria-label="Open Filters"
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border transition-colors ${
            activeFilterCount > 0
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-muted'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
              {activeFilterCount}
            </span>
          )}
        </button>
      </Inline>
    </div>
  )
}
