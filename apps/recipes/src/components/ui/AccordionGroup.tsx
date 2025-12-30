import React from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionGroupProps {
  title: string
  count: number
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  viewMode: 'grid' | 'list'
}

export const AccordionGroup: React.FC<AccordionGroupProps> = ({
  title,
  count,
  children,
  isOpen,
  onToggle,
  viewMode,
}) => (
  <div className="border-b border-border last:border-0">
    <button
      onClick={onToggle}
      className="hover:bg-primary/[0.04] flex w-full items-center justify-between px-6 py-4 transition-colors"
    >
      <div className="flex items-center gap-3">
        <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
        <span className="rounded-full bg-primary-container px-2 py-0.5 text-xs font-medium text-primary-foreground-container">
          {count}
        </span>
      </div>
      <ChevronDown
        className={`h-5 w-5 text-foreground-variant transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
    <div
      className={`grid transition-all duration-200 ease-in-out ${
        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="overflow-hidden">
        <div
          className={`grid gap-4 p-4 pb-8 ${
            viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
          } `}
        >
          {children}
        </div>
      </div>
    </div>
  </div>
)
