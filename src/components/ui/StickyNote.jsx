import React from 'react';

/**
 * StickyNote Component
 * A container component resembling a sticky note with a pin.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.color] - Tailwind color class (e.g., "bg-mustard")
 * @param {number} [props.rotate] - Rotation in degrees
 */
const StickyNote = ({
    children,
    className = "",
    color = "bg-mustard",
    rotate = 0
}) => {
    return (
        <div
            className={`
            ${color} border-4 border-black shadow-hard 
            p-6 md:p-8 relative transition-transform duration-300 ease-in-out 
            hover:scale-[1.01] hover:z-10 hover:shadow-hard-lg 
            ${className}
        `}
            style={{ transform: `rotate(${rotate}deg)` }}
        >
            {/* Pin */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20" aria-hidden="true">
                <div className="w-6 h-6 rounded-full bg-black border-2 border-white shadow-sm"></div>
            </div>
            {children}
        </div>
    );
};

export default StickyNote;
