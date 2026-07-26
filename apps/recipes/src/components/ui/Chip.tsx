import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface ChipProps {
  label: React.ReactNode
  active: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
}

/**
 * A selectable pill.
 *
 * Sized to the 44px minimum touch target (`.agent/rules/04-ios-webkit.md`). The two copies this
 * replaces — the week review's outcome buttons and the suggester's mood and facet chips — were
 * both `px-3 py-1.5`, about 30px tall, from the same class string written out twice. That is what
 * made both screens feel fiddly to tap on a phone.
 *
 * The usual escape hatch for a small control, an invisible `-inset-[10px]` hit area, is not
 * available here: these render in wrapped groups a few pixels apart, so an expanded hit area
 * would sit on top of the neighbouring chip. They are simply the right size instead.
 */
export const Chip: React.FC<ChipProps> = ({ label, active, onClick, disabled, className }) => (
  <motion.button
    type="button"
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    whileTap={{ scale: 0.95 }}
    className={cn(
      'inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-40',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
      className,
    )}
  >
    {label}
  </motion.button>
)
