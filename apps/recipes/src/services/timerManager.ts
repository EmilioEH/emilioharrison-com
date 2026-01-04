import { $cookingSession, cookingSessionActions, type Timer } from '../stores/cookingSession'

class TimerManagerService {
  private intervals: Record<string, NodeJS.Timeout> = {}

  async requestNotificationPermission() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  createTimer(stepNumber: number, durationMinutes: number, label: string = 'Timer') {
    const id = crypto.randomUUID()
    const durationSeconds = durationMinutes * 60

    const newTimer: Timer = {
      id,
      stepNumber,
      duration: durationSeconds,
      remaining: durationSeconds,
      isRunning: false,
      label,
    }

    cookingSessionActions.updateTimer(newTimer)
    return id
  }

  startTimer(timerId: string) {
    const session = $cookingSession.get()
    const timer = session.activeTimers[timerId]
    if (!timer || timer.isRunning) return

    // Update state to running
    cookingSessionActions.updateTimer({ ...timer, isRunning: true })

    // Request permissions implicitly on start
    this.requestNotificationPermission()

    // Clear existing interval if any (safety)
    if (this.intervals[timerId]) clearInterval(this.intervals[timerId])

    // Start interval
    this.intervals[timerId] = setInterval(() => {
      const currentSession = $cookingSession.get()
      const currentTimer = currentSession.activeTimers[timerId]

      if (!currentTimer) {
        this.clearTimerInterval(timerId)
        return
      }

      if (currentTimer.remaining <= 0) {
        this.timerFinished(timerId)
        return
      }

      cookingSessionActions.updateTimer({
        ...currentTimer,
        remaining: currentTimer.remaining - 1,
      })
    }, 1000)
  }

  pauseTimer(timerId: string) {
    const session = $cookingSession.get()
    const timer = session.activeTimers[timerId]
    if (!timer || !timer.isRunning) return

    this.clearTimerInterval(timerId)
    cookingSessionActions.updateTimer({ ...timer, isRunning: false })
  }

  addTime(timerId: string, minutes: number) {
    const session = $cookingSession.get()
    const timer = session.activeTimers[timerId]
    if (!timer) return

    cookingSessionActions.updateTimer({
      ...timer,
      remaining: timer.remaining + minutes * 60,
    })
  }

  cancelTimer(timerId: string) {
    this.clearTimerInterval(timerId)
    cookingSessionActions.removeTimer(timerId)
  }

  private clearTimerInterval(timerId: string) {
    if (this.intervals[timerId]) {
      clearInterval(this.intervals[timerId])
      delete this.intervals[timerId]
    }
  }

  private timerFinished(timerId: string) {
    this.clearTimerInterval(timerId)
    const session = $cookingSession.get()
    const timer = session.activeTimers[timerId]

    if (timer) {
      cookingSessionActions.updateTimer({ ...timer, isRunning: false, remaining: 0 })
      // Trigger Notification / Sound
      this.playAlarmSound()
      this.sendNotification(`Timer Finished (Step ${timer.stepNumber})`, 'Time to check your food!')
    }
  }

  private sendNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg' })
    }
  }

  private playAlarmSound() {
    // Simple beep or browser notification logic
    // For MVP, we'll try standard Audio if available, or just console
    try {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtor) {
        const ctx = new AudioCtor()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 1)
        osc.stop(ctx.currentTime + 1)
      }
    } catch {
      console.log('Timer finished! (Audio API not supported or blocked)')
    }
  }
}

export const TimerManager = new TimerManagerService()
