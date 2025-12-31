import React from 'react'
import { ChefHat, Calendar } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { ViewMode } from './RecipeManager'

interface BottomControlsProps {
  view: ViewMode
  setView: (view: ViewMode) => void
  recipeCount: number
  weekCount: number
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  view,
  setView,
  recipeCount,
  weekCount,
}) => {
  return (
    <div className="pb-safe fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-border bg-background/80 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300">
      {/* Top Row: Tabs */}
      <div className="w-full px-4 pb-3 pt-3">
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
    </div>
  )
}
