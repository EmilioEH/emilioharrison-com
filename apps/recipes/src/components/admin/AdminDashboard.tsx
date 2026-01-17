import React, { useState, useEffect } from 'react'
import { ShieldAlert, LogOut, Trash2, Ban, CheckCircle, LogIn } from 'lucide-react'
import { Inline } from '@/components/ui/layout'

interface AdminUser {
  id: string
  email: string
  displayName: string
  status: string
  joinedAt: string
  stats?: {
    recipesAdded: number
    recipesCooked: number
  }
  familyId?: string
}

interface InviteCode {
  code: string
  createdBy: string
  createdByName: string
  createdAt: string
  status?: string // 'pending' | 'accepted'
  acceptedBy?: string
  acceptedByName?: string
  acceptedAt?: string
}

interface FamilyInvite {
  id: string
  email: string
  familyId: string
  invitedByName: string
  status?: string // 'pending' | 'accepted'
  acceptedBy?: string
  acceptedAt?: string
  createdAt: string
}

interface AdminFamily {
  id: string
  name: string
  memberCount: number
  createdBy: string
}

interface AdminDashboardProps {
  onClose?: () => void
}

import { AdminFamilyManager } from './AdminFamilyManager'

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'families' | 'codes' | 'invites'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [families, setFamilies] = useState<AdminFamily[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [invites, setInvites] = useState<FamilyInvite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, familiesRes, codesRes, invitesRes] = await Promise.all([
        fetch('/protected/recipes/api/admin/users'),
        fetch('/protected/recipes/api/admin/families'),
        fetch('/protected/recipes/api/admin/access-codes'),
        fetch('/protected/recipes/api/admin/invites'),
      ])

      const usersData = await usersRes.json()
      const familiesData = await familiesRes.json()
      const codesData = await codesRes.json()
      const invitesData = await invitesRes.json()

      console.log('[AdminDashboard] Fetched Data:', {
        usersCount: usersData.users?.length,
        familiesCount: familiesData.families?.length,
        success: {
          users: usersData.success,
          families: familiesData.families,
        },
      })

      if (usersData.success) setUsers(usersData.users)
      if (familiesData.success) setFamilies(familiesData.families)
      if (codesData.success) setCodes(codesData.invites || [])
      if (invitesData.success) setInvites(invitesData.invites)
    } catch (e) {
      console.error('Failed to fetch admin data', e)
    } finally {
      setLoading(false)
    }
  }

  const handleImpersonate = async (user: AdminUser) => {
    if (!window.confirm(`Login as ${user.displayName}? You will see the app exactly as they do.`))
      return

    try {
      const res = await fetch('/protected/recipes/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.success) {
        // Hard reload to refresh server-side cookies/session and return to app
        window.location.href = '/protected/recipes'
      } else {
        alert(data.error || 'Failed to impersonate')
      }
    } catch (e) {
      console.error(e)
      alert('Error starting impersonation')
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user ${user.displayName}? This cannot be undone.`,
      )
    )
      return

    try {
      const res = await fetch('/protected/recipes/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      if (res.ok) {
        setUsers(users.filter((u) => u.id !== user.id))
      } else {
        alert('Failed to delete user')
      }
    } catch (e) {
      console.error(e)
      alert('Error deleting user')
    }
  }

  const handleToggleUserStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'approved' ? 'rejected' : 'approved'
    // 'rejected' acts as 'disabled' here effectively
    try {
      const res = await fetch('/protected/recipes/api/admin/users', {
        method: 'PUT', // or PATCH as supported
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus }),
      })
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)))
      } else {
        alert('Failed to update status')
      }
    } catch (e) {
      console.error(e)
      alert('Error updating status')
    }
  }

  const handleDeleteCode = async (code: InviteCode) => {
    if (!window.confirm(`Delete access code ${code.code}?`)) return
    try {
      const res = await fetch('/protected/recipes/api/admin/access-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.code }),
      })
      if (res.ok) {
        setCodes(codes.filter((c) => c.code !== code.code))
      } else {
        alert('Failed to delete code')
      }
    } catch (e) {
      console.error(e)
      alert('Error deleting code')
    }
  }

  const handleToggleCodeStatus = async (code: InviteCode) => {
    // Wait, Access Codes status is 'pending' or 'accepted' (meaning used).
    // Maybe we want a 'disabled' status?
    // Current types say string, API supports string.
    // Let's toggle between 'disabled' and whatever it was, or just 'disabled' / 'pending'.
    // If it's already used ('accepted'), maybe we shouldn't touch it?
    // Let's assume user wants to disable a pending code.

    const targetStatus = code.status === 'disabled' ? 'pending' : 'disabled'

    try {
      const res = await fetch('/protected/recipes/api/admin/access-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.code, status: targetStatus }),
      })
      if (res.ok) {
        setCodes((prev) =>
          prev.map((c) => (c.code === code.code ? { ...c, status: targetStatus } : c)),
        )
      } else {
        alert('Failed to update code status')
      }
    } catch (e) {
      console.error(e)
      alert('Error updating code')
    }
  }

  const handleDeleteInvite = async (invite: FamilyInvite) => {
    if (!window.confirm(`Revoke invite for ${invite.email}?`)) return
    try {
      const res = await fetch('/protected/recipes/api/admin/invites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId: invite.id }),
      })
      if (res.ok) {
        setInvites(invites.filter((i) => i.id !== invite.id))
      } else {
        alert('Failed to delete invite')
      }
    } catch (e) {
      console.error(e)
      alert('Error deleting invite')
    }
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleDateString()
  }

  if (loading) return <div className="p-8 text-center">Loading Admin Data...</div>

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <Inline justify="between" align="center">
          <Inline spacing="sm">
            <ShieldAlert className="h-6 w-6 text-orange-600" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </Inline>
          {onClose && (
            <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </Inline>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-card px-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`mr-4 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('families')}
          className={`mr-4 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'families'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Families ({families.length})
        </button>
        <button
          onClick={() => setActiveTab('codes')}
          className={`mr-4 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'codes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Access Codes ({codes.length})
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'invites'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Family Invites ({invites.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'users' && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          user.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(user.joinedAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div>Added: {user.stats?.recipesAdded || 0}</div>
                      <div>Cooked: {user.stats?.recipesCooked || 0}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleImpersonate(user)}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="Login as User"
                        >
                          <LogIn className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className={`rounded p-1 ${
                            user.status === 'approved'
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.status === 'approved' ? 'Disable User' : 'Enable User'}
                        >
                          {user.status === 'approved' ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'families' && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Family
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Member Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ID
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {families.map((family) => (
                  <tr key={family.id} className="cursor-pointer hover:bg-gray-50">
                    <td
                      className="whitespace-nowrap px-6 py-4"
                      onClick={() => {
                        setSelectedFamilyId(family.id)
                      }}
                    >
                      <div className="text-sm font-medium text-gray-900">{family.name}</div>
                    </td>
                    <td
                      className="whitespace-nowrap px-6 py-4 text-sm text-gray-500"
                      onClick={() => setSelectedFamilyId(family.id)}
                    >
                      {family.memberCount}
                    </td>
                    <td
                      className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-400"
                      onClick={() => setSelectedFamilyId(family.id)}
                    >
                      {family.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          className="mr-2 text-blue-600 hover:text-blue-900"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFamilyId(family.id)
                          }}
                        >
                          View
                        </button>
                        <button
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (
                              window.confirm(
                                `Are you sure you want to PERMANENTLY delete "${family.name}"? This will remove all data and members.`,
                              )
                            ) {
                              try {
                                const res = await fetch('/protected/recipes/api/admin/families', {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ familyId: family.id }),
                                })
                                if (res.ok) {
                                  setFamilies((prev) => prev.filter((f) => f.id !== family.id))
                                } else {
                                  const data = await res.json()
                                  alert(data.error || 'Failed to delete family')
                                }
                              } catch (err) {
                                console.error(err)
                                alert('Error deleting family')
                              }
                            }
                          }}
                          title="Delete Family"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'codes' && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Accepted By
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {codes.map((code) => (
                  <tr key={code.code}>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-900">
                      {code.code}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          code.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {code.status || 'pending'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div>{code.createdByName}</div>
                      <div className="text-xs">{formatDate(code.createdAt)}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {code.acceptedBy ? (
                        <>
                          <div>{code.acceptedByName || 'User'}</div>
                          <div className="text-xs">{formatDate(code.acceptedAt)}</div>
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleCodeStatus(code)}
                          className={`rounded p-1 ${
                            code.status === 'disabled'
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-orange-600 hover:bg-orange-50'
                          }`}
                          title={code.status === 'disabled' ? 'Enable Code' : 'Disable Code'}
                        >
                          {code.status === 'disabled' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="Delete Code"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invited Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Accepted At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {invite.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          invite.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {invite.status || 'pending'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div>{invite.invitedByName}</div>
                      <div className="text-xs">{formatDate(invite.createdAt)}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {invite.acceptedAt ? formatDate(invite.acceptedAt) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDeleteInvite(invite)}
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                          title="Revoke Invite"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedFamilyId && (
        <div className="fixed inset-0 z-[100] bg-white">
          <AdminFamilyManager
            familyId={selectedFamilyId}
            onBack={() => setSelectedFamilyId(null)}
          />
        </div>
      )}
    </div>
  )
}
