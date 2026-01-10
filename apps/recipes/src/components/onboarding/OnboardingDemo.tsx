import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stack, Inline } from '@/components/ui/layout'
import { Badge } from '@/components/ui/badge'
import {
  Link2,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Timer,
  Users,
  RefreshCcw,
} from 'lucide-react'

interface OnboardingDemoProps {
  demoType: 'welcome' | 'add-recipe' | 'plan-week' | 'cooking-mode' | 'family-sharing'
}

// === WELCOME DEMO: Logo pulse animation ===
const WelcomeDemo: React.FC = () => {
  return (
    <motion.div
      className="flex items-center justify-center"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10"
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 0 0 rgba(var(--primary), 0)',
            '0 0 0 8px rgba(var(--primary), 0.1)',
            '0 0 0 0 rgba(var(--primary), 0)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
      >
        <span className="text-4xl">🍳</span>
      </motion.div>
    </motion.div>
  )
}

// === ADD RECIPE DEMO: URL paste → AI parse → Recipe card ===
const AddRecipeDemo: React.FC = () => {
  const [phase, setPhase] = useState<'typing' | 'loading' | 'done'>('typing')
  const [typedText, setTypedText] = useState('')
  const url = 'allrecipes.com/chicken'

  useEffect(() => {
    // Reset and start animation cycle
    const cycle = () => {
      setPhase('typing')
      setTypedText('')

      // Typing animation
      let i = 0
      const typeInterval = setInterval(() => {
        if (i < url.length) {
          setTypedText(url.slice(0, i + 1))
          i++
        } else {
          clearInterval(typeInterval)
          setTimeout(() => setPhase('loading'), 300)
        }
      }, 60)

      return typeInterval
    }

    const typeInterval = cycle()

    // Loading → Done
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(
      setTimeout(() => {
        setPhase('done')
      }, 2500),
    )

    // Restart cycle
    timers.push(
      setTimeout(() => {
        cycle()
      }, 5000),
    )

    return () => {
      clearInterval(typeInterval)
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-[260px]" data-testid="onboarding-demo">
      <AnimatePresence mode="wait">
        {phase !== 'done' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border bg-card p-3 shadow-sm"
          >
            <Inline spacing="sm" className="mb-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Paste URL</span>
            </Inline>
            <div className="flex h-8 items-center rounded border bg-background px-2 text-sm">
              <span className="text-foreground">{typedText}</span>
              <motion.span
                className="ml-0.5 h-4 w-0.5 bg-primary"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </div>
            {phase === 'loading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex items-center justify-center gap-2"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                </motion.div>
                <span className="text-xs text-muted-foreground">AI parsing...</span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="overflow-hidden rounded-lg border bg-card shadow-sm"
          >
            <div className="h-16 bg-gradient-to-br from-orange-200 to-orange-300" />
            <Stack spacing="xs" className="p-3">
              <span className="text-sm font-semibold">Honey Garlic Chicken</span>
              <Inline spacing="xs">
                <Badge variant="secondary" size="sm">
                  30 min
                </Badge>
                <Badge variant="secondary" size="sm">
                  4 servings
                </Badge>
              </Inline>
              <Inline spacing="xs" className="text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-green-500" />
                <span>Recipe saved!</span>
              </Inline>
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// === PLAN WEEK DEMO: Calendar with recipes sliding in ===
const PlanWeekDemo: React.FC = () => {
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const recipes = [
    { day: 1, name: 'Tacos', color: 'bg-orange-200' },
    { day: 3, name: 'Pasta', color: 'bg-green-200' },
    { day: 5, name: 'Stir Fry', color: 'bg-blue-200' },
  ]

  useEffect(() => {
    let step = 0
    const sequence = [1, 3, 5, null]

    const interval = setInterval(() => {
      setActiveDay(sequence[step % sequence.length])
      step++
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mx-auto w-full max-w-[260px]" data-testid="onboarding-demo">
      <Stack spacing="sm" className="rounded-lg border bg-card p-3 shadow-sm">
        <Inline justify="between" spacing="none">
          {days.map((day, i) => (
            <div
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                recipes.some((r) => r.day === i)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {day}
            </div>
          ))}
        </Inline>

        <Stack spacing="xs">
          <AnimatePresence>
            {recipes.map(
              (recipe) =>
                (activeDay === null || activeDay >= recipe.day) && (
                  <motion.div
                    key={recipe.day}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`rounded px-2 py-1 text-xs font-medium ${recipe.color}`}
                  >
                    {days[recipe.day]}: {recipe.name}
                  </motion.div>
                ),
            )}
          </AnimatePresence>
        </Stack>

        <Badge variant="secondary" size="sm" className="self-start">
          This Week
        </Badge>
      </Stack>
    </div>
  )
}

// === COOKING MODE DEMO: Step navigation simulation ===
const CookingModeDemo: React.FC = () => {
  const [step, setStep] = useState(0)
  const steps = ['Heat oil in pan', 'Add garlic, sauté', 'Pour in sauce', 'Simmer 5 min']

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [steps.length])

  return (
    <div className="mx-auto w-full max-w-[260px]" data-testid="onboarding-demo">
      <Stack spacing="sm" className="rounded-lg border bg-card p-3 shadow-sm">
        {/* Progress */}
        <Inline justify="between">
          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {steps.length}
          </span>
          <Inline spacing="xs">
            <Timer className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">5:00</span>
          </Inline>
        </Inline>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg bg-muted p-4 text-center"
          >
            <span className="text-sm font-medium">{steps[step]}</span>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <Inline justify="between">
          <motion.button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>
          <Inline spacing="xs">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </Inline>
          <motion.button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </Inline>
      </Stack>
    </div>
  )
}

// === FAMILY SHARING DEMO: Avatars + sync animation ===
const FamilySharingDemo: React.FC = () => {
  const [showSecond, setShowSecond] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setShowSecond(true), 800)
    const timer2 = setTimeout(() => setSyncing(true), 1500)
    const timer3 = setTimeout(() => {
      setShowSecond(false)
      setSyncing(false)
    }, 4000)
    const timer4 = setTimeout(() => setShowSecond(true), 4800)
    const timer5 = setTimeout(() => setSyncing(true), 5500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
      clearTimeout(timer5)
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-[260px]" data-testid="onboarding-demo">
      <Stack spacing="md" className="items-center rounded-lg border bg-card p-4 shadow-sm">
        {/* Avatars */}
        <Inline spacing="lg" justify="center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg"
          >
            👨
          </motion.div>
          <AnimatePresence>
            {syncing && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCcw className="h-5 w-5 text-primary" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showSecond && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-lg"
              >
                👩
              </motion.div>
            )}
          </AnimatePresence>
        </Inline>

        {/* Shared recipe */}
        <AnimatePresence>
          {syncing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Inline
                spacing="sm"
                className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-2"
              >
                <span className="text-lg">🍕</span>
                <Stack spacing="none">
                  <span className="text-xs font-medium">Pizza Night</span>
                  <span className="text-[10px] text-muted-foreground">Shared with family</span>
                </Stack>
              </Inline>
            </motion.div>
          )}
        </AnimatePresence>

        <Inline spacing="xs">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Family Workspace</span>
        </Inline>
      </Stack>
    </div>
  )
}

// === MAIN COMPONENT ===
export const OnboardingDemo: React.FC<OnboardingDemoProps> = ({ demoType }) => {
  const demos: Record<OnboardingDemoProps['demoType'], React.ReactNode> = {
    welcome: <WelcomeDemo />,
    'add-recipe': <AddRecipeDemo />,
    'plan-week': <PlanWeekDemo />,
    'cooking-mode': <CookingModeDemo />,
    'family-sharing': <FamilySharingDemo />,
  }

  return <div className="py-4">{demos[demoType]}</div>
}
