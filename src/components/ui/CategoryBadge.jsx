import React from 'react';

const CategoryBadge = ({ category, count, onClick, isActive, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider border-2 transition-all
                ${isActive
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-100'
                }
                ${className}
            `}
        >
            {category}
            {count !== undefined && (
                <span className={`ml-1 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                    ({count})
                </span>
            )}
        </button>
    );
};

export default CategoryBadge;
