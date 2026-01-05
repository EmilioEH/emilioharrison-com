import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Stack, Inline } from '../ui/layout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface FamilySetupProps {
  open: boolean
  onComplete: () => void
}

export function FamilySetup({ open, onComplete }: FamilySetupProps) {
  const [mode, setMode] = useState<'create' | 'join' | null>(null)
  const [familyName, setFamilyName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      setError('Please enter a family name')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/protected/recipes/api/families/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create family')
      }

      // If partner email was provided, invite them
      if (partnerEmail.trim()) {
        await handleInvitePartner()
      } else {
        onComplete()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleInvitePartner = async () => {
    if (!partnerEmail.trim()) {
      setError("Please enter your partner's email")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/protected/recipes/api/families/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: partnerEmail }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to invite partner')
      }

      onComplete()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Allow user to skip family setup for now
    onComplete()
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md">
        {!mode ? (
          <>
            <DialogHeader>
              <DialogTitle>Set Up Family Sync</DialogTitle>
              <DialogDescription>
                Sync your recipe notes, ratings, and meal plans with your family members.
              </DialogDescription>
            </DialogHeader>

            <Stack spacing="md">
              <Button onClick={() => setMode('create')} className="w-full">
                Create Family Workspace
              </Button>

              <Button onClick={handleSkip} variant="outline" className="w-full">
                Skip for Now
              </Button>
            </Stack>
          </>
        ) : mode === 'create' ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Your Family Workspace</DialogTitle>
              <DialogDescription>
                Give your family a name and optionally invite your partner.
              </DialogDescription>
            </DialogHeader>

            <Stack spacing="md">
              <div>
                <label htmlFor="familyName" className="text-sm font-medium">
                  Family Name
                </label>
                <Input
                  id="familyName"
                  placeholder="Smith Family"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="partnerEmail" className="text-sm font-medium">
                  Partner's Email (Optional)
                </label>
                <Input
                  id="partnerEmail"
                  type="email"
                  placeholder="partner@example.com"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  They must sign in to the app first before you can invite them
                </p>
              </div>

              {error && (
                <div className="rounded bg-destructive/10 p-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </Stack>

            <DialogFooter>
              <Inline spacing="sm" justify="end">
                <Button onClick={() => setMode(null)} variant="outline" disabled={loading}>
                  Back
                </Button>
                <Button onClick={handleCreateFamily} disabled={loading || !familyName.trim()}>
                  {loading ? 'Creating...' : 'Create Family'}
                </Button>
              </Inline>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
