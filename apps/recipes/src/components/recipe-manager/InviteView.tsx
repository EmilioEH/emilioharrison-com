import React, { useState } from 'react'
import { X, Key, UserPlus, Share, Copy, Loader2, User, Mail } from 'lucide-react'
import { Stack, Inline } from '@/components/ui/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { shareInvite } from '../../lib/share-invite'
import { alert } from '../../lib/dialogStore'
import { useStore } from '@nanostores/react'
import { $currentFamily } from '../../lib/familyStore'

interface InviteViewProps {
  onClose: () => void
}

type InviteTab = 'activation' | 'family'

export const InviteView: React.FC<InviteViewProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<InviteTab>('activation')
  const family = useStore($currentFamily)

  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-card p-6 animate-in slide-in-from-right">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Invite</h2>
        <button onClick={onClose}>
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 rounded-lg border border-border bg-muted p-1">
        <button
          onClick={() => setActiveTab('activation')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === 'activation'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Invite to App
        </button>
        <button
          onClick={() => setActiveTab('family')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-bold transition-colors ${
            activeTab === 'family'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Invite to Family
        </button>
      </div>

      <Stack spacing="xl">
        {activeTab === 'activation' && (
          <>
            {/* Activation Code Section */}
            <section>
              <Stack spacing="md">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Key className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">Invite Someone New to the App</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate an activation code for someone who doesn't have an account yet.
                      They'll use this code to create their account and get started with the Recipe
                      App.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background p-6">
                  <InviteCodeGenerator />
                </div>
              </Stack>
            </section>
          </>
        )}

        {activeTab === 'family' && (
          <>
            {/* Family Invite Section */}
            <section>
              <Stack spacing="md">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-secondary/10 p-3">
                    <UserPlus className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">Invite to Your Family</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add existing app users to your family group to share recipes, meal plans, and
                      ratings. They must already have an account.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background p-6">
                  {family ? (
                    <FamilyInviteForm familyName={family.name} />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <User className="mx-auto mb-2 h-12 w-12 opacity-20" />
                      <p className="text-sm">You need to create a family first.</p>
                      <p className="mt-1 text-xs">
                        Go to Settings → Family to set up your family group.
                      </p>
                    </div>
                  )}
                </div>
              </Stack>
            </section>
          </>
        )}
      </Stack>
    </div>
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
          <div className="mb-1 text-sm text-muted-foreground">Your Activation Code</div>
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
      Generate New Code
    </button>
  )
}

const FamilyInviteForm: React.FC<{ familyName: string }> = ({ familyName }) => {
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/families/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (data.success) {
        await alert(`${inviteEmail} has been invited to ${familyName}!`)
        setInviteEmail('')
      } else {
        await alert(data.error || 'Failed to invite member')
      }
    } catch {
      await alert('Error inviting member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing="md">
      <div className="rounded-lg bg-muted/30 p-4">
        <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>Inviting to:</span>
        </div>
        <div className="font-bold text-foreground">{familyName}</div>
      </div>

      <Stack spacing="sm">
        <label htmlFor="family-invite-email" className="text-sm font-medium text-foreground">
          Email Address
        </label>
        <Inline spacing="sm">
          <Input
            id="family-invite-email"
            type="email"
            placeholder="partner@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inviteEmail.trim()) {
                handleInvite()
              }
            }}
          />
          <Button onClick={handleInvite} disabled={loading || !inviteEmail.trim()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </Inline>
        <p className="text-xs text-muted-foreground">
          They must already have an account. If they don't, use an activation code instead.
        </p>
      </Stack>
    </Stack>
  )
}
