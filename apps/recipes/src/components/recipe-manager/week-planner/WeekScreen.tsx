import React from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'

interface WeekScreenProps {
  title: string
  subtitle?: string
  onBack: () => void
  children: React.ReactNode
  /**
   * Set false when the child fills the screen and scrolls itself — the suggester keeps its
   * composer pinned under a scrolling transcript, which a scroller here would break.
   */
  scroll?: boolean
}

/**
 * A full screen entered from the week plan.
 *
 * Both the review and the suggester started life embedded above the planned recipes. That put a
 * form between the cook and the thing they came to look at, every visit, whether or not they
 * wanted it. Each is now its own screen, reached deliberately from a button and left with back —
 * which also gives them the whole viewport, which is what a multi-step exchange needs on a phone.
 *
 * Slides in over the plan rather than replacing the route: the week context (which week is active,
 * what is already planned) stays exactly as it was underneath.
 */
export const WeekScreen: React.FC<WeekScreenProps> = ({
  title,
  subtitle,
  onBack,
  children,
  scroll = true,
}) => (
  <motion.div
    // Slide only. Fading in from transparent meant the plan underneath showed straight through
    // the incoming screen for the whole transition — two full screens legible at once, with the
    // plan's text running through the chips. A push transition doesn't cross-fade; the arriving
    // screen is opaque from the first frame.
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
    transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
    className="pointer-events-auto absolute inset-0 flex h-full flex-col bg-background"
    data-testid="week-screen"
  >
    <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center gap-1 px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to the week"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        {/* Tight leading and a hair of space, so the two lines read as one heading rather than
         * as a title with an unrelated line floating under it. */}
        <div className="min-w-0 leading-tight">
          <h2 className="truncate font-display text-lg font-bold leading-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>

    {scroll ? (
      <div className="flex-1 overflow-y-auto pb-tab-bar">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
    ) : (
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">{children}</div>
    )}
  </motion.div>
)
