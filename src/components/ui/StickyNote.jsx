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
    color = "bg-sticky-yellow",
    rotate = 0,
    size = "square", // square, rectangle
    variant = "action", // action, static
    padding = true
}) => {
    const sizeClasses = {
        square: "aspect-square",
        rectangle: "w-full md:aspect-[2/1]",
    };

    // Force high contrast text color (black) for sticky notes as they are pastel
    const textColor = "text-black";

    // Static variant uses neutral background if no specific color provided (or could override)
    // But for now we'll stick to the passed color or default, just ensuring text contrast.

    return (
        <div
            className={`
            ${color} ${textColor} font-body border-4 border-black shadow-hard 
            ${padding ? 'p-6 md:p-8' : ''} relative transition-transform duration-300 ease-in-out 
            ${variant === 'action' ? 'hover:scale-[1.01] hover:z-10 hover:shadow-hard-lg cursor-pointer' : ''}
            ${sizeClasses[size] || sizeClasses.square}
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
