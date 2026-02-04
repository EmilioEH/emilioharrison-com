import React from 'react'
import { useStore } from '@nanostores/react'
import { Calendar, Clock, ChefHat, RotateCcw } from 'lucide-react'
import { $userPreferences, updatePreference, resetPreferences } from '../../lib/userPreferences'

export const WeekPlannerSettings: React.FC = () => {
  const preferences = useStore($userPreferences)

  const handleDayChange = (day: 'thursday' | 'friday' | 'saturday' | 'sunday') => {
    updatePreference('planNextWeekStartDay', day)
  }

  const handleMealTimeChange = (meal: 'breakfast' | 'lunch' | 'dinner', time: string) => {
    updatePreference('defaultMealTimes', {
      ...preferences.defaultMealTimes,
      [meal]: time,
    })
  }

  const handleThresholdChange = (hours: number) => {
    updatePreference('cookingModeThreshold', hours * 60)
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Week Planner Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Customize how your week planning works</p>
      </div>

      {/* Week Transition */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Week Planning</h3>
        </div>
        <div>
          <span id="week-start-label" className="text-sm font-medium text-foreground">
            Start planning next week on:
          </span>
          <p className="mb-2 text-xs text-muted-foreground">
            When should the week planner switch from "This Week" to "Next Week"?
          </p>
          <div role="group" aria-labelledby="week-start-label" className="grid grid-cols-2 gap-2">
            {(['thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
              <button
                key={day}
                onClick={() => handleDayChange(day)}
                aria-pressed={preferences.planNextWeekStartDay === day}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  preferences.planNextWeekStartDay === day
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/50 text-foreground hover:bg-muted'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Default Meal Times */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Default Meal Times</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Used when you don't specify a time for a meal. Adjust to match your schedule.
        </p>
        <div className="space-y-3">
          {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
            <div key={meal} className="flex items-center justify-between">
              <label className="text-sm font-medium capitalize text-foreground">{meal}</label>
              <input
                type="time"
                value={preferences.defaultMealTimes[meal]}
                onChange={(e) => handleMealTimeChange(meal, e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Cooking Mode Threshold */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Cooking Mode</h3>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">
            Switch to cooking mode:{' '}
            <span className="text-primary">
              {preferences.cookingModeThreshold / 60} hour
              {preferences.cookingModeThreshold / 60 !== 1 ? 's' : ''}
            </span>{' '}
            before meal
          </label>
          <p className="mb-2 text-xs text-muted-foreground">
            When should the interface switch from planning to cooking mode?
          </p>
          <input
            type="range"
            min="1"
            max="4"
            step="0.5"
            value={preferences.cookingModeThreshold / 60}
            onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>1 hour</span>
            <span>2 hours</span>
            <span>3 hours</span>
            <span>4 hours</span>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetPreferences}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <RotateCcw className="h-4 w-4" />
        Reset to Defaults
      </button>

      {/* Info Footer */}
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <p>
          <strong>Note:</strong> These are default settings. You can still set specific times for
          individual meals when adding them to your week.
        </p>
      </div>
    </div>
  )
}
