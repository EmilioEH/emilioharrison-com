import React, { useEffect, useState, useCallback } from 'react'
import { Users, Search, MoreHorizontal, ShieldAlert, LogOut } from 'lucide-react'
import { Stack, Inline } from '@/components/ui/layout'
import { alert } from '../../lib/dialogStore'
import { Badge } from '@/components/ui/badge'
import type { Family } from '../../lib/types'
import { AdminFamilyManager } from './AdminFamilyManager'
import { AccessRequestsDashboard } from './AccessRequestsDashboard'

interface AdminDashboardProps {
  onClose: () => void
}

interface FamilySummary extends Family {
  memberCount: number
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [families, setFamilies] = useState<FamilySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)

  // Dashboard Tabs
  const [view, setView] = useState<'families' | 'access'>('families')

  const fetchFamilies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/families')
      if (res.status === 403) {
        throw new Error('Unauthorized: Admin access required')
      }
      const data = await res.json()
      if (data.success) {
        setFamilies(data.families)
      } else {
        throw new Error(data.error)
      }
    } catch (e) {
      console.error(e)
      await alert((e as Error).message)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }, [onClose])

  useEffect(() => {
    if (view === 'families') {
      fetchFamilies()
    }
  }, [fetchFamilies, view])

  const filteredFamilies = families.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toLowerCase().includes(search.toLowerCase()),
  )

  if (selectedFamilyId) {
    return (
      <AdminFamilyManager
        familyId={selectedFamilyId}
        onBack={() => {
          setSelectedFamilyId(null)
          fetchFamilies() // Refresh list on return
        }}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <Inline justify="between" align="center">
          <Inline spacing="sm">
            <ShieldAlert className="h-6 w-6 text-orange-600" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </Inline>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted">
            <LogOut className="h-5 w-5" />
          </button>
        </Inline>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border bg-card px-4">
        <button
          onClick={() => setView('families')}
          className={`mr-4 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            view === 'families'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Manage Families
        </button>
        <button
          onClick={() => setView('access')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            view === 'access'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Access & Invites
        </button>
      </div>

      {view === 'access' ? (
        <AccessRequestsDashboard />
      ) : (
        <>
          {/* Toolbar */}
          <div className="bg-card p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search families by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <Stack spacing="sm">
                <div className="flex justify-between px-2 text-xs font-bold uppercase text-muted-foreground">
                  <span>Family</span>
                  <span>Members</span>
                </div>
                {filteredFamilies.map((family) => (
                  <div
                    key={family.id}
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={() => setSelectedFamilyId(family.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedFamilyId(family.id)
                      }
                    }}
                  >
                    <Stack spacing="xs">
                      <span className="font-bold">{family.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{family.id}</span>
                    </Stack>
                    <Inline spacing="md" align="center">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Users size={12} />
                        {family.memberCount}
                      </Badge>
                      <MoreHorizontal size={16} className="text-muted-foreground" />
                    </Inline>
                  </div>
                ))}
              </Stack>
            )}
          </div>
        </>
      )}
    </div>
  )
}
