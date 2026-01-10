import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChefHat, Calendar, Users, Utensils, ChevronRight } from 'lucide-react'

interface WelcomeTutorialProps {
  onComplete: () => void
}

export const WelcomeTutorial: React.FC<WelcomeTutorialProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: 'Welcome to ChefBoard',
      description: 'Your new favorite way to manage recipes and meal plans.',
      icon: <ChefHat className="h-16 w-16 text-primary" />,
      color: 'bg-orange-100',
    },
    {
      title: 'Add Your Recipes',
      description: 'Paste a URL or type manually to save your favorite recipes.',
      icon: <Utensils className="h-16 w-16 text-green-600" />,
      color: 'bg-green-100',
    },
    {
      title: 'Plan Your Week',
      description: 'Add recipes to your weekly plan and generate grocery lists automatically.',
      icon: <Calendar className="h-16 w-16 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      title: 'Cooking Mode',
      description: 'Follow step-by-step instructions with a screen that stays on.',
      icon: <ChefHat className="h-16 w-16 text-orange-600" />,
      color: 'bg-orange-100',
    },
    {
      title: 'Share with Family',
      description: 'Invite family members to share recipes and meal plans instantly.',
      icon: <Users className="h-16 w-16 text-purple-600" />,
      color: 'bg-purple-100',
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
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-8"
          >
            <div
              className={`flex h-40 w-40 items-center justify-center rounded-full ${currentStep.color}`}
            >
              {currentStep.icon}
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">{currentStep.title}</h2>
              <p className="text-lg text-muted-foreground">{currentStep.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="bg-card p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
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
