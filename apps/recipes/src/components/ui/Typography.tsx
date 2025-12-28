import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Heading
const headingVariants = cva('font-display text-ink', {
  variants: {
    variant: {
      'display-xl': 'text-display-xl font-black tracking-tighter uppercase',
      'display-l': 'text-display-l font-black tracking-tight',
      'heading-xl': 'text-heading-xl font-bold tracking-tight',
      'heading-l': 'text-heading-l font-bold',
      'heading-m': 'text-heading-m font-semibold',
      'heading-s': 'text-heading-s font-semibold',
    },
  },
  defaultVariants: {
    variant: 'heading-l',
  },
})

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof headingVariants> {
  as?: React.ElementType
}

export const Heading: React.FC<HeadingProps> = ({
  className,
  variant,
  as: Component = 'h2',
  children,
  ...props
}) => {
  return (
    <Component className={cn(headingVariants({ variant, className }))} {...props}>
      {children}
    </Component>
  )
}

// Text
const textVariants = cva('font-body text-ink', {
  variants: {
    variant: {
      'body-xl': 'text-body-xl',
      'body-l': 'text-body-l',
      'body-base': 'text-body-base',
      'body-s': 'text-body-s',
      fine: 'text-fine',
    },
  },
  defaultVariants: {
    variant: 'body-base',
  },
})

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>, VariantProps<typeof textVariants> {
  as?: React.ElementType
}

export const Text: React.FC<TextProps> = ({
  className,
  variant,
  as: Component = 'p',
  children,
  ...props
}) => {
  return (
    <Component className={cn(textVariants({ variant, className }))} {...props}>
      {children}
    </Component>
  )
}

// Label
const labelVariants = cva('font-accent', {
  variants: {
    variant: {
      eyebrow: 'text-eyebrow font-bold uppercase tracking-widest',
      label: 'text-body-s font-medium tracking-wide',
      tag: 'text-eyebrow font-medium lowercase tracking-wide',
    },
  },
  defaultVariants: {
    variant: 'label',
  },
})

export interface LabelProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof labelVariants> {
  as?: React.ElementType
}

export const Label: React.FC<LabelProps> = ({
  className,
  variant,
  as: Component = 'span',
  children,
  ...props
}) => {
  return (
    <Component className={cn(labelVariants({ variant, className }))} {...props}>
      {children}
    </Component>
  )
}
