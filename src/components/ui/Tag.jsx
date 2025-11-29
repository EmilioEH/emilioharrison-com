import React from 'react';

const Tag = ({ tag, count, onClick, isActive, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border-2 transition-all
                ${isActive
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-100'
                }
                ${className}
            `}
        >
            <span>#{tag}</span>
            {count !== undefined && (
                <span className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                    {count}
                </span>
            )}
        </button>
    );
};

export default Tag;
