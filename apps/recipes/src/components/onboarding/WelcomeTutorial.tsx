import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChefHat, Calendar, Users, Utensils, ChevronRight } from 'lucide-react'
import { OnboardingDemo } from './OnboardingDemo'

interface WelcomeTutorialProps {
  onComplete: () => void
}

type DemoType = 'welcome' | 'add-recipe' | 'plan-week' | 'cooking-mode' | 'family-sharing'

export const WelcomeTutorial: React.FC<WelcomeTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0)

  const steps: Array<{
    title: string
    description: string
    icon: React.ReactNode
    color: string
    demoType: DemoType
  }> = [
    {
      title: 'Welcome to ChefBoard',
      description: 'Your new favorite way to manage recipes and meal plans.',
      icon: <ChefHat className="h-12 w-12 text-primary" />,
      color: 'bg-orange-100',
      demoType: 'welcome',
    },
    {
      title: 'Add Your Recipes',
      description: 'Paste a URL and watch AI extract all the details instantly.',
      icon: <Utensils className="h-12 w-12 text-green-600" />,
      color: 'bg-green-100',
      demoType: 'add-recipe',
    },
    {
      title: 'Plan Your Week',
      description: 'Organize meals by day and generate grocery lists with one tap.',
      icon: <Calendar className="h-12 w-12 text-blue-600" />,
      color: 'bg-blue-100',
      demoType: 'plan-week',
    },
    {
      title: 'Cooking Mode',
      description: 'Follow step-by-step with timers and your screen stays on.',
      icon: <ChefHat className="h-12 w-12 text-orange-600" />,
      color: 'bg-orange-100',
      demoType: 'cooking-mode',
    },
    {
      title: 'Share with Family',
      description: 'Recipes and meal plans sync instantly with your family.',
      icon: <Users className="h-12 w-12 text-purple-600" />,
      color: 'bg-purple-100',
      demoType: 'family-sharing',
    },
  ]

  const currentStep = steps[step]
  const isLastStep = step === steps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setStep((prev) => prev + 1)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex w-full max-w-xs flex-col items-center gap-4"
          >
            {/* Icon */}
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-full ${currentStep.color}`}
            >
              {currentStep.icon}
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">{currentStep.title}</h2>
              <p className="text-sm text-muted-foreground">{currentStep.description}</p>
            </div>

            {/* Interactive Demo */}
            <OnboardingDemo demoType={currentStep.demoType} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="bg-card p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <Button onClick={handleNext} size="lg" className="rounded-full px-8">
            {isLastStep ? 'Get Started' : 'Next'}
            {!isLastStep && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
