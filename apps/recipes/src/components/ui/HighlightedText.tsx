import React, { useMemo } from 'react'

export interface Match {
  indices: [number, number][]
  key?: string
}

interface HighlightedTextProps {
  text: string
  matches?: Match[]
  className?: string
  highlightClassName?: string
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  matches,
  className = '',
  highlightClassName = 'bg-yellow-200/50 dark:bg-yellow-500/30 font-bold rounded-sm px-0.5 -mx-0.5',
}) => {
  const parts = useMemo(() => {
    if (!matches || matches.length === 0) return [{ text, type: 'normal' }]

    // Flatten all indices from all matches that might apply to this text (though usually we filter matches before passing)
    // Assuming 'matches' passed here are relevant to this text field
    const indices: [number, number][] = []

    matches.forEach((m) => {
      m.indices.forEach((idx) => indices.push(idx))
    })

    // Sort by start index
    indices.sort((a, b) => a[0] - b[0])

    const result = []
    let lastIndex = 0

    indices.forEach(([start, end]) => {
      // Add non-highlighted chunk
      if (start > lastIndex) {
        result.push({
          text: text.substring(lastIndex, start),
          type: 'normal',
        })
      }

      // Add highlighted chunk
      // Fuse indices are inclusive [start, end]
      result.push({
        text: text.substring(start, end + 1),
        type: 'highlight',
      })

      lastIndex = end + 1
    })

    // Add remaining text
    if (lastIndex < text.length) {
      result.push({
        text: text.substring(lastIndex),
        type: 'normal',
      })
    }

    return result
  }, [text, matches])

  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i} className={part.type === 'highlight' ? highlightClassName : undefined}>
          {part.text}
        </span>
      ))}
    </span>
  )
}
