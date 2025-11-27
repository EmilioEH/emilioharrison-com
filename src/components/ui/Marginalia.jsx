import React, { useState } from 'react';

/**
 * Marginalia Component
 * An interactive footnote/sidenote component.
 * 
 * @param {Object} props
 * @param {string|number} props.id - The footnote number/ID
 * @param {string} props.text - The content of the note
 */
const Marginalia = ({ id, text }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <span className="relative inline-block group">
            <button
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                aria-expanded={isOpen}
                aria-label={`View note ${id}`}
                className="align-super text-xs font-black px-1.5 mx-0.5 rounded-full bg-coral text-white border-2 border-black cursor-pointer hover:bg-mustard hover:text-black transition-colors"
            >
                {id}
            </button>
            <div
                className={`
                    absolute left-1/2 bottom-full mb-4 -translate-x-1/2 w-64 p-4 
                    text-sm font-medium leading-relaxed z-50 
                    bg-white border-4 border-black shadow-hard 
                    transition-all duration-200 ease-out origin-bottom 
                    ${isOpen ? 'opacity-100 scale-100 rotate-1' : 'opacity-0 scale-95 pointer-events-none'}
                `}
                role="tooltip"
            >
                <div className="font-black mb-2 text-xs uppercase tracking-wider text-gray-500 font-sans">Note {id}</div>
                <div className="text-black font-bold italic" style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}>{text}</div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black"></div>
            </div>
        </span>
    );
};

export default Marginalia;
