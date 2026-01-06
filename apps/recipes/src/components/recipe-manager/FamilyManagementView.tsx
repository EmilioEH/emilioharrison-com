import React, { useState } from 'react'
import { UserPlus, Shield, User, Trash2, ArrowLeft } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { $currentFamily, $familyMembers, familyActions } from '../../lib/familyStore'
import { Stack, Inline } from '../ui/layout'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { confirm, alert } from '../../lib/dialogStore'

interface FamilyManagementViewProps {
  onClose: () => void
}

export const FamilyManagementView: React.FC<FamilyManagementViewProps> = ({ onClose }) => {
  const family = useStore($currentFamily)
  const members = useStore($familyMembers)

  const [isEditingName, setIsEditingName] = useState(false)
  const [newFamilyName, setNewFamilyName] = useState(family?.name || '')
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdateName = async () => {
    if (!newFamilyName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/families/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFamilyName }),
      })
      const data = await res.json()
      if (data.success) {
        familyActions.setFamily({ ...family!, name: newFamilyName })
        setIsEditingName(false)
      } else {
        alert(data.error || 'Failed to update family name')
      }
    } catch {
      alert('Error updating family name')
    } finally {
      setLoading(false)
    }
  }

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
        alert(`${inviteEmail} has been invited!`)
        setInviteEmail('')
        // Refresh members
        const fresh = await fetch('/protected/recipes/api/families/current').then((r) => r.json())
        if (fresh.success) familyActions.setMembers(fresh.members)
      } else {
        alert(data.error || 'Failed to invite member')
      }
    } catch {
      alert('Error inviting member')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (targetUserId: string, name: string) => {
    const isConfirmed = await confirm(
      `Are you sure you want to remove ${name} from the family? They will lose access to all shared recipes and plans.`,
    )
    if (!isConfirmed) return

    setLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/families/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })
      const data = await res.json()
      if (data.success) {
        familyActions.setMembers(members.filter((m) => m.id !== targetUserId))
      } else {
        alert(data.error || 'Failed to remove member')
      }
    } catch {
      alert('Error removing member')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (targetUserId: string, role: 'admin' | 'user') => {
    setLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/families/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, role }),
      })
      const data = await res.json()
      if (data.success) {
        familyActions.setMembers(members.map((m) => (m.id === targetUserId ? { ...m, role } : m)))
      } else {
        alert(data.error || 'Failed to update role')
      }
    } catch {
      alert('Error updating role')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFamily = async () => {
    if (!family) return

    const isConfirmed = await confirm(
      `Are you sure you want to delete "${family.name}"? This will permanently delete all shared family data including notes, ratings, and meal plans. This action cannot be undone.`,
    )
    if (!isConfirmed) return

    setLoading(true)
    try {
      const res = await fetch('/protected/recipes/api/families/current', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        familyActions.setFamily(null)
        familyActions.setMembers([])
        onClose()
        alert('Family deleted successfully')
      } else {
        alert(data.error || 'Failed to delete family')
      }
    } catch {
      alert('Error deleting family')
    } finally {
      setLoading(false)
    }
  }

  if (!family) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-card animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <Inline spacing="md" align="center">
          <button onClick={onClose} className="hover:bg-card-variant -ml-2 rounded-full p-2">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h2 className="font-display text-2xl font-bold text-foreground">Manage Family</h2>
        </Inline>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Stack spacing="xl" className="mx-auto max-w-2xl pb-20">
          {/* Family Identity Section */}
          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <Stack spacing="md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Family Identity
              </h3>
              {isEditingName ? (
                <Inline spacing="sm" align="center">
                  <Input
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    className="flex-1"
                    placeholder="Enter family name"
                  />
                  <Button onClick={handleUpdateName} disabled={loading}>
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </Inline>
              ) : (
                <Inline justify="between" align="center">
                  <div>
                    <div className="text-lg font-bold">{family.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(family.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingName(true)}>
                    Rename
                  </Button>
                </Inline>
              )}
            </Stack>
          </section>

          {/* Members List Section */}
          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <Stack spacing="lg">
              <Inline justify="between" align="center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Members ({members.length})
                </h3>
              </Inline>

              <Stack spacing="none" className="divide-y divide-border">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <Inline spacing="md" align="center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {member.role === 'creator' ? (
                          <Shield className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-bold">
                          {member.displayName}
                          {member.role === 'creator' && (
                            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                              Creator
                            </span>
                          )}
                          {member.role === 'admin' && (
                            <span className="rounded bg-secondary/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-secondary-foreground">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </div>
                    </Inline>

                    {member.role !== 'creator' && (
                      <Inline spacing="sm">
                        <select
                          className="rounded border border-border bg-transparent px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                          value={member.role || 'user'}
                          onChange={(e) =>
                            handleUpdateRole(member.id, e.target.value as 'admin' | 'user')
                          }
                          disabled={loading}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.displayName)}
                          className="rounded-full p-2 text-destructive transition-colors hover:bg-destructive/10"
                          title="Remove Member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Inline>
                    )}
                  </div>
                ))}
              </Stack>
            </Stack>
          </section>

          {/* Invite Section */}
          <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
            <Stack spacing="md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Invite New Member
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter your partner's or family member's email address. They must have already signed
                into the app once.
              </p>
              <Inline spacing="sm">
                <Input
                  type="email"
                  placeholder="partner@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleInvite} disabled={loading || !inviteEmail.trim()}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite
                </Button>
              </Inline>
            </Stack>
          </section>

          {/* Danger Zone - Only show for creator */}
          {(() => {
            // Get current user from members array by checking displayName against cookie
            const currentUserName = document.cookie.match(/site_user=([^;]+)/)?.[1]
            const currentUser = members.find((m) => m.displayName === currentUserName)
            const isCreator = currentUser && family.createdBy === currentUser.id

            if (!isCreator) return null

            return (
              <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
                <Stack spacing="md">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-destructive">
                    Danger Zone
                  </h3>
                  <Inline justify="between" align="center">
                    <div>
                      <div className="text-sm font-bold">Delete Family</div>
                      <div className="text-xs text-muted-foreground">
                        Permanently delete this family and all shared data
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteFamily}
                      disabled={loading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Family
                    </Button>
                  </Inline>
                </Stack>
              </section>
            )
          })()}
        </Stack>
      </div>
    </div>
  )
}
