import React from 'react'

/**
 * MD3 Standard Tabs Component
 * @param {object} props
 * @param {Array<{label: string, value: string, icon?: React.ElementType, count?: number}>} props.tabs
 * @param {string} props.activeTab
 * @param {(value: string) => void} props.onChange
 */
export const Tabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex border-b border-md-sys-color-outline bg-md-sys-color-surface px-4">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`hover:bg-md-sys-color-surface-variant/50 relative flex min-w-[90px] flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'text-md-sys-color-primary' : 'text-md-sys-color-on-surface-variant'} `}
          >
            {tab.icon && <tab.icon className="h-5 w-5" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? 'bg-md-sys-color-primary text-md-sys-color-on-primary'
                    : 'bg-md-sys-color-surface-variant text-md-sys-color-on-surface-variant'
                } `}
              >
                {tab.count}
              </span>
            )}

            {/* Active Indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-md-sys-color-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}
