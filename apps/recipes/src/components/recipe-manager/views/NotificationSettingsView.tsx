import React, { useState, useEffect } from 'react'
import { X, Loader2, Save, ChevronDown, Clock, Calendar } from 'lucide-react'
import { Stack } from '@/components/ui/layout'
import { Button } from '@/components/ui/button'
import { PushNotificationManager } from '../PushNotificationManager'
import type { User, ReminderSettings } from '@/lib/types'

interface NotificationSettingsViewProps {
  onClose: () => void
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMES = Array.from({ length: 24 }).map((_, i) => {
  const hour = i
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return {
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: `${displayHour}:00 ${ampm}`,
  }
})

const DEFAULT_REMINDERS: ReminderSettings = {
  weeklyPlan: { enabled: false, day: 'Sunday', time: '18:00' },
  groceryList: { enabled: false, day: 'Sunday', time: '10:00' },
  dailyCooking: { enabled: false, offsetHours: 2 },
}

export const NotificationSettingsView: React.FC<NotificationSettingsViewProps> = ({ onClose }) => {
  const [preferences, setPreferences] = useState<User['notificationPreferences']>({
    email: true,
    push: true,
    types: {
      timers: true,
      mealPlan: true,
      cooking: true,
      invites: true,
    },
    reminders: DEFAULT_REMINDERS,
  })
  const [isSaving, setIsSaving] = useState(false)

  // Load initial preferences
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const res = await fetch('/protected/recipes/api/user/preferences')
        if (res.ok) {
          const data = await res.json()
          const prefs = data.preferences?.notifications || {}

          // Handle migration/defaults
          setPreferences({
            email: prefs.email ?? true,
            push: prefs.push ?? true,
            types: {
              timers: prefs.types?.timers ?? prefs.timers ?? true,
              mealPlan: prefs.types?.mealPlan ?? prefs.mealPlan ?? true,
              cooking: prefs.types?.cooking ?? prefs.cooking ?? true,
              invites: prefs.types?.invites ?? prefs.invites ?? true,
            },
            reminders: {
              ...DEFAULT_REMINDERS,
              ...(prefs.reminders || {}),
            },
          })
        }
      } catch (e) {
        console.error('Failed to load preferences', e)
      }
    }
    loadPrefs()
  }, [])

  type NotificationTypes = NonNullable<NonNullable<User['notificationPreferences']>['types']>
  const handleToggle = (key: keyof NotificationTypes) => {
    setPreferences((prev) => ({
      ...prev,
      types: {
        ...prev?.types,
        [key]: !prev?.types?.[key],
      },
    }))
  }

  const handleReminderChange = (
    category: keyof ReminderSettings,
    field: string,
    value: string | number | boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      reminders: {
        ...(prev?.reminders || DEFAULT_REMINDERS),
        [category]: {
          ...(prev?.reminders?.[category] || DEFAULT_REMINDERS[category]),
          [field]: value,
        },
      },
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

      <Stack spacing="xl" className="pb-24">
        <section>
          <PushNotificationManager />
        </section>

        <section>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Customize Alerts
          </h3>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {/* Timers */}
            <ToggleRow
              label="Cooking Timers"
              desc="Alerts when timers finish"
              checked={!!preferences?.types?.timers}
              onChange={() => handleToggle('timers')}
            />
            {/* Meal Plan */}
            <ToggleRow
              label="Meal Plan Updates"
              desc="When family adds meals"
              checked={!!preferences?.types?.mealPlan}
              onChange={() => handleToggle('mealPlan')}
            />
            {/* Cooking Alerts */}
            <ToggleRow
              label="Family Cooking"
              desc="When someone starts cooking"
              checked={!!preferences?.types?.cooking}
              onChange={() => handleToggle('cooking')}
            />
            {/* Invites */}
            <ToggleRow
              label="Family Invites"
              desc="When you receive an invite"
              checked={!!preferences?.types?.invites}
              onChange={() => handleToggle('invites')}
              last
            />
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Reminder Schedule
          </h3>
          <Stack spacing="md">
            {/* Weekly Plan Reminder */}
            <CollapsibleReminderCard
              label="Weekly Meal Planning"
              desc="Remind me to plan next week's meals"
              enabled={!!preferences?.reminders?.weeklyPlan?.enabled}
              onToggle={() =>
                handleReminderChange(
                  'weeklyPlan',
                  'enabled',
                  !preferences?.reminders?.weeklyPlan?.enabled,
                )
              }
            >
              <div className="grid grid-cols-2 gap-4 pb-4 pt-2">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Day
                  </span>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={preferences?.reminders?.weeklyPlan?.day}
                      onChange={(e) => handleReminderChange('weeklyPlan', 'day', e.target.value)}
                    >
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Time
                  </span>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={preferences?.reminders?.weeklyPlan?.time}
                      onChange={(e) => handleReminderChange('weeklyPlan', 'time', e.target.value)}
                    >
                      {TIMES.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                    <Clock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
                  </div>
                </div>
              </div>
            </CollapsibleReminderCard>

            {/* Grocery List Reminder */}
            <CollapsibleReminderCard
              label="Grocery List"
              desc="Remind me to generate my shopping list"
              enabled={!!preferences?.reminders?.groceryList?.enabled}
              onToggle={() =>
                handleReminderChange(
                  'groceryList',
                  'enabled',
                  !preferences?.reminders?.groceryList?.enabled,
                )
              }
            >
              <div className="grid grid-cols-2 gap-4 pb-4 pt-2">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Day
                  </span>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={preferences?.reminders?.groceryList?.day}
                      onChange={(e) => handleReminderChange('groceryList', 'day', e.target.value)}
                    >
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
                  </div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Time
                  </span>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      value={preferences?.reminders?.groceryList?.time}
                      onChange={(e) => handleReminderChange('groceryList', 'time', e.target.value)}
                    >
                      {TIMES.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                  </div>
                </div>
              </div>
            </CollapsibleReminderCard>

            {/* Daily Cooking Reminder */}
            <CollapsibleReminderCard
              label="Daily Cooking"
              desc="Remind me what to cook today"
              enabled={!!preferences?.reminders?.dailyCooking?.enabled}
              onToggle={() =>
                handleReminderChange(
                  'dailyCooking',
                  'enabled',
                  !preferences?.reminders?.dailyCooking?.enabled,
                )
              }
            >
              <div className="pb-4 pt-2">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  When to remind
                </span>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={preferences?.reminders?.dailyCooking?.offsetHours}
                    onChange={(e) =>
                      handleReminderChange('dailyCooking', 'offsetHours', parseInt(e.target.value))
                    }
                  >
                    <option value={1}>1 hour before meal</option>
                    <option value={2}>2 hours before meal</option>
                    <option value={3}>3 hours before meal</option>
                    <option value={4}>4 hours before meal</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                </div>
              </div>
            </CollapsibleReminderCard>
          </Stack>
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

// Helper Components

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  last,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: () => void
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between p-4 ${!last ? 'border-b border-border' : ''}`}
    >
      <div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label?: string
}) {
  return (
    <label
      className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:bg-muted/50"
      aria-label={label || 'Toggle'}
    >
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <div className="h-6 w-11 rounded-full bg-input transition-colors peer-checked:bg-primary" />
      <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-5" />
    </label>
  )
}

interface CollapsibleReminderCardProps {
  label: string
  desc: string
  enabled: boolean
  onToggle: () => void
  children: React.ReactNode
}

function CollapsibleReminderCard({
  label,
  desc,
  enabled,
  onToggle,
  children,
}: CollapsibleReminderCardProps) {
  // Local state for expanded adds a nice UX detail where you can
  // expand it to edit even if disabled (optional, but sticking to enabled-driven for now)
  // Actually, usually users expect to be able to configure it only if enabled,
  // OR configure it then enable it.
  // Let's make it expand ONLY when enabled for simplicity per mockup.
  const [isExpanded, setIsExpanded] = useState(enabled)

  // Sync expanded state with enabled state, but allow manual toggle if needed?
  // For this pattern: "Toggle switch... when expanded" usually implies enabled = expanded.
  useEffect(() => {
    setIsExpanded(enabled)
  }, [enabled])

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-colors ${
        enabled ? 'border-border bg-card' : 'border-border/50 bg-card/50'
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <div>
          <div className={`text-sm font-bold ${enabled ? '' : 'text-muted-foreground'}`}>
            {label}
          </div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <Switch checked={enabled} onChange={onToggle} />
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-2">
            <div className="mb-3 h-px w-full bg-border/50" />
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
