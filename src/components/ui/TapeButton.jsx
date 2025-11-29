import React from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * TapeButton Component
 * A button with a "tape" aesthetic, thick borders, and hard shadows.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {() => void} [props.onClick]
 * @param {string} [props.className]
 * @param {"button" | "submit" | "reset"} [props.type]
 * @param {boolean} [props.active]
 * @param {string} [props.color] - Tailwind color class (e.g., "bg-coral")
 */
const TapeButton = ({
    children,
    onClick,
    className = "",
    type = "button",
    active = false,
    color = "bg-btn-primary"
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            aria-pressed={active}
            className={`
            relative group ${color} text-white px-6 py-3 
            font-bold text-sm uppercase tracking-wider 
            border-4 border-black shadow-hard 
            transform transition-all duration-200 ease-out 
            hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg 
            active:translate-x-0.5 active:translate-y-0.5 active:shadow-none 
            ${active ? 'translate-x-0.5 translate-y-0.5 shadow-none opacity-90' : ''} 
            ${className}
        `}
        >
            <span className="relative z-10 flex items-center gap-2 justify-center">{children}</span>
        </button>
    );
};

export default TapeButton;
