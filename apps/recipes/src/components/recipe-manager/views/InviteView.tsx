import React, { useState } from 'react'
import { X, UserPlus, Key, Share, Copy, Loader2 } from 'lucide-react'
import { Stack } from '@/components/ui/layout'
import { shareInvite } from '../../../lib/share-invite'
import { alert } from '../../../lib/dialogStore'
import { useStore } from '@nanostores/react'
import { $currentFamily } from '../../../lib/familyStore'

interface InviteViewProps {
  onClose: () => void
}

export const InviteView: React.FC<InviteViewProps> = ({ onClose }) => {
  const family = useStore($currentFamily)

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-card p-6 animate-in slide-in-from-right">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Invite Others</h2>
        <button onClick={onClose}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <Stack spacing="xl">
        {/* Invite to Family */}
        <section>
          <div className="bg-surface rounded-lg border border-border p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-bold">Invite to Your Family</div>
                <div className="text-xs opacity-70">
                  Add someone to your shared recipe collection. They must have signed in once
                  already.
                </div>
              </div>
            </div>
            <FamilyInviter familyId={family?.id} familyName={family?.name} />
          </div>
        </section>

        {/* Family Join Code */}
        <section>
          <div className="bg-surface rounded-lg border border-border p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="bg-secondary-container text-secondary-on-container rounded-full p-3">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-bold">Family Join Code</div>
                <div className="text-xs opacity-70">
                  Generate a temporary code for your partner to join this family easily.
                </div>
              </div>
            </div>
            <FamilyCodeGenerator />
          </div>
        </section>

        {/* Activation Code */}
        <section>
          <div className="bg-surface rounded-lg border border-border p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="bg-secondary-container text-secondary-on-container rounded-full p-3">
                <Key className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg font-bold">Activation Code</div>
                <div className="text-xs opacity-70">
                  Generate a code for a friend who doesn&apos;t have access yet. This lets them
                  create a new account.
                </div>
              </div>
            </div>
            <InviteCodeGenerator />
          </div>
        </section>
      </Stack>
    </div>
  )
}

const FamilyCodeGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)

  const generateCode = async () => {
    setLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/families/code', {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setCode(data.code)
      } else {
        alert(data.error || 'Failed to generate code')
      }
    } catch {
      alert('Error generating code')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!code) return
    await shareInvite({
      type: 'activation-code', // Using generic type for now
      code,
      inviterName: 'Join my Family',
    })
  }

  const handleCopy = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    alert('Code copied to clipboard!')
  }

  if (code) {
    return (
      <div className="animate-in fade-in zoom-in">
        <div className="mb-4 rounded bg-muted/50 p-4 text-center">
          <div className="mb-1 text-sm text-muted-foreground">Family Join Code</div>
          <div className="font-mono text-3xl font-bold tracking-widest text-primary">{code}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Share this with your partner. They can enter it in Settings &gt; Join Family.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Share className="h-4 w-4" /> Share
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-bold hover:bg-accent hover:text-accent-foreground"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button
            onClick={() => setCode(null)}
            className="inline-flex h-10 items-center justify-center px-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={generateCode}
      disabled={loading}
      className="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Key className="mr-2 h-4 w-4" />
      )}
      Generate Family Code
    </button>
  )
}

const InviteCodeGenerator: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)

  const generateCode = async () => {
    setLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/admin/access-codes', {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        setCode(data.code)
      } else {
        alert(data.error || 'Failed to generate code')
      }
    } catch {
      alert('Error generating code')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!code) return
    await shareInvite({
      type: 'activation-code',
      code,
    })
  }

  const handleCopy = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    alert('Code copied to clipboard!')
  }

  if (code) {
    return (
      <div className="animate-in fade-in zoom-in">
        <div className="mb-4 rounded bg-muted/50 p-4 text-center">
          <div className="mb-1 text-sm text-muted-foreground">Activation Code</div>
          <div className="font-mono text-3xl font-bold tracking-widest text-primary">{code}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Share className="h-4 w-4" /> Share
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-bold hover:bg-accent hover:text-accent-foreground"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button
            onClick={() => setCode(null)}
            className="inline-flex h-10 items-center justify-center px-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={generateCode}
      disabled={loading}
      className="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Key className="mr-2 h-4 w-4" />
      )}
      Generate Activation Code
    </button>
  )
}

interface FamilyInviterProps {
  familyId?: string
  familyName?: string
}

const FamilyInviter: React.FC<FamilyInviterProps> = ({ familyId, familyName }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (!familyId) {
    return (
      <div className="rounded-md bg-muted/50 px-3 py-2 text-center text-sm text-muted-foreground">
        Create or join a family first to send direct invites.
      </div>
    )
  }

  const handleInvite = async () => {
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/families/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
        setEmail('')
        await alert(`Invitation sent to ${email}!`)
        // Offer to share the invite
        if (familyName) {
          await shareInvite({
            type: 'family-invite',
            familyName,
            inviterName: 'You',
            invitedEmail: email,
          })
        }
        setSent(false)
      } else {
        await alert(data.error || 'Failed to send invite')
      }
    } catch {
      await alert('Error sending invite')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-md bg-green-50 p-3 text-center text-sm text-green-700 animate-in fade-in">
        Invitation sent! They will see the invite when they open the app.
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="partner@gmail.com"
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <button
        onClick={handleInvite}
        disabled={loading || !email.trim()}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        <span className="hidden sm:inline">Invite</span>
      </button>
    </div>
  )
}
