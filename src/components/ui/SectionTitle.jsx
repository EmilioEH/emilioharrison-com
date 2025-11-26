import React from 'react';

const SectionTitle = ({ children, theme }) => (
    <h2 className={`text-4xl font-black mb-8 uppercase tracking-tight flex items-center gap-3 ${theme.colors.text}`}>
        <span className={`w-4 h-4 ${theme.id === 'blueprint' ? 'bg-blue-200' : 'bg-black'} block`}></span>
        {children}
    </h2>
);

export default SectionTitle;
