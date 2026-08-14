import React, { useEffect, useState, useMemo } from 'react'
import { GlassCard, SkeletonBox } from '../components/ui'
import { api, clearSession, getSession } from '../lib/api'
import Header from '../components/Header'

export default function History({ onLogout }) {
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Pagination States
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  // Retrieve user session info
  const session = getSession()
  const userEmail = session?.user?.email || session?.email

  const handleSignOut = () => {
    clearSession()
    if (onLogout) onLogout()
  }

  useEffect(() => {
    fetchHistory(page)
  }, [page])

  async function fetchHistory(targetPage = page) {
    setLoading(true)
    setError('')
    try {
      const res = await api.getRecentLogs(targetPage, pageSize)

      let logArray = []
      
      if (res && Array.isArray(res.logs)) {
        logArray = res.logs
        setTotalPages(res.totalPages || 1)
        setTotalRecords(res.totalRecords || 0)
      } else if (Array.isArray(res)) {
        logArray = res
        setTotalPages(1)
        setTotalRecords(res.length)
      } else if (res && typeof res === 'object') {
        const possibleArray = Object.values(res).find((v) => Array.isArray(v))
        if (possibleArray) logArray = possibleArray
      }

      setLogs(logArray)
    } catch (err) {
      console.error('History fetch error:', err)
      setError(err.message || 'Could not load shift history.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Group logs by Date string ("YYYY-MM-DD")
  const groupedLogs = useMemo(() => {
    if (!logs || !Array.isArray(logs) || logs.length === 0) return {}

    const groups = {}

    const sorted = [...logs].sort((a, b) => {
      const dA = new Date(a.created_at || a.timestamp || 0)
      const dB = new Date(b.created_at || b.timestamp || 0)
      return dB - dA
    })

    sorted.forEach((log) => {
      const rawDate = log.created_at || log.timestamp || log.created || log.date
      let dateObj = rawDate ? new Date(rawDate) : new Date()

      if (isNaN(dateObj.getTime()) && typeof rawDate === 'string') {
        dateObj = new Date(rawDate.replace(' ', 'T'))
      }

      const dateKey = isNaN(dateObj.getTime())
        ? 'Unknown Date'
        : dateObj.toISOString().split('T')[0]

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateObj,
          items: [],
        }
      }
      groups[dateKey].items.push({ ...log, dateObj })
    })

    return groups
  }, [logs])

  // Helper to format Date Header
  function formatDateHeader(dateStr, dateObj) {
    if (dateStr === 'Unknown Date' || !dateObj || isNaN(dateObj.getTime())) return 'Previous Records'

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (dateStr === today) return 'Today'
    if (dateStr === yesterday) return 'Yesterday'

    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 transition-colors font-sans pb-28">
      {/* 1. Shared Reusable Header */}
      <Header userEmail={userEmail} onLogout={handleSignOut} />

      {/* 2. Main Page Content */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* Section Title & Refresh */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black tracking-wide text-[#0050FF]">
              SHIFT <span className="text-[#FF5200]">HISTORY</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Complete Field Attendance Trail {totalRecords > 0 && `(${totalRecords} total)`}
            </p>
          </div>
          <button
            onClick={() => fetchHistory(page)}
            disabled={loading}
            className="text-xs font-bold text-[#0050FF] bg-[#0050FF]/10 hover:bg-[#0050FF]/20 px-3.5 py-2 rounded-xl border border-[#0050FF]/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="w-2.5 h-2.5 border-2 border-[#0050FF] border-t-transparent rounded-full animate-spin" />
                Refreshing…
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-4">
            <SkeletonBox className="h-6 w-28 rounded-md" />
            <GlassCard className="p-4 space-y-3">
              <SkeletonBox className="h-5 w-full" />
              <SkeletonBox className="h-5 w-full" />
              <SkeletonBox className="h-5 w-3/4" />
            </GlassCard>
          </div>
        )}

        {/* Empty State */}
        {!loading && logs !== null && Object.keys(groupedLogs).length === 0 && (
          <GlassCard className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#0050FF]/10 text-[#0050FF] flex items-center justify-center mx-auto text-xl font-black">
              📋
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No History Recorded
            </p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your past punch-in and punch-out events will automatically show up here.
            </p>
          </GlassCard>
        )}

        {/* Formatted Grouped Logs */}
        {!loading &&
          Object.keys(groupedLogs).map((dateKey) => {
            const group = groupedLogs[dateKey]
            const headerLabel = formatDateHeader(dateKey, group.dateObj)

            return (
              <div key={dateKey} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
                    {headerLabel}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <GlassCard className="divide-y divide-slate-100 dark:divide-[#28313D] !p-0 overflow-hidden shadow-lg border border-slate-200/60 dark:border-[#28313D]">
                  {group.items.map((log, idx) => {
                    const actionType = String(log.action || log.type || '').toLowerCase()
                    const isPunchIn = actionType.includes('in')

                    const formattedTime =
                      log.dateObj && !isNaN(log.dateObj.getTime())
                        ? log.dateObj.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'

                    const locationLabel =
                      log.geofence_id && String(log.geofence_id).trim() !== ''
                        ? log.geofence_id
                        : 'Store #' + (log.pod_id || '1405040')

                    const isViolation =
                      log.is_violation === true ||
                      String(log.is_violation).toUpperCase() === 'TRUE'

                    return (
                      <div
                        key={log.id || idx}
                        className="p-4 flex items-center justify-between text-xs hover:bg-slate-500/5 transition"
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs tracking-tight shrink-0 ${
                              isPunchIn
                                ? 'bg-[#0050FF]/10 text-[#0050FF] border border-[#0050FF]/20'
                                : 'bg-[#FF5200]/10 text-[#FF5200] border border-[#FF5200]/20'
                            }`}
                          >
                            {isPunchIn ? 'IN' : 'OUT'}
                          </span>

                          <div>
                            <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                              {locationLabel}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">
                              {isPunchIn ? 'Shift Started' : 'Shift Ended'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                            {formattedTime}
                          </p>
                          {isViolation ? (
                            <span className="inline-block text-[10px] bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-2 py-0.5 rounded mt-0.5 border border-red-500/20">
                              Out of Zone
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                              In zone
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </GlassCard>
              </div>
            )
          })}

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#28313D]">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 text-xs font-bold bg-white dark:bg-[#1A202C] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
            >
              ← Previous
            </button>

            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of {totalPages}
            </span>

            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="px-4 py-2 text-xs font-bold bg-white dark:bg-[#1A202C] border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}