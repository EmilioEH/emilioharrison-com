import React from 'react'
import { ChefHat, Calendar, ShoppingBag } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { ViewMode } from './hooks/useRouter'

interface BottomControlsProps {
  view: ViewMode
  setView: (view: ViewMode) => void
  weekCount: number
}

export const BottomControls: React.FC<BottomControlsProps> = ({ view, setView, weekCount }) => {
  // Map internal views to tab values
  const currentTab = view === 'week' ? 'week' : view === 'grocery' ? 'grocery' : 'library'

  return (
    <div className="pb-safe fixed bottom-8 left-0 right-0 z-50 flex flex-col border-t border-border bg-background/80 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300">
      {/* Top Row: Tabs */}
      <div className="w-full px-4 pb-3 pt-3">
        <Tabs value={currentTab} onValueChange={(v) => setView(v as ViewMode)} className="w-full">
          <TabsList className="grid h-12 w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="library" className="h-10 data-[state=active]:bg-background">
              <ChefHat className="mr-2 h-5 w-5" />
              <span className="hidden text-xs font-bold uppercase tracking-wider sm:inline">
                Library
              </span>
              <span className="text-xs font-bold sm:hidden">Lib</span>
            </TabsTrigger>

            <TabsTrigger value="week" className="h-10 data-[state=active]:bg-background">
              <Calendar className="mr-2 h-5 w-5" />
              <span className="hidden text-xs font-bold uppercase tracking-wider sm:inline">
                Plan
              </span>
              <span className="text-xs font-bold sm:hidden">Plan</span>
              {weekCount > 0 && (
                <span className="ml-1.5 min-w-[1.25rem] rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {weekCount}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger value="grocery" className="h-10 data-[state=active]:bg-background">
              <ShoppingBag className="mr-2 h-5 w-5" />
              <span className="hidden text-xs font-bold uppercase tracking-wider sm:inline">
                Shop
              </span>
              <span className="text-xs font-bold sm:hidden">Shop</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
