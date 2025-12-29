import React, { useState, useEffect } from 'react'
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Bug,
  Lightbulb,
} from 'lucide-react'

// Simple time ago helper to avoid extra deps
function timeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)

  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  return Math.floor(seconds) + ' seconds ago'
}

export default function FeedbackDashboard() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('open') // 'open' | 'fixed' | 'all'
  const [expandedId, setExpandedId] = useState(null)

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      const baseUrl = import.meta.env.BASE_URL || ''
      const res = await fetch(`${baseUrl}/api/feedback`)
      if (!res.ok) throw new Error('Failed to fetch feedback')
      const data = await res.json()
      // Sort by timestamp desc
      const sorted = data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      setFeedback(sorted)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedback()
  }, [])

  const updateStatus = async (id, newStatus, e) => {
    e.stopPropagation()
    try {
      const baseUrl = import.meta.env.BASE_URL || ''
      const res = await fetch(`${baseUrl}/api/feedback`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      // Optimistic update
      setFeedback((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: newStatus,
                resolved_at: newStatus !== 'open' ? new Date().toISOString() : null,
              }
            : item,
        ),
      )
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Failed to update status')
    }
  }

  const filteredFeedback = feedback.filter((item) => {
    const status = item.status || 'open'
    if (activeTab === 'open') return status === 'open'
    if (activeTab === 'fixed') return status === 'fixed' || status === 'wont-fix'
    return true
  })

  const openCount = feedback.filter((i) => (i.status || 'open') === 'open').length
  const fixedCount = feedback.filter((i) => ['fixed', 'wont-fix'].includes(i.status)).length

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feedback Dashboard</h1>
            <p className="text-sm text-gray-500">Track and manage user reports</p>
          </div>
          <button
            onClick={fetchFeedback}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('open')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'open'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertCircle size={16} />
            Open
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {openCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('fixed')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'fixed'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckCircle size={16} />
            Resolved
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              {fixedCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Reports
          </button>
        </div>

        {/* List */}
        {loading && <div className="py-12 text-center text-gray-500">Loading feedback...</div>}

        {!loading && !error && filteredFeedback.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <p className="text-gray-500">No reports found in this view.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            <p className="font-medium">Error loading feedback</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {filteredFeedback.map((item) => {
            const isExpanded = expandedId === item.id
            const isBug = item.type === 'bug'
            const status = item.status || 'open'

            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${
                  isExpanded ? 'ring-2 ring-blue-500/20' : 'hover:border-gray-300'
                }`}
              >
                <div
                  className="flex cursor-pointer items-start gap-4 p-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setExpandedId(isExpanded ? null : item.id)
                    }
                  }}
                >
                  <div
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg ${
                      isBug ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    {isBug ? <Bug size={18} /> : <Lightbulb size={18} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="line-clamp-1 text-base font-medium text-gray-900">
                        {item.description}
                      </h3>
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                      <span className="font-mono text-xs uppercase tracking-wider text-gray-400">
                        {item.id.slice(0, 8)}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{item.type}</span>
                      {status !== 'open' && (
                        <>
                          <span>•</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              status === 'fixed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {status === 'fixed' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {status === 'fixed' ? 'Fixed' : "Won't Fix"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {status === 'open' && (
                      <button
                        onClick={(e) => updateStatus(item.id, 'fixed', e)}
                        className="hidden rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-100 sm:block"
                      >
                        Mark Fixed
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Description
                          </h4>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                            {item.description}
                          </p>
                        </div>

                        {item.expected && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Expected
                            </h4>
                            <p className="mt-1 text-sm text-gray-800">{item.expected}</p>
                          </div>
                        )}

                        {item.actual && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Actual
                            </h4>
                            <p className="mt-1 text-sm text-gray-800">{item.actual}</p>
                          </div>
                        )}

                        {status === 'open' && (
                          <div className="flex gap-2 pt-2 sm:hidden">
                            <button
                              onClick={(e) => updateStatus(item.id, 'fixed', e)}
                              className="flex-1 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 shadow-sm"
                            >
                              Mark Fixed
                            </button>
                            <button
                              onClick={(e) => updateStatus(item.id, 'wont-fix', e)}
                              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 shadow-sm"
                            >
                              Ignore
                            </button>
                          </div>
                        )}
                        {status === 'open' && (
                          <div className="hidden pt-2 sm:block">
                            <button
                              onClick={(e) => updateStatus(item.id, 'wont-fix', e)}
                              className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
                            >
                              Mark as "Won't Fix"
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {item.screenshot && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Screenshot
                            </h4>
                            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                              <img
                                src={item.screenshot}
                                alt="Bug Screenshot"
                                className="h-auto w-full object-contain"
                              />
                            </div>
                          </div>
                        )}

                        {item.context && (
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                              Metadata
                            </h4>
                            <div className="mt-1 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
                              <div className="grid grid-cols-[80px_1fr] gap-1">
                                <span className="text-gray-400">User:</span>
                                <span className="truncate">{item.context.user}</span>
                                <span className="text-gray-400">URL:</span>
                                <span className="truncate">{item.context.url}</span>
                                <span className="text-gray-400">Browser:</span>
                                <span className="truncate">{item.context.userAgent}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
