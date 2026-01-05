import React from 'react'
import { cn } from '@/lib/utils'

type Spacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const spacerMap: Record<Spacing, string> = {
  none: '',
  xs: 'gap-0.5', // 2px
  sm: 'gap-2', // 8px
  md: 'gap-4', // 16px
  lg: 'gap-6', // 24px
  xl: 'gap-8', // 32px
  '2xl': 'gap-12', // 48px
}

interface PrimitiveProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: Spacing
  as?: React.ElementType
}

/**
 * Stack: Arranges items vertically with consistent spacing.
 * Replaces: flex flex-col gap-*, space-y-*
 */
export const Stack = React.forwardRef<HTMLDivElement, PrimitiveProps>(
  ({ spacing = 'md', className, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('flex flex-col', spacerMap[spacing], className)}
        {...props}
      />
    )
  },
)
Stack.displayName = 'Stack'

/**
 * Inline: Arranges items horizontally without wrapping.
 * Replaces: flex gap-*, flex items-center gap-*
 */
export const Inline = React.forwardRef<
  HTMLDivElement,
  PrimitiveProps & {
    align?: 'start' | 'center' | 'end' | 'baseline'
    justify?: 'start' | 'center' | 'end' | 'between'
  }
>(
  (
    {
      spacing = 'md',
      align = 'center',
      justify = 'start',
      className,
      as: Component = 'div',
      ...props
    },
    ref,
  ) => {
    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      baseline: 'items-baseline',
    }
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    }

    return (
      <Component
        ref={ref}
        className={cn('flex', alignMap[align], justifyMap[justify], spacerMap[spacing], className)}
        {...props}
      />
    )
  },
)
Inline.displayName = 'Inline'

/**
 * Cluster: Arranges items horizontally with wrapping.
 * Replaces: flex flex-wrap gap-*
 */
export const Cluster = React.forwardRef<
  HTMLDivElement,
  PrimitiveProps & {
    align?: 'start' | 'center' | 'end' | 'baseline'
    justify?: 'start' | 'center' | 'end' | 'between'
  }
>(
  (
    {
      spacing = 'sm',
      align = 'center',
      justify = 'start',
      className,
      as: Component = 'div',
      ...props
    },
    ref,
  ) => {
    const alignMap = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      baseline: 'items-baseline',
    }
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    }

    return (
      <Component
        ref={ref}
        className={cn(
          'flex flex-wrap',
          alignMap[align],
          justifyMap[justify],
          spacerMap[spacing],
          className,
        )}
        {...props}
      />
    )
  },
)
Cluster.displayName = 'Cluster'

/**
 * PageShell: Standard consistent central container.
 * Replaces: max-w-2xl mx-auto p-4
 */
export const PageShell = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full' }
>(({ className, maxWidth = 'lg', children, ...props }, ref) => {
  const maxWidthMap = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-2xl', // Default for this app
    xl: 'max-w-screen-xl',
    full: 'max-w-full',
  }

  return (
    <div
      ref={ref}
      className={cn('mx-auto w-full px-4 md:px-6', maxWidthMap[maxWidth], className)}
      {...props}
    >
      {children}
    </div>
  )
})
PageShell.displayName = 'PageShell'
