import { cva, type VariantProps } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        // Hierarchy variants for active/inactive states and tags
        active: 'border-transparent bg-foreground text-background font-bold hover:bg-foreground/90',
        inactive:
          'border-border bg-background text-muted-foreground font-medium hover:bg-accent hover:text-foreground',
        tag: 'border-transparent bg-muted text-muted-foreground font-normal',
      },
      size: {
        sm: 'px-2.5 py-0.5 text-xs',
        md: 'h-9 px-3 py-1 text-xs rounded-full',
        lg: 'h-11 px-4 py-1.5 text-sm rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
)

export type BadgeVariantsProps = VariantProps<typeof badgeVariants>
