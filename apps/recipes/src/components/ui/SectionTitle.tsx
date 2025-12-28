import React from 'react'
import { Heading } from './Typography'

interface SectionTitleProps {
  children: React.ReactNode
}

/**
 * SectionTitle Component
 * Standardized section title with a decorative icon.
 */
const SectionTitle: React.FC<SectionTitleProps> = ({ children }) => (
  <Heading
    variant="heading-l"
    className="text-ink mb-8 flex items-center gap-3 uppercase tracking-tight"
  >
    <span
      className="bg-coral flex h-8 w-8 items-center justify-center rounded-full border-4 border-black"
      aria-hidden="true"
    >
      <div className="h-2 w-2 rounded-full bg-black"></div>
    </span>
    {children}
  </Heading>
)

export default SectionTitle
