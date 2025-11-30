import React from 'react';
import { Label } from './Typography';

const CategoryBadge = ({ category, count, onClick, isActive, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`
                inline-flex items-center gap-2 px-3 py-1 border-2 transition-all
                ${isActive
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-100'
                }
                ${className}
            `}
        >
            <Label variant="tag" className="uppercase tracking-wider">
                {category}
                {count !== undefined && (
                    <span className={`ml-1 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                        ({count})
                    </span>
                )}
            </Label>
        </button>
    );
};

export default CategoryBadge;
