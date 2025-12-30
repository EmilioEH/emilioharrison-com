import React from 'react'
import { Search, ListFilter, LayoutGrid, List, ChefHat, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { ViewMode } from './RecipeManager'

interface BottomControlsProps {
  view: ViewMode
  setView: (view: ViewMode) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  viewMode: 'grid' | 'list'
  setViewMode: (mode: 'grid' | 'list') => void
  onOpenFilters: () => void
  activeFilterCount: number
  recipeCount: number
  weekCount: number
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  view,
  setView,
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  onOpenFilters,
  activeFilterCount,
  recipeCount,
  weekCount,
}) => {
  return (
    <div className="pb-safe fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-border bg-background/80 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300">
      {/* Top Row: Tabs */}
      <div className="w-full px-4 pt-3">
        <Tabs
          value={view === 'week' ? 'week' : 'library'}
          onValueChange={(v) => setView(v as ViewMode)}
          className="w-full"
        >
          <TabsList className="grid h-12 w-full grid-cols-2 bg-muted/50">
            <TabsTrigger value="library" className="h-10 data-[state=active]:bg-background">
              <ChefHat className="mr-2 h-5 w-5" />
              <span className="text-sm font-semibold">Library</span>
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                {recipeCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="week" className="h-10 data-[state=active]:bg-background">
              <Calendar className="mr-2 h-5 w-5" />
              <span className="text-sm font-semibold">This Week</span>
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                {weekCount}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Bottom Row: Controls */}
      <div className="flex items-center gap-3 px-4 py-4">
        {/* Left: View Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-full bg-muted/50 hover:bg-muted"
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          {viewMode === 'grid' ? <List className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
        </Button>

        {/* Center: Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-full border border-transparent bg-muted/50 py-2 pl-12 pr-4 text-base font-medium outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary/20 focus:bg-background focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Right: Filter */}
        <Button
          variant={activeFilterCount > 0 ? 'secondary' : 'ghost'}
          size="icon"
          className="relative h-12 w-12 shrink-0 rounded-full bg-muted/50 hover:bg-muted"
          onClick={onOpenFilters}
        >
          <ListFilter className="h-6 w-6" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
