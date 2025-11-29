import React from 'react';

const BrutalButton = ({
    children,
    onClick,
    href,
    className = "",
    type = "button",
    variant = "secondary",
    active = false
}) => {

    const baseClasses = "font-bold flex items-center justify-center gap-2 transition-all duration-200 ease-out";

    const variants = {
        primary: `
            bg-btn-primary text-white 
            border-4 border-black shadow-hard-sm 
            hover:shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5
            active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
            px-6 py-3 text-sm uppercase tracking-wider
        `,
        secondary: `
            bg-white text-black 
            border-2 border-black shadow-none 
            hover:shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5
            active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
            px-6 py-3 text-base
        `,
        tertiary: `
            bg-transparent text-zinc-800 
            border-none shadow-none 
            hover:text-black hover:bg-zinc-100
            px-4 py-2 text-sm
        `
    };

    const activeClasses = active ? 'translate-x-[2px] translate-y-[2px] shadow-none opacity-90' : '';

    const classes = `
        ${baseClasses}
        ${variants[variant] || variants.secondary}
        ${activeClasses}
        ${className}
    `.trim();

    if (href) {
        return (
            <a href={href} className={classes}>
                {children}
            </a>
        );
    }

    return (
        <button
            type={type}
            onClick={onClick}
            className={classes}
        >
            {children}
        </button>
    );
};

export default BrutalButton;
