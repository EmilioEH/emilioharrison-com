import React, { useState } from 'react'
import { Text, Label } from './Typography'

/**
 * Marginalia Component
 * An interactive footnote/sidenote component.
 *
 * @param {Object} props
 * @param {string|number} props.id - The footnote number/ID
 * @param {string} props.text - The content of the note
 */
const Marginalia = ({ id, text }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <span className="group relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-expanded={isOpen}
        aria-label={`View note ${id}`}
        className="hover:bg-mustard bg-coral mx-0.5 cursor-pointer rounded-full border-2 border-black px-1.5 align-super text-xs font-black text-white transition-colors hover:text-black"
      >
        {id}
      </button>
      <div
        className={`shadow-hard absolute bottom-full left-1/2 z-50 mb-4 w-64 origin-bottom -translate-x-1/2 border-4 border-black bg-white p-4 transition-all duration-200 ease-out ${isOpen ? 'rotate-1 scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'} `}
        role="tooltip"
      >
        <Label variant="eyebrow" className="mb-2 font-sans text-gray-500">
          Note {id}
        </Label>
        <Text
          variant="body-base"
          className="font-bold italic text-black"
          style={{ fontFamily: '"Comic Sans MS", cursive, sans-serif' }}
        >
          {text}
        </Text>
        {/* Arrow */}
        <div className="absolute left-1/2 top-full -mt-[2px] h-0 w-0 -translate-x-1/2 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-black"></div>
      </div>
    </span>
  )
}

export default Marginalia
