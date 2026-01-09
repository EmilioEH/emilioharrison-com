import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface MetadataCardProps {
  icon: LucideIcon
  label: string
  value: string | number
}

/**
 * A compact card displaying a single recipe stat (time, servings, difficulty, cost).
 * Used in a 4-column grid on the recipe detail view.
 */
export const MetadataCard: React.FC<MetadataCardProps> = ({ icon: Icon, label, value }) => (
  <div className="flex flex-col items-center gap-1 p-2 text-center">
    <Icon className="h-5 w-5 text-muted-foreground" />
    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
    <span className="text-lg font-bold text-foreground">{value}</span>
  </div>
)
