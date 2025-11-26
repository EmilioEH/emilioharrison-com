import React from 'react';

const BrutalButton = ({ children, onClick, color, className = "", type = "button", active = false, theme }) => {
    const bg = color || (theme.id === 'blueprint' ? theme.colors.card : 'bg-white');
    const text = theme.id === 'blueprint' ? 'text-blue-100' : 'text-black';

    return (
        <button
            type={type}
            onClick={onClick}
            className={`
          ${theme.border} ${theme.shadow}
          ${active ? 'translate-x-[4px] translate-y-[4px] shadow-none' : theme.shadowHover}
          ${bg} px-6 py-3 font-bold ${text} flex items-center gap-2
          ${className}
        `}
        >
            {children}
        </button>
    );
};

export default BrutalButton;
