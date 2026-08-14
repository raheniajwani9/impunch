import React, { useEffect, useState } from 'react'
import { GlassCard, SkeletonBox } from '../components/ui'
import { api } from '../lib/api'

export default function History() {
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    setError('')
    try {
      const res = await api.getRecentLogs(50)
      console.log('API History response:', res) // Debug log

      // Standardize response regardless of object wrapping
      let logArray = []
      if (Array.isArray(res)) {
        logArray = res
      } else if (res && Array.isArray(res.logs)) {
        logArray = res.logs
      } else if (res && typeof res === 'object') {
        // Fallback: extract array values if key names vary
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

  return (
    <div className="min-h-screen px-4 sm:px-6 pt-6 pb-28 bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <header className="flex justify-between items-center pb-3 border-b border-[#0050FF]/15 dark:border-[#28313D]">
          <div>
            <h1 className="text-lg font-black tracking-wide text-[#0050FF]">
              SHIFT <span className="text-[#FF5200]">HISTORY</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Complete Field Attendance Trail
            </p>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="text-xs font-bold text-[#0050FF] bg-[#0050FF]/10 hover:bg-[#0050FF]/20 px-3 py-1.5 rounded-xl border border-[#0050FF]/20 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* History List */}
        <GlassCard className="divide-y divide-slate-100 dark:divide-[#28313D] !p-0 overflow-hidden shadow-xl">
          {loading && logs === null && (
            <div className="p-4 space-y-3">
              <SkeletonBox className="h-5 w-full" />
              <SkeletonBox className="h-5 w-full" />
              <SkeletonBox className="h-5 w-3/4" />
            </div>
          )}

          {!loading && logs !== null && logs.length === 0 && (
            <div className="p-8 text-center space-y-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No History Recorded</p>
              <p className="text-xs text-slate-400">Your past punches will appear here once recorded.</p>
            </div>
          )}

          {logs !== null &&
            logs.map((log, idx) => {
              // 1. Safe Date & Time parsing
              const rawDate = log.created_at || log.timestamp || log.date || log.created
              let dateObj = rawDate ? new Date(rawDate) : null

              // Fix for non-standard Google Sheet date strings (e.g. "8/12/2026 10:38:32")
              if (dateObj && isNaN(dateObj.getTime()) && typeof rawDate === 'string') {
                dateObj = new Date(rawDate.replace(' ', 'T'))
              }

              const hasValidDate = dateObj && !isNaN(dateObj.getTime())
              const formattedDate = hasValidDate
                ? dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recent'
              const formattedTime = hasValidDate
                ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'

              // 2. Action Normalization
              const actionType = String(log.action || log.type || '').toLowerCase()
              const isPunchIn = actionType.includes('in')

              // 3. Fallback for blank geofence_id cells
              const locationLabel = log.geofence_id && String(log.geofence_id).trim() !== ''
                ? log.geofence_id
                : 'Main Warehouse'

              // 4. Violation flag check (handles boolean or string 'TRUE')
              const isViolation = log.is_violation === true || String(log.is_violation).toUpperCase() === 'TRUE'

              return (
                <div
                  key={log.id || idx}
                  className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-[#1C232B] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider ${
                        isPunchIn
                          ? 'bg-[#0050FF]/10 text-[#0050FF] border border-[#0050FF]/20'
                          : 'bg-[#FF5200]/10 text-[#FF5200] border border-[#FF5200]/20'
                      }`}
                    >
                      {isPunchIn ? 'IN' : 'OUT'}
                    </span>
                    <div>
                      <p className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[160px]">
                        {locationLabel}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">{formattedDate}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{formattedTime}</p>
                    {isViolation && (
                      <span className="inline-block text-[9px] bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.2 rounded mt-0.5">
                        Out of Zone
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
        </GlassCard>
      </div>
    </div>
  )
}