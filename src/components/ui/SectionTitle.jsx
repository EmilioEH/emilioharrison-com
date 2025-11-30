import React from 'react';
import { Heading } from './Typography';

/**
 * SectionTitle Component
 * Standardized section title with a decorative icon.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
const SectionTitle = ({ children }) => (
    <Heading variant="display-m" className="mb-8 uppercase tracking-tight flex items-center gap-3 text-ink">
        <span className="w-8 h-8 bg-coral border-4 border-black rounded-full flex items-center justify-center" aria-hidden="true">
            <div className="w-2 h-2 bg-black rounded-full"></div>
        </span>
        {children}
    </Heading>
);

export default SectionTitle;
