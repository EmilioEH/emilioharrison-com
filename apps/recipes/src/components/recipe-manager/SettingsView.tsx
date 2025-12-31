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
  <div className="absolute inset-0 z-50 bg-card p-6 animate-in slide-in-from-right">
    <div className="mb-8 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold text-foreground">Data Management</h2>
      <button onClick={onClose}>
        <X className="h-6 w-6" />
      </button>
    </div>

    <div className="space-y-8">
      <section>
        <h3 className="text-foreground-variant mb-4 text-xs font-bold uppercase tracking-wider">
          Export & Import
        </h3>
        <div className="flex flex-col gap-4">
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
