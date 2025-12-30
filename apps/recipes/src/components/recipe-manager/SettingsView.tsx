import React from 'react'
import { X, Download, Upload, Trash2 } from 'lucide-react'

interface SettingsViewProps {
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeleteAccount: () => void
  onClose: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onExport,
  onImport,
  onDeleteAccount,
  onClose,
}) => (
  <div className="animate-in slide-in-from-right absolute inset-0 z-50 bg-card p-6">
    <div className="mb-8 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold text-foreground">
        Data Management
      </h2>
      <button onClick={onClose}>
        <X className="h-6 w-6" />
      </button>
    </div>

    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground-variant">
          Export & Import
        </h3>
        <div className="flex flex-col gap-4">
          <button
            onClick={onExport}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-card-variant"
          >
            <div className="rounded-full bg-md-sys-color-secondary-container p-2 text-md-sys-color-on-secondary-container">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Export Data</div>
              <div className="text-xs opacity-70">Download your recipes as JSON</div>
            </div>
          </button>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-card-variant">
            <div className="rounded-full bg-md-sys-color-tertiary-container p-2 text-md-sys-color-on-tertiary-container">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Import Data</div>
              <div className="text-xs opacity-70">Restore recipes from JSON backup</div>
            </div>
            <input type="file" className="hidden" onChange={onImport} accept=".json" />
          </label>
        </div>
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
    </div>
  </div>
)
