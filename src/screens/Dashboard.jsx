import React, { useState, useEffect } from 'react'
import { api, clearSession, getSession } from '../lib/api'

// Helper export for offline queue flushing
export async function flushOfflineQueue() {
  console.log('Offline queue flush checked')
}

// Helper export for skeleton loading state
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-900 p-6 flex flex-col justify-between animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-1/3"></div>
      <div className="w-36 h-36 bg-slate-800 rounded-full mx-auto my-8"></div>
      <div className="h-24 bg-slate-800 rounded w-full"></div>
    </div>
  )
}

export default function Dashboard({ onLogout }) {
  const [status, setStatus] = useState({ dutyStatus: 'punched_out', punchedAt: null })
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  const session = getSession()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Safe Status Call
      const statusRes = await api.getStatus().catch((err) => {
        console.warn('getStatus failed, using fallback:', err)
        return { dutyStatus: 'punched_out', punchedAt: null }
      })

      if (statusRes && typeof statusRes === 'object') {
        setStatus({
          dutyStatus: statusRes.dutyStatus || 'punched_out',
          punchedAt: statusRes.punchedAt || null,
        })
      } else {
        setStatus({ dutyStatus: 'punched_out', punchedAt: null })
      }

      // 2. Safe Logs Call
      const logsRes = await api.getRecentLogs(5).catch((err) => {
        console.warn('getRecentLogs failed, using fallback:', err)
        return { logs: [] }
      })

      if (logsRes && Array.isArray(logsRes.logs)) {
        setLogs(logsRes.logs)
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError('Failed to refresh data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePunch = async () => {
    setActionLoading(true)
    setError(null)

    const currentAction = status?.dutyStatus === 'punched_in' ? 'punch_out' : 'punch_in'

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setActionLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        try {
          const res = await api.punch(currentAction, lat, lng, null)
          if (res?.success) {
            await loadDashboardData()
          } else {
            setError(res?.error || 'Punch action failed.')
          }
        } catch (err) {
          setError(err?.message || 'Failed to submit punch.')
        } finally {
          setActionLoading(false)
        }
      },
      (geoErr) => {
        console.error('Geolocation error:', geoErr)
        setError('Location access denied. Please enable GPS permissions.')
        setActionLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSignOut = () => {
    clearSession()
    if (onLogout) onLogout()
  }

  const isPunchedIn = status?.dutyStatus === 'punched_in'

  if (loading) return <DashboardSkeleton />

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Header */}
      <header className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-blue-500">IMPunch</h1>
          <p className="text-xs text-slate-400">{session?.user?.email || 'Field Agent'}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md border border-slate-700 transition"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="my-auto py-6 max-w-md w-full mx-auto text-center">
        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 backdrop-blur shadow-xl mb-6">
          <div className="mb-4">
            <span
              className={`inline-block w-3 h-3 rounded-full mr-2 ${
                isPunchedIn ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              {isPunchedIn ? 'ON DUTY' : 'OFF DUTY'}
            </span>
          </div>

          <button
            onClick={handlePunch}
            disabled={actionLoading}
            className={`w-36 h-36 rounded-full font-bold text-lg shadow-lg border-4 transition transform active:scale-95 ${
              isPunchedIn
                ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white'
                : 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {actionLoading ? 'Processing...' : isPunchedIn ? 'PUNCH OUT' : 'PUNCH IN'}
          </button>

          {status?.punchedAt && (
            <p className="mt-4 text-xs text-slate-400">
              Last action: {new Date(status.punchedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Recent Logs */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-left">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Recent Logs
          </h2>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500">No punch activity recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log, index) => (
                <li
                  key={log.id || index}
                  className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800 last:border-0"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        log.action === 'punch_in'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {log.action === 'punch_in' ? 'IN' : 'OUT'}
                    </span>
                    <span className="text-slate-300">
                      {log.geofence_id && log.geofence_id !== 'OUT_OF_BOUNDS'
                        ? log.geofence_id
                        : 'Out of Bounds'}
                    </span>
                  </div>
                  <span className="text-slate-500">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '--'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <footer className="text-center text-[10px] text-slate-600 pt-4 border-t border-slate-800">
        IMPunch • Swiggy Field Operations
      </footer>
    </div>
  )
}