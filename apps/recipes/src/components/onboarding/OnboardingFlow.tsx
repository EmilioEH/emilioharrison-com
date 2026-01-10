import React, { useState, useEffect } from 'react'
import { DesktopBlocker } from './DesktopBlocker'
import { InstallInstructions } from './InstallInstructions'
import { WelcomeTutorial } from './WelcomeTutorial'

interface OnboardingFlowProps {
  onComplete: () => void
}

type OnboardingStep = 'check-device' | 'install-instructions' | 'tutorial'

const checkMobile = () => {
  if (typeof window === 'undefined') return true // Default for SSR
  const ua = navigator.userAgent.toLowerCase()
  const isMobileDevice = /iphone|ipad|ipod|android|mobile/.test(ua)
  const isSmallScreen = window.innerWidth <= 768
  return isMobileDevice || isSmallScreen
}

const checkStandalone = () => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  // Initialize state based on current environment immediately
  const [isMobile, setIsMobile] = useState(() => checkMobile())

  const [step, setStep] = useState<OnboardingStep>(() => {
    const mobile = checkMobile()
    if (!mobile) return 'check-device'

    // If mobile, check standalone
    if (checkStandalone()) return 'tutorial'
    return 'install-instructions'
  })

  // We still keep the effect to handle resize or dynamic changes,
  // but initial render should be correct now.
  useEffect(() => {
    const handleResize = () => {
      const mobile = checkMobile()
      setIsMobile(mobile)

      // If we switched from desktop to mobile, reset step if needed
      if (mobile && step === 'check-device') {
        if (checkStandalone()) setStep('tutorial')
        else setStep('install-instructions')
      }
      // If we switched from mobile to desktop
      if (!mobile) {
        setStep('check-device')
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [step])

  if (step === 'check-device' && !isMobile) {
    return <DesktopBlocker />
  }

  if (step === 'install-instructions') {
    return <InstallInstructions onContinue={() => setStep('tutorial')} />
  }

  if (step === 'tutorial') {
    return <WelcomeTutorial onComplete={onComplete} />
  }

  // Fallback (e.g. initial render before effect)
  return null
}
