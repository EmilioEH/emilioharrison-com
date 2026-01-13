import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stack, Inline } from '@/components/ui/layout'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  ShoppingBasket,
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

// === ADD RECIPE DEMO: URL / Scan / Dish Photo ===
const AddRecipeDemo: React.FC = () => {
  const [mode, setMode] = useState<'url' | 'scan' | 'dish'>('url')
  const [phase, setPhase] = useState<'input' | 'loading' | 'done'>('input')
  const [typedText, setTypedText] = useState('')
  const url = 'allrecipes.com/pasta'

  useEffect(() => {
    let typeInterval: NodeJS.Timeout
    const timers: NodeJS.Timeout[] = []

    const runCycle = (currentMode: 'url' | 'scan' | 'dish') => {
      // 1. Reset
      setMode(currentMode)
      setPhase('input')
      setTypedText('')

      // 2. Input Animation
      if (currentMode === 'url') {
        let i = 0
        typeInterval = setInterval(() => {
          if (i < url.length) {
            setTypedText(url.slice(0, i + 1))
            i++
          } else {
            clearInterval(typeInterval)
            timers.push(setTimeout(() => setPhase('loading'), 400))
          }
        }, 50)
      } else {
        // For scan/dish, hold the input visual for a bit
        timers.push(setTimeout(() => setPhase('loading'), 1800))
      }

      // 3. Loading -> Done
      const loadTime = currentMode === 'url' ? 2000 : 3000 // Total time until done
      timers.push(
        setTimeout(() => {
          setPhase('done')
        }, loadTime),
      )

      // 4. Next Mode
      timers.push(
        setTimeout(() => {
          const nextMode = currentMode === 'url' ? 'scan' : currentMode === 'scan' ? 'dish' : 'url'
          runCycle(nextMode)
        }, loadTime + 2500),
      )
    }

    runCycle('url')

    return () => {
      clearInterval(typeInterval)
      timers.forEach(clearTimeout)
    }
  }, [])

  const getResultData = () => {
    switch (mode) {
      case 'url':
        return {
          title: 'Creamy Pesta Pasta',
          badge: '30 min',
          color: 'from-orange-200 to-orange-300',
        }
      case 'scan':
        return { title: "Grandma's Pie", badge: 'Scanned', color: 'from-blue-200 to-blue-300' }
      case 'dish':
        return { title: 'Spicy Ramen', badge: 'AI Inferred', color: 'from-red-200 to-red-300' }
    }
  }

  const result = getResultData()

  return (
    <div className="relative mx-auto w-full max-w-[260px]" data-testid="onboarding-demo">
      <AnimatePresence mode="wait">
        {phase !== 'done' ? (
          <motion.div
            key={`input-${mode}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex h-[130px] flex-col justify-center rounded-lg border bg-card p-4 shadow-sm"
          >
            {/* INPUT PHASE VISUALS */}
            {mode === 'url' && (
              <Stack spacing="sm">
                <Inline spacing="sm">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Paste URL</span>
                </Inline>
                <div className="flex h-9 items-center rounded border bg-background px-2 text-sm">
                  <span className="text-foreground">{typedText}</span>
                  <motion.span
                    className="ml-0.5 h-4 w-0.5 bg-primary"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                </div>
              </Stack>
            )}

            {mode === 'scan' && (
              <div className="relative flex flex-col items-center gap-2">
                <div className="relative flex h-16 w-12 items-center justify-center border-2 border-dashed border-muted-foreground/30 bg-muted/50">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  {/* Scan Line Animation */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">Scanning Recipe...</span>
              </div>
            )}

            {mode === 'dish' && (
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <span className="text-4xl">🍜</span>
                  <motion.div
                    className="absolute -right-2 -top-2"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-5 w-5 fill-yellow-400 text-yellow-500" />
                  </motion.div>
                  {/* Focus text */}
                  <motion.div
                    className="absolute -inset-2 rounded border border-primary/50"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: [0, 1, 0], scale: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">Analyzing Dish...</span>
              </div>
            )}

            {phase === 'loading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-x-0 bottom-2 flex justify-center gap-2"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                </motion.div>
                <span className="text-[10px] text-muted-foreground">AI Processing...</span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`card-${mode}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="overflow-hidden rounded-lg border bg-card shadow-sm"
          >
            <div className={`h-16 bg-gradient-to-br ${result.color}`} />
            <Stack spacing="xs" className="p-3">
              <span className="text-sm font-semibold">{result.title}</span>
              <Inline spacing="xs">
                <Badge variant="secondary" size="sm">
                  {result.badge}
                </Badge>
                {mode === 'url' && (
                  <Badge variant="secondary" size="sm">
                    4 servings
                  </Badge>
                )}
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

// === PLAN WEEK DEMO: Calendar → Grocery List ===
const PlanWeekDemo: React.FC = () => {
  const [phase, setPhase] = useState<'plan' | 'generate' | 'shop'>('plan')
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const [checkedItems, setCheckedItems] = useState<string[]>([])

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const recipes = [
    { day: 1, name: 'Tacos', color: 'bg-orange-200' },
    { day: 3, name: 'Pasta', color: 'bg-green-200' },
    { day: 5, name: 'Stir Fry', color: 'bg-blue-200' },
  ]

  const groceryList = [
    { id: '1', name: 'Ground Beef', category: 'Meat' },
    { id: '2', name: 'Tortillas', category: 'Bakery' },
    { id: '3', name: 'Tomatoes', category: 'Produce' },
  ]

  useEffect(() => {
    const timeoutIds: NodeJS.Timeout[] = []

    const runCycle = () => {
      // RESET
      setPhase('plan')
      setActiveDay(null)
      setCheckedItems([])

      // PHASE 1: Plan (0-3s)
      const sequence = [1, 3, 5]
      sequence.forEach((dayIndex, i) => {
        timeoutIds.push(setTimeout(() => setActiveDay(dayIndex), 500 + i * 800))
      })

      // PHASE 2: Generate Button (3s)
      timeoutIds.push(setTimeout(() => setPhase('generate'), 3500))

      // PHASE 3: Shop (4.5s)
      timeoutIds.push(setTimeout(() => setPhase('shop'), 4500))

      // Checks (5s - 7s)
      groceryList.forEach((item, i) => {
        timeoutIds.push(
          setTimeout(
            () => {
              setCheckedItems((prev) => [...prev, item.id])
            },
            5500 + i * 800,
          ),
        )
      })

      // RESTART (9s)
      timeoutIds.push(setTimeout(runCycle, 9000))
    }

    runCycle()

    return () => timeoutIds.forEach(clearTimeout)
  }, [])

  return (
    <div className="mx-auto w-full max-w-[260px]" data-testid="onboarding-demo">
      <AnimatePresence mode="wait">
        {phase === 'plan' || phase === 'generate' ? (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Stack spacing="sm" className="h-[140px] rounded-lg border bg-card p-3 shadow-sm">
              <Inline justify="between" spacing="none">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                      recipes.some((r) => r.day === i) && (activeDay === null || activeDay >= i)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </Inline>

              <Stack spacing="xs" className="flex-1">
                <AnimatePresence>
                  {recipes.map(
                    (recipe) =>
                      activeDay !== null &&
                      activeDay >= recipe.day && (
                        <motion.div
                          key={recipe.day}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`rounded px-2 py-1.5 text-xs font-medium ${recipe.color} truncate`}
                        >
                          {recipe.name}
                        </motion.div>
                      ),
                  )}
                </AnimatePresence>
              </Stack>

              {phase === 'generate' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full"
                >
                  <div className="flex w-full items-center justify-center gap-2 rounded bg-primary py-1.5 text-xs font-medium text-primary-foreground shadow-sm">
                    <ShoppingBasket className="h-3 w-3" />
                    <span>Generate List</span>
                  </div>
                </motion.div>
              )}
            </Stack>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-[140px] overflow-hidden rounded-lg border bg-card p-3 shadow-sm"
          >
            <Stack spacing="xs">
              <Inline spacing="xs" className="mb-1 border-b pb-2">
                <ShoppingBasket className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Grocery List</span>
              </Inline>

              <Stack spacing="xs">
                {groceryList.map((item) => {
                  const isChecked = checkedItems.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded bg-muted/50 px-2 py-1.5"
                    >
                      <span
                        className={`text-xs ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                      >
                        {item.name}
                      </span>
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${isChecked ? 'border-primary bg-primary' : 'border-muted-foreground'}`}
                      >
                        {isChecked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </div>
                  )
                })}
              </Stack>
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>
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
