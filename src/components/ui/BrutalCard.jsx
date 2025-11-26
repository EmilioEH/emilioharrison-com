import React from 'react';

const BrutalCard = ({ children, className = "", color, theme }) => {
    const bg = color || theme.colors.card;
    return (
        <div className={`${theme.border} ${theme.shadow} ${bg} p-6 ${className}`}>
            {children}
        </div>
    );
};

export default BrutalCard;
