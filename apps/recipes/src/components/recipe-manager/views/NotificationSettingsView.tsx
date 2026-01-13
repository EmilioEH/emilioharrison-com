import React, { useState, useEffect } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import { Stack } from '@/components/ui/layout'
import { Button } from '@/components/ui/button'
import { PushNotificationManager } from '../PushNotificationManager'

interface NotificationSettingsViewProps {
  onClose: () => void
}

export const NotificationSettingsView: React.FC<NotificationSettingsViewProps> = ({ onClose }) => {
  const [preferences, setPreferences] = useState({
    timers: true,
    mealPlan: true,
    cooking: true,
    invites: true,
  })
  const [isSaving, setIsSaving] = useState(false)

  // Load initial preferences (mock for now, waiting for backend implementation)
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const res = await fetch('/protected/recipes/api/user/preferences')
        if (res.ok) {
          const data = await res.json()
          if (data.preferences?.notifications) {
            setPreferences(data.preferences.notifications)
          }
        }
      } catch (e) {
        console.error('Failed to load preferences', e)
      }
    }
    loadPrefs()
  }, [])

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch('/protected/recipes/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: preferences }),
      })
      onClose()
    } catch (e) {
      console.error('Failed to save', e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-card p-6 animate-in slide-in-from-right">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Notifications</h2>
        <button onClick={onClose}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <Stack spacing="xl">
        <section>
          <PushNotificationManager />
        </section>

        <section>
          <h3 className="text-foreground-variant mb-4 text-xs font-bold uppercase tracking-wider">
            Customize Alerts
          </h3>
          <div className="bg-surface overflow-hidden rounded-lg border border-border">
            {/* Timers */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <div className="font-bold">Cooking Timers</div>
                <div className="text-xs opacity-70">Alerts when timers finish</div>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={preferences.timers}
                  onChange={() => handleToggle('timers')}
                />
                <div className="h-6 w-11 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-5" />
              </div>
            </div>

            {/* Meal Plan */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <div className="font-bold">Meal Plan Updates</div>
                <div className="text-xs opacity-70">When family adds meals</div>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={preferences.mealPlan}
                  onChange={() => handleToggle('mealPlan')}
                />
                <div className="h-6 w-11 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-5" />
              </div>
            </div>

            {/* Cooking Alerts */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <div className="font-bold">Family Cooking</div>
                <div className="text-xs opacity-70">When someone starts cooking</div>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={preferences.cooking}
                  onChange={() => handleToggle('cooking')}
                />
                <div className="h-6 w-11 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-5" />
              </div>
            </div>

            {/* Invites */}
            <div className="flex items-center justify-between p-4">
              <div>
                <div className="font-bold">Family Invites</div>
                <div className="text-xs opacity-70">When you receive an invite</div>
              </div>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={preferences.invites}
                  onChange={() => handleToggle('invites')}
                />
                <div className="h-6 w-11 rounded-full bg-input transition-colors peer-checked:bg-primary" />
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-5" />
              </div>
            </div>
          </div>
        </section>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Preferences
        </Button>
      </Stack>
    </div>
  )
}
