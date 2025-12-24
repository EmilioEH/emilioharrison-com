import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-accent font-bold transition-all duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      intent: {
        primary: [
          'bg-btn-primary text-white',
          'border-4 border-black shadow-hard-sm',
          'hover:shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5',
          'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
          'uppercase tracking-wider',
        ],
        secondary: [
          'bg-white text-black',
          'border-2 border-black shadow-none',
          'hover:shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5',
          'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        ],
        tertiary: [
          'bg-transparent text-zinc-800',
          'border-none shadow-none',
          'hover:text-black hover:bg-zinc-100',
        ],
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-lg', // 1.125rem = 18px = text-lg in Tailwind default (usually) or close enough. Actually text-body-base is 1.125rem.
        lg: 'px-8 py-4 text-xl',
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
