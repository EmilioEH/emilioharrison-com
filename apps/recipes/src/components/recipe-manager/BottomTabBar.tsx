import React from 'react'
import { Utensils, CalendarDays } from 'lucide-react'
import { motion } from 'framer-motion'

export type PrimaryTab = 'library' | 'week'

interface BottomTabBarProps {
  activeTab: PrimaryTab
  onTabChange: (tab: PrimaryTab) => void
}

const tabs = [
  { id: 'library' as PrimaryTab, label: 'Library', icon: Utensils },
  { id: 'week' as PrimaryTab, label: 'This Week', icon: CalendarDays },
]

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTabChange(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute left-6 right-6 top-0 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                />
              )}
              <Icon className={`h-5 w-5 ${isActive ? '[stroke-width:2.5]' : '[stroke-width:2]'}`} />
              <span className="text-[11px] font-semibold tracking-wide">{label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
