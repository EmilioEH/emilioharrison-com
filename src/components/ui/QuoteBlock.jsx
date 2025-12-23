import React from 'react'
import { Text } from './Typography'

const QuoteBlock = ({ quote, attribution, theme }) => {
  return (
    <div
      className={`border-l-4 pl-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-gray-300'}`}
    >
      <Text
        variant="body-l"
        className={`mb-2 italic ${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-700'}`}
      >
        {quote}
      </Text>
      <Text
        variant="body-s"
        className={`${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}
      >
        {attribution}
      </Text>
    </div>
  )
}

export default QuoteBlock
