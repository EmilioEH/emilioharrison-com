import React, { useState } from 'react'
import { X, Download, Upload, Trash2, User, Save, Loader2 } from 'lucide-react'
import { Stack } from '@/components/ui/layout'

interface SettingsViewProps {
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeleteAccount: () => void
  onClose: () => void
  currentName?: string
  onUpdateProfile: (name: string) => Promise<boolean>
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onExport,
  onImport,
  onDeleteAccount,
  onClose,
  currentName,
  onUpdateProfile,
}) => {
  const [name, setName] = useState(currentName || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveProfile = async () => {
    if (!name.trim()) return
    setIsSaving(true)
    await onUpdateProfile(name)
    setIsSaving(false)
  }

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-card p-6 animate-in slide-in-from-right">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Settings</h2>
        <button onClick={onClose}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <Stack spacing="xl">
        {/* Profile Section */}
        <section>
          <h3 className="text-foreground-variant mb-4 text-xs font-bold uppercase tracking-wider">
            Profile
          </h3>
          <div className="bg-surface rounded-lg border border-border p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="bg-primary-container text-primary-on-container rounded-full p-3">
                <User className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-bold">Display Name</div>
                <div className="text-xs opacity-70">How you appear in the app</div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <button
                onClick={handleSaveProfile}
                disabled={isSaving || name === currentName}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Save</span>
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-foreground-variant mb-4 text-xs font-bold uppercase tracking-wider">
            Data Management
          </h3>
          <Stack spacing="md">
            <button
              onClick={onExport}
              className="hover:bg-card-variant flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors"
            >
              <div className="bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container rounded-full p-2">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold">Export Data</div>
                <div className="text-xs opacity-70">Download your recipes as JSON</div>
              </div>
            </button>
            <label className="hover:bg-card-variant flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors">
              <div className="bg-md-sys-color-tertiary-container text-md-sys-color-on-tertiary-container rounded-full p-2">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold">Import Data</div>
                <div className="text-xs opacity-70">Restore recipes from JSON backup</div>
              </div>
              <input type="file" className="hidden" onChange={onImport} accept=".json" />
            </label>
          </Stack>
        </section>

        <section className="border-t border-border pt-6">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-red-600">
            Danger Zone
          </h3>
          <button
            onClick={onDeleteAccount}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 className="h-5 w-5" /> Delete All Data
          </button>
        </section>
      </Stack>
    </div>
  )
}
