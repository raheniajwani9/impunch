import React, { useState, useEffect } from 'react'
import { api, clearSession, getSession } from '../lib/api'
import PunchGauge from '../components/PunchGauge'

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-800 flex flex-col justify-between p-4 sm:p-6 animate-pulse transition-colors">
      <header className="flex justify-between items-center pb-4 border-b border-[#0050FF]/20">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-[#0050FF]/10 dark:bg-[#0050FF]/20 rounded-md"></div>
          <div className="h-3 w-40 bg-slate-200 dark:bg-[#28313D] rounded-md"></div>
        </div>
        <div className="h-8 w-20 bg-slate-200 dark:bg-[#28313D] rounded-lg"></div>
      </header>

      <div className="my-auto py-8 max-w-md w-full mx-auto space-y-6">
        <div className="bg-[#FFFFFF] dark:bg-[#181E25] border border-[#0050FF]/10 dark:border-[#28313D] rounded-3xl p-8 flex flex-col items-center space-y-6 shadow-sm">
          <div className="h-4 w-28 bg-slate-200 dark:bg-[#28313D] rounded-full"></div>
          <div className="w-48 h-48 bg-slate-200 dark:bg-[#28313D] rounded-full"></div>
          <div className="h-3 w-36 bg-slate-200 dark:bg-[#28313D] rounded-md"></div>
        </div>
      </div>

      <footer className="h-3 w-40 bg-slate-300/40 rounded mx-auto"></footer>
    </div>
  )
}

export default function Dashboard({ onLogout }) {
  const [status, setStatus] = useState({ dutyStatus: 'punched_out', punchedAt: null })
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
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError('Failed to refresh status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePunch = async () => {
    setActionLoading(true)
    setError(null)

    const currentAction = status?.dutyStatus === 'punched_in' ? 'punch_out' : 'punch_in'

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your device.')
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
        setError('Location permission required. Please enable GPS.')
        setActionLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  const handleSignOut = () => {
    clearSession()
    if (onLogout) onLogout()
  }

  const isPunchedIn = status?.dutyStatus === 'punched_in'

  if (loading) return <DashboardSkeleton />

  return (
    <div className="min-h-screen bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans transition-colors pb-24">
      {/* Header */}
      <header className="flex justify-between items-center pb-4 border-b border-[#0050FF]/15 dark:border-[#28313D]">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0050FF] flex items-center justify-center font-black text-white text-base shadow-md shadow-[#0050FF]/25">
            IM
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wide text-[#0050FF] leading-tight">
              INSTAMART <span className="text-[#FF5200]">PUNCH</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {session?.user?.email || 'Field Agent'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="text-xs bg-[#FFFFFF] dark:bg-[#181E25] hover:bg-slate-50 dark:hover:bg-[#28313D] text-slate-700 dark:text-slate-200 font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-[#28313D] transition active:scale-95 shadow-sm"
        >
          Sign Out
        </button>
      </header>

      {/* Main Content */}
      <main className="my-auto py-6 max-w-md w-full mx-auto text-center space-y-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center space-x-2 justify-center shadow-sm">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Action Card */}
        <div className="bg-[#FFFFFF] dark:bg-[#181E25] border border-[#0050FF]/10 dark:border-[#28313D] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col items-center">
          {/* Status Badge */}
          <div className="mb-4 flex items-center justify-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPunchedIn ? 'bg-emerald-500 animate-ping' : 'bg-[#FF5200]'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
              {isPunchedIn ? 'ON DUTY • ACTIVE' : 'OFF DUTY'}
            </span>
          </div>

          {/* Punch Gauge Component */}
          <PunchGauge
            state={actionLoading ? 'locating' : isPunchedIn ? 'on' : 'off'}
            onPress={handlePunch}
            label={isPunchedIn ? 'Punch Out' : 'Punch In'}
          />

          {status?.punchedAt && (
            <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Last status update:{' '}
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {new Date(status.punchedAt).toLocaleTimeString()}
              </span>
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[10px] text-slate-500 dark:text-slate-400 pt-4 border-t border-[#0050FF]/15 dark:border-[#28313D] font-semibold tracking-wider">
        SWIGGY INSTAMART • FIELD OPERATIONS
      </footer>
    </div>
  )
}