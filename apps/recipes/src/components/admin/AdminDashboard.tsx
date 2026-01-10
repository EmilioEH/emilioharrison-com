import React, { useState, useEffect } from 'react'
import { ShieldAlert, LogOut } from 'lucide-react'
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

interface AdminDashboardProps {
  onClose?: () => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'codes' | 'invites'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [invites, setInvites] = useState<FamilyInvite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [usersRes, codesRes, invitesRes] = await Promise.all([
        fetch('/protected/recipes/api/admin/users'),
        fetch('/protected/recipes/api/admin/access-codes'),
        fetch('/protected/recipes/api/admin/invites'),
      ])

      const usersData = await usersRes.json()
      const codesData = await codesRes.json()
      const invitesData = await invitesRes.json()

      if (usersData.success) setUsers(usersData.users)
      if (codesData.success) setCodes(codesData.invites || [])
      if (invitesData.success) setInvites(invitesData.invites)
    } catch (e) {
      console.error('Failed to fetch admin data', e)
    } finally {
      setLoading(false)
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
