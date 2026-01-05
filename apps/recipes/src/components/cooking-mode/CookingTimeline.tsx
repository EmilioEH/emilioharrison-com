import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface CookingTimelineProps {
  currentStep: number // 1-based step index
  totalSteps: number
  onStepClick: (stepIndex: number) => void // 0-based index
}

export const CookingTimeline: React.FC<CookingTimelineProps> = ({
  currentStep,
  totalSteps,
  onStepClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Use a ref to store references to each node element so we can scroll them into view
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])

  // Auto-scroll to the active step when it changes
  useEffect(() => {
    const activeNode = nodeRefs.current[currentStep - 1]
    if (activeNode && scrollContainerRef.current) {
      activeNode.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [currentStep])

  return (
    <div
      ref={scrollContainerRef}
      className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto scroll-smooth px-4 py-3"
    >
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1
        // Status: 'completed' | 'current' | 'upcoming'
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        const isLast = stepNum === totalSteps

        return (
          <React.Fragment key={index}>
            {/* The Node */}
            <motion.div
              layout
              ref={(el: HTMLDivElement | null) => {
                nodeRefs.current[index] = el
              }}
              onClick={() => onStepClick(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onStepClick(index)
                }
              }}
              role="button"
              tabIndex={0}
              data-testid={`timeline-step-${stepNum}`}
              className={`relative flex flex-shrink-0 cursor-pointer items-center justify-center transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isCurrent ? 'h-11 w-11' : 'h-8 w-8'
              }`}
            >
              {/* Node Background */}
              <div
                className={`absolute inset-0 rounded-full transition-colors duration-300 ${
                  isCurrent
                    ? 'bg-primary shadow-md shadow-primary/20'
                    : isCompleted
                      ? 'bg-primary/20'
                      : 'bg-muted'
                }`}
              />

              {/* Icon / Content */}
              <div className="relative z-10 flex items-center justify-center">
                {isCompleted ? (
                  <Check className="h-5 w-5 text-primary" strokeWidth={3} />
                ) : isCurrent ? (
                  <div className="h-3 w-3 rounded-full bg-primary-foreground" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>

              {/* Ping Animation for Current Step */}
              {isCurrent && (
                <div className="absolute inset-0 z-0 animate-ping rounded-full bg-primary/30" />
              )}
            </motion.div>

            {/* Connecting Line (unless last item) */}
            {!isLast && (
              <div className="h-0.5 min-w-[20px] max-w-[40px] flex-1 rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{
                    width: isCompleted ? '100%' : '0%',
                  }}
                />
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
