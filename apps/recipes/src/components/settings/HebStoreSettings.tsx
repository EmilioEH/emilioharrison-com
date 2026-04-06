import React, { useState } from 'react'
import { useStore } from '@nanostores/react'
import { MapPin, Check, Loader2, ExternalLink, X } from 'lucide-react'
import { $hebStore, setHebStore } from '../../lib/userPreferences'

export const HebStoreSettings: React.FC = () => {
  const hebStore = useStore($hebStore)
  const [storeNumber, setStoreNumber] = useState('')
  const [storeName, setStoreName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`

  const handleVerify = async () => {
    const trimmed = storeNumber.trim()
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      setError('Enter a valid store number')
      return
    }

    setVerifying(true)
    setError('')
    setVerified(false)

    try {
      const res = await fetch(`${baseUrl}api/grocery/heb-verify-store?storeId=${trimmed}`)

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'Verification failed. Please try again.')
        return
      }

      const data = await res.json()

      if (data.valid) {
        setVerified(true)
      } else {
        setError('Could not verify this store number. Please check and try again.')
      }
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleSave = () => {
    const trimmed = storeNumber.trim()
    const name = storeName.trim() || `Store #${trimmed}`
    setHebStore({ storeId: trimmed, storeName: name })
    setStoreNumber('')
    setStoreName('')
    setVerified(false)
  }

  const handleRemove = () => {
    setHebStore(null)
  }

  return (
    <section>
      <h3 className="text-foreground-variant mb-4 text-xs font-bold uppercase tracking-wider">
        H-E-B Store
      </h3>
      <div className="bg-surface rounded-lg border border-border p-4">
        <div className="mb-4 flex items-center gap-4">
          <div className="bg-primary-container text-primary-on-container rounded-full p-3">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold">Preferred Store</div>
            <div className="text-xs opacity-70">Get prices and aisle locations for your H-E-B</div>
          </div>
        </div>

        {hebStore ? (
          <div className="flex items-center justify-between rounded-md border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold">{hebStore.storeName}</div>
                <div className="text-xs text-muted-foreground">Store #{hebStore.storeId}</div>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove store"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <a
              href="https://www.heb.com/store-locations"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Find your store number on heb.com
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <div>
              <label
                htmlFor="heb-store-number"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Store number
              </label>
              <div className="flex gap-2">
                <input
                  id="heb-store-number"
                  type="text"
                  inputMode="numeric"
                  value={storeNumber}
                  onChange={(e) => {
                    setStoreNumber(e.target.value)
                    setVerified(false)
                    setError('')
                  }}
                  placeholder="e.g. 811"
                  className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <button
                  onClick={handleVerify}
                  disabled={verifying || !storeNumber.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : verified ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            </div>

            {verified && (
              <div className="space-y-2">
                <div>
                  <label
                    htmlFor="heb-store-name"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Nickname (optional)
                  </label>
                  <input
                    id="heb-store-name"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder={`H-E-B #${storeNumber.trim()}`}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <button
                  onClick={handleSave}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Save Store
                </button>
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
