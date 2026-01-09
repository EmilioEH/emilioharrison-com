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
    const container = scrollContainerRef.current
    if (activeNode && container) {
      // Calculate scroll position to center the active node
      // On mobile (horizontal): use scrollLeft
      // On desktop (vertical): use scrollTop
      const isMobile = window.innerWidth < 768
      if (isMobile) {
        const nodeCenter = activeNode.offsetLeft + activeNode.offsetWidth / 2
        const containerCenter = container.clientWidth / 2
        container.scrollTo({
          left: nodeCenter - containerCenter,
          behavior: 'smooth',
        })
      } else {
        const nodeCenter = activeNode.offsetTop + activeNode.offsetHeight / 2
        const containerCenter = container.clientHeight / 2
        container.scrollTo({
          top: nodeCenter - containerCenter,
          behavior: 'smooth',
        })
      }
    }
  }, [currentStep])

  return (
    <div
      ref={scrollContainerRef}
      className="no-scrollbar flex w-full overflow-x-auto scroll-smooth bg-muted/5 transition-all md:h-full md:w-20 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-r md:border-border md:bg-muted/10 md:py-6"
    >
      <div className="flex w-full flex-row items-center gap-1 px-4 py-3 md:min-h-full md:w-auto md:flex-col md:px-0 md:py-0">
        {Array.from({ length: totalSteps }).map((_, index) => {
          // Use 0-based step numbering: 0 = Prep, 1..N = instruction steps
          const stepNum = index
          // Status: 'completed' | 'current' | 'upcoming'
          // currentStep is 1-based from container, so adjust comparison
          const isCompleted = index < currentStep - 1
          const isCurrent = index === currentStep - 1
          const isLast = index === totalSteps - 1

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
                  isCurrent ? 'h-10 w-10 md:h-11 md:w-11' : 'h-8 w-8'
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
                    <Check className="h-4 w-4 text-primary md:h-5 md:w-5" strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="font-display text-sm font-bold text-primary-foreground">
                      {stepNum}
                    </span>
                  ) : (
                    <span className="font-display text-xs font-medium text-muted-foreground">
                      {stepNum}
                    </span>
                  )}
                </div>

                {/* Ping Animation for Current Step */}
                {isCurrent && (
                  <div className="absolute inset-0 z-0 animate-ping rounded-full bg-primary/30" />
                )}
              </motion.div>

              {/* Connecting Line (unless last item) */}
              {!isLast && (
                <div className="relative flex-1">
                  {/* Mobile: Horizontal Line */}
                  <div className="h-0.5 min-w-[20px] rounded-full bg-muted md:hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{
                        width: isCompleted ? '100%' : '0%',
                      }}
                    />
                  </div>

                  {/* Desktop: Vertical Line */}
                  <div className="hidden h-full min-h-[20px] w-0.5 justify-center rounded-full bg-muted md:flex md:min-h-[30px]">
                    <div
                      className="w-full bg-primary transition-all duration-500 ease-out"
                      style={{
                        height: isCompleted ? '100%' : '0%',
                      }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
