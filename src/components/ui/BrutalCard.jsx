import React from 'react';

const BrutalCard = ({ children, className = "", color, theme, onClick, disableHover = false, ...props }) => {
    const bg = color || theme.colors.card;
    const hoverStyles = disableHover ? "" : (theme.shadowHover || "");
    const cursorStyles = onClick ? "cursor-pointer" : "";

    return (
        <div
            className={`${theme.border} ${theme.shadow} ${bg} p-6 ${hoverStyles} ${cursorStyles} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
};

export default BrutalCard;
