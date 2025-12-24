import React from 'react'

const PatternDefs = () => (
  <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
    <defs>
      <pattern id="pattern-dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="1.5" fill="#264653" opacity="0.3" />
      </pattern>
      <pattern
        id="pattern-hatch"
        x="0"
        y="0"
        width="8"
        height="8"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke="#264653" strokeWidth="1" opacity="0.3" />
      </pattern>
      <pattern id="pattern-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#264653" strokeWidth="1" opacity="0.2" />
      </pattern>
    </defs>
  </svg>
)

export default PatternDefs
