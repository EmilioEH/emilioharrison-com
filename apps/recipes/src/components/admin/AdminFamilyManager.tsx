import React, { useEffect, useState, useCallback } from 'react'
import { ArrowLeft, Trash2, Edit2, Shield } from 'lucide-react'
import { Stack, Inline } from '@/components/ui/layout'
import { alert, confirm } from '../../lib/dialogStore'
import { Badge } from '@/components/ui/badge'
import type { Family, User, PendingInvite } from '../../lib/types'

interface AdminFamilyManagerProps {
  familyId: string
  onBack: () => void
}

export const AdminFamilyManager: React.FC<AdminFamilyManagerProps> = ({ familyId, onBack }) => {
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Use the familyId override we added to existing API
      const res = await fetch(`/api/families/current?familyId=${familyId}`)
      const data = await res.json()

      if (data.success) {
        setFamily(data.family)
        setMembers(data.members)
        setInvites(data.outgoingInvites || [])
      } else {
        throw new Error(data.error || 'Failed to load family')
      }
    } catch (e) {
      console.error(e)
      await alert('Failed to load family details')
      onBack()
    } finally {
      setIsLoading(false)
    }
  }, [familyId, onBack])

  useEffect(() => {
    fetchData()
  }, [familyId, fetchData])

  const handleRename = async () => {
    const newName = window.prompt('Enter new family name:', family?.name)
    if (!newName || newName === family?.name) return

    try {
      // We need to update PATCH to accept familyId override!
      // Placeholder:
      await alert('API update required: Admin PATCH family by ID')
    } catch {
      await alert('Failed to rename')
    }
  }

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const newRole = window.prompt('Enter new role (admin/user):', currentRole)
    if (!newRole || !['admin', 'user'].includes(newRole)) return

    try {
      const res = await fetch('/api/families/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, role: newRole }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchData()
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      await alert((e as Error).message)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!(await confirm('Remove this member?'))) return

    try {
      const res = await fetch('/api/families/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchData()
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      await alert((e as Error).message)
    }
  }

  if (isLoading) return <div className="p-8 text-center">Loading family data...</div>
  if (!family) return <div className="p-8 text-center text-red-500">Family not found</div>

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <Stack spacing="sm">
          <Inline spacing="sm" align="center">
            <button onClick={onBack} className="rounded-full p-2 hover:bg-muted">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{family.name}</h2>
              <p className="font-mono text-xs text-muted-foreground">{family.id}</p>
            </div>
            <button
              onClick={handleRename}
              className="rounded-full bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
            >
              <Edit2 size={16} />
            </button>
          </Inline>
        </Stack>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Stack spacing="lg">
          {/* Members Section */}
          <Stack spacing="md">
            <h3 className="text-sm font-bold uppercase text-muted-foreground">Members</h3>
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4">
                  <Inline spacing="md" align="center">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt="" className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <span className="font-bold">{member.displayName?.[0] || 'U'}</span>
                      </div>
                    )}
                    <Stack spacing="xs">
                      <span className="font-medium">{member.displayName || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </Stack>
                  </Inline>

                  <Inline spacing="sm" align="center">
                    <Badge variant={member.role === 'creator' ? 'default' : 'secondary'}>
                      {member.role || 'user'}
                    </Badge>

                    {member.role !== 'creator' && (
                      <>
                        <button
                          onClick={() => handleUpdateRole(member.id, member.role || 'user')}
                          className="p-2 text-muted-foreground hover:text-blue-600"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </Inline>
                </div>
              ))}
            </div>
          </Stack>

          {/* Invites Section */}
          {invites.length > 0 && (
            <Stack spacing="md">
              <h3 className="text-sm font-bold uppercase text-muted-foreground">Pending Invites</h3>
              <div className="divide-y divide-border rounded-lg border border-border bg-card">
                {invites.map((invite) => (
                  <div key={invite.id} className="p-4 text-sm">
                    {invite.email} (Invited by {invite.invitedByName})
                  </div>
                ))}
              </div>
            </Stack>
          )}

          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="mb-2 font-bold text-red-800">Danger Zone</h3>
            <button
              disabled={true} // Placeholder until API update is ready
              className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Delete Family (API Update Pending)
            </button>
          </div>
        </Stack>
      </div>
    </div>
  )
}
