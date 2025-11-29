import React from 'react';

/**
 * ContentBlock Component
 * A unified container component for the "Brutal" design system.
 * Features thick borders, hard shadows, and optional rotation/pin.
 * Purely presentational - no hover or click states.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.color] - Tailwind bg class (e.g., "bg-white", "bg-mustard")
 * @param {number} [props.rotate] - Rotation in degrees
 * @param {boolean} [props.pin] - Whether to show the sticky note pin
 * @param {string} [props.padding] - Padding class (default: "p-6 md:p-8")
 */
const ContentBlock = ({
    children,
    className = "",
    color = "bg-white",
    rotate = 0,
    pin = false,
    padding = "p-6 md:p-8"
}) => {
    return (
        <div
            className={`
                ${color} border-4 border-black shadow-hard 
                ${padding} relative 
                ${className}
            `}
            style={{
                transform: rotate ? `rotate(${rotate}deg)` : 'none'
            }}
        >
            {pin && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20" aria-hidden="true">
                    <div className="w-6 h-6 rounded-full bg-black border-2 border-white shadow-sm"></div>
                </div>
            )}
            {children}
        </div>
    );
};

export default ContentBlock;
