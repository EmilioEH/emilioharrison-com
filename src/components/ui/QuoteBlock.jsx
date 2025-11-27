import React from 'react';

const QuoteBlock = ({ quote, attribution, theme }) => {
    return (
        <div className={`border-l-4 pl-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-gray-300'}`}>
            <p className={`italic text-lg mb-2 ${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-700'}`}>
                {quote}
            </p>
            <p className={`text-sm ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}>
                {attribution}
            </p>
        </div>
    );
};

export default QuoteBlock;
