import React from 'react';

const BrutalButton = ({ children, onClick = () => { }, color = null, className = "", type = "button", active = false, theme, href }) => {
    const bg = color || (theme.id === 'blueprint' ? theme.colors.card : 'bg-white');
    const text = theme.id === 'blueprint' ? 'text-blue-100' : 'text-black';

    const commonClasses = `
          ${theme.border} ${theme.shadow}
          ${active ? 'translate-x-[4px] translate-y-[4px] shadow-none' : theme.shadowHover}
          ${bg} px-6 py-3 font-bold ${text} flex items-center gap-2
          ${className}
        `;

    if (href) {
        return (
            <a href={href} className={commonClasses}>
                {children}
            </a>
        );
    }

    return (
        <button
            type={type}
            onClick={onClick}
            className={commonClasses}
        >
            {children}
        </button>
    );
};

export default BrutalButton;
