import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, Key, Plus, Trash2, Copy, User, Share } from 'lucide-react'
import { Stack } from '@/components/ui/layout'
import { alert, confirm } from '../../lib/dialogStore'
import { auth } from '../../lib/firebase-client'
import { shareInvite } from '../../lib/share-invite'

interface PendingUser {
  id: string
  email: string
  displayName: string
  status: 'pending' | 'approved' | 'rejected'
  joinedAt: string
}

interface InviteCode {
  id: string // the code itself
  code: string
  createdBy: string
  createdAt: string
}

export const AccessRequestsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'requests' | 'codes'>('requests')
  const [requests, setRequests] = useState<PendingUser[]>([])
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/protected/recipes/api/admin/users?status=pending', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setRequests(data.users || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const fetchCodes = async () => {
    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/protected/recipes/api/admin/access-codes', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        // Documents returned might be object { code: { ... } } or array?
        // Wrapper usually returns array if getCollection.
        setCodes(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.values(data.invites || {}).map((c: any) => ({
            id: c.code,
            code: c.code,
            createdBy: c.createdBy,
            createdAt: c.createdAt,
          })),
        )
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'requests') fetchRequests()
    else fetchCodes()
  }, [activeTab])

  const handleUpdateStatus = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/protected/recipes/api/admin/users', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, status }),
      })
      if (res.ok) {
        setRequests((prev) => prev.filter((u) => u.id !== userId))
        alert(`User ${status} successfully`)
      }
    } catch {
      await alert('Failed to update status')
    }
  }

  const handleGenerateCode = async () => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/protected/recipes/api/admin/access-codes', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        fetchCodes() // Refresh
      }
    } catch {
      await alert('Failed to generate code')
    }
  }

  const handleDeleteCode = async (code: string) => {
    if (!(await confirm('Delete this invite code?'))) return
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch('/protected/recipes/api/admin/access-codes', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
      if (res.ok) {
        setCodes((prev) => prev.filter((c) => c.code !== code))
      }
    } catch {
      await alert('Failed to delete code')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Code copied to clipboard!')
  }

  const handleShareCode = async (code: string) => {
    await shareInvite({
      type: 'activation-code',
      code,
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border bg-card px-4">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-4 w-4" />
          Access Requests
          {requests.length > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('codes')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'codes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="h-4 w-4" />
          Invite Codes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-background p-4">
        {loading && (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        )}

        {activeTab === 'requests' && !loading && (
          <Stack spacing="md">
            {requests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card py-12 text-center text-muted-foreground">
                <CheckCircle className="mx-auto mb-2 h-12 w-12 opacity-20" />
                <p>No pending access requests.</p>
              </div>
            ) : (
              requests.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      {user.displayName[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-foreground">{user.displayName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Requested {new Date(user.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(user.id, 'approved')}
                      className="rounded-full p-2 text-green-600 hover:bg-green-50"
                      title="Approve"
                    >
                      <CheckCircle className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(user.id, 'rejected')}
                      className="rounded-full p-2 text-red-600 hover:bg-red-50"
                      title="Deny"
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </Stack>
        )}

        {activeTab === 'codes' && !loading && (
          <Stack spacing="lg">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm">
              <div>
                <h3 className="font-bold">Generate New Code</h3>
                <p className="text-xs text-muted-foreground">
                  Create a one-time use code to share.
                </p>
              </div>
              <button
                onClick={handleGenerateCode}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Generate
              </button>
            </div>

            <Stack spacing="sm">
              {codes.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No active invite codes.</p>
                </div>
              ) : (
                codes.map((code) => (
                  <div
                    key={code.code}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div>
                      <div className="font-mono text-xl font-bold tracking-widest text-primary">
                        {code.code}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created by {code.createdBy}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleShareCode(code.code)}
                        className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Share Code"
                      >
                        <Share className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Copy Code"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCode(code.code)}
                        className="rounded-full p-2 text-destructive hover:bg-destructive/10"
                        title="Revoke Code"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </Stack>
          </Stack>
        )}
      </div>
    </div>
  )
}
