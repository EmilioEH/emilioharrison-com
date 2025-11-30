import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const headingVariants = cva(
    "font-display text-ink",
    {
        variants: {
            variant: {
                'display-xl': "text-display-xl font-black tracking-tighter uppercase",
                'display-l': "text-display-l font-black tracking-tight",
                'heading-xl': "text-heading-xl font-bold tracking-tight",
                'heading-l': "text-heading-l font-bold",
                'heading-m': "text-heading-m font-semibold",
                'heading-s': "text-heading-s font-semibold",
            },
        },
        defaultVariants: {
            variant: "heading-l",
        },
    }
);

export const Heading = ({ className, variant, as: Component = "h2", children, ...props }) => {
    return (
        <Component className={cn(headingVariants({ variant, className }))} {...props}>
            {children}
        </Component>
    );
};

const textVariants = cva(
    "font-body text-ink",
    {
        variants: {
            variant: {
                'body-xl': "text-body-xl",
                'body-l': "text-body-l",
                'body-base': "text-body-base",
                'body-s': "text-body-s",
                'fine': "text-fine",
            },
        },
        defaultVariants: {
            variant: "body-base",
        },
    }
);

export const Text = ({ className, variant, as: Component = "p", children, ...props }) => {
    return (
        <Component className={cn(textVariants({ variant, className }))} {...props}>
            {children}
        </Component>
    );
};

const labelVariants = cva(
    "font-accent",
    {
        variants: {
            variant: {
                'eyebrow': "text-eyebrow font-bold uppercase tracking-widest",
                'label': "text-body-s font-medium tracking-wide",
                'tag': "text-eyebrow font-medium lowercase tracking-wide",
            },
        },
        defaultVariants: {
            variant: "label",
        },
    }
);

export const Label = ({ className, variant, as: Component = "span", children, ...props }) => {
    return (
        <Component className={cn(labelVariants({ variant, className }))} {...props}>
            {children}
        </Component>
    );
};
