import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-body font-medium transition-all duration-200 ease-out disabled:opacity-38 disabled:pointer-events-none rounded-full relative overflow-hidden',
  {
    variants: {
      intent: {
        primary: [
          'bg-md-sys-color-primary text-md-sys-color-on-primary',
          'hover:shadow-md-1 hover:bg-md-sys-color-primary/90',
          'active:shadow-none active:scale-[0.98]',
          'elevation-0',
        ],
        secondary: [
          'bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container',
          'hover:shadow-md-1 hover:bg-md-sys-color-secondary-container/90',
          'active:shadow-none active:scale-[0.98]',
        ],
        tertiary: [
          'bg-transparent text-md-sys-color-primary',
          'hover:bg-md-sys-color-primary/[0.08]',
          'active:bg-md-sys-color-primary/[0.12] active:scale-[0.98]',
        ],
        outlined: [
          'bg-transparent text-md-sys-color-primary border border-md-sys-color-outline',
          'hover:bg-md-sys-color-primary/[0.08] hover:border-md-sys-color-primary',
          'active:bg-md-sys-color-primary/[0.12] active:scale-[0.98]',
        ],
      },
      size: {
        sm: 'px-4 py-1.5 text-sm h-8',
        md: 'px-6 py-2 text-sm h-10',
        lg: 'px-8 py-2.5 text-base h-12',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  },
)

/**
 * @typedef {Object} ButtonProps
 * @property {string} [className]
 * @property {'primary' | 'secondary' | 'tertiary'} [intent]
 * @property {'sm' | 'md' | 'lg'} [size]
 * @property {boolean} [fullWidth]
 * @property {boolean} [asChild]
 * @property {string} [href]
 * @property {'button' | 'submit' | 'reset'} [type]
 * @property {React.ReactNode} children
 * @property {React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>} [onClick]
 * @property {boolean} [disabled]
 */

/** @type {React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<any>>} */
const Button = React.forwardRef(
  (
    { className, intent, size, fullWidth, asChild = false, href, type = 'button', ...props },
    ref,
  ) => {
    let Comp = 'button'
    if (asChild) Comp = React.Fragment
    else if (href) Comp = 'a'
    const elementProps = href ? { href, ...props } : { type, ...props }

    return (
      <Comp
        className={cn(buttonVariants({ intent, size, fullWidth, className }))}
        ref={ref}
        {...elementProps}
      />
    )
  },
)

Button.displayName = 'Button'

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
export default Button
