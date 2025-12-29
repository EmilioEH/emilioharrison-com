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
  <div className="border-b border-md-sys-color-outline last:border-0">
    <button
      onClick={onToggle}
      className="hover:bg-md-sys-color-primary/[0.04] flex w-full items-center justify-between px-6 py-4 transition-colors"
    >
      <div className="flex items-center gap-3">
        <h3 className="font-display text-xl font-bold text-md-sys-color-on-surface">{title}</h3>
        <span className="rounded-full bg-md-sys-color-primary-container px-2 py-0.5 text-xs font-medium text-md-sys-color-on-primary-container">
          {count}
        </span>
      </div>
      <ChevronDown
        className={`h-5 w-5 text-md-sys-color-on-surface-variant transition-transform duration-200 ${
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
