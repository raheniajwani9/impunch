import React, { useEffect, useMemo, useState } from 'react'
import { api, clearSession, getSession } from '../lib/api'
import PunchGauge from '../components/PunchGauge'
import Header from '../components/Header'

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

const EMPTY_BREAKDOWN = [0, 0, 0, 0, 0, 0, 0]
const MAX_BREAKS_PER_SHIFT = 3

function formatDuration(totalMinutes = 0) {
  const minutes = Math.max(0, Math.floor(Number(totalMinutes) || 0))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h ${String(remainder).padStart(2, '0')}m`
}

function getWeekLabels() {
  const today = new Date()
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      short: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    }
  })
}

function getTodayIndex() {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

function MetricCard({ label, value, detail, accent = 'blue' }) {
  const accentClasses = accent === 'orange'
    ? 'text-[#FF5200] bg-[#FF5200]/10 border-[#FF5200]/20'
    : accent === 'amber'
    ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    : 'text-[#0050FF] bg-[#0050FF]/10 border-[#0050FF]/20'

  return (
    <div className="bg-white dark:bg-[#181E25] border border-slate-200 dark:border-[#28313D] rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${accentClasses}`} aria-hidden="true">
          {accent === 'orange' ? '↗' : accent === 'amber' ? '☕' : '◷'}
        </span>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  )
}

export default function Dashboard({ onLogout, onNavigate }) {
  const [status, setStatus] = useState({
    dutyStatus: 'punched_out', 
    punchedAt: null,
    breakStartedAt: null,
    breaksTaken: 0,
    breaksRemaining: MAX_BREAKS_PER_SHIFT,
    maxBreaksReached: false,
    todayMinutes: 0,
    todayBreakMinutes: 0,
    weekMinutes: 0,
    todayPunchCount: 0,
    weeklyBreakdown: EMPTY_BREAKDOWN,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [now, setNow] = useState(Date.now())

  const session = getSession()
  const userEmail = session?.user?.email || session?.email

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const statusRes = await api.getStatus()

      if (statusRes && typeof statusRes === 'object') {
        setStatus({
          dutyStatus: statusRes.dutyStatus || 'punched_out',
          punchedAt: statusRes.punchedAt || null,
          breakStartedAt: statusRes.breakStartedAt || null,
          breaksTaken: statusRes.breaksTaken || 0,
          breaksRemaining: statusRes.breaksRemaining ?? MAX_BREAKS_PER_SHIFT,
          maxBreaksReached: Boolean(statusRes.maxBreaksReached),
          todayMinutes: statusRes.todayMinutes || 0,
          todayBreakMinutes: statusRes.todayBreakMinutes || 0,
          weekMinutes: statusRes.weekMinutes || 0,
          todayPunchCount: statusRes.todayPunchCount || 0,
          weeklyBreakdown: statusRes.weeklyBreakdown || EMPTY_BREAKDOWN,
        })
        setLastUpdated(new Date())
      } else {
        throw new Error('Invalid dashboard response.')
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError('Failed to refresh status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (actionType) => {
    setActionLoading(true)
    setError(null)

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
          const res = await api.punch(actionType, lat, lng, null)
          if (res?.success) {
            await loadDashboardData()
          } else {
            setError(res?.error || 'Action failed.')
          }
        } catch (err) {
          setError(err?.message || 'Failed to submit action.')
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
  const isOnBreak = status?.dutyStatus === 'on_break'
  const breaksTaken = Number(status?.breaksTaken) || 0
  const breaksRemaining = Number(status?.breaksRemaining ?? MAX_BREAKS_PER_SHIFT)
  const maxBreaksReached = Boolean(status?.maxBreaksReached)
  const weekLabels = useMemo(() => getWeekLabels(), [])
  const todayIdx = useMemo(() => getTodayIndex(), [])
  const weeklyBreakdown = status?.weeklyBreakdown?.length === 7 ? status.weeklyBreakdown : EMPTY_BREAKDOWN

  const liveActiveMinutes = isPunchedIn && status.punchedAt && !isOnBreak
    ? Math.floor(Math.max(0, now - new Date(status.punchedAt).getTime()) / 60000)
    : 0

  const liveBreakMinutes = isOnBreak && status.breakStartedAt
    ? Math.floor(Math.max(0, now - new Date(status.breakStartedAt).getTime()) / 60000)
    : 0

  const totalTodayMinutes = status.todayMinutes + liveActiveMinutes
  const totalTodayBreak = status.todayBreakMinutes + liveBreakMinutes
  const totalWeekMinutes = status.weekMinutes + liveActiveMinutes

  const effectiveWeeklyBreakdown = useMemo(
    () => weeklyBreakdown.map((minutes, index) => (index === todayIdx ? totalTodayMinutes : minutes)),
    [weeklyBreakdown, todayIdx, totalTodayMinutes]
  )

  const maxDayMinutes = useMemo(
    () => Math.max(60, ...effectiveWeeklyBreakdown),
    [effectiveWeeklyBreakdown]
  )

  const canStartBreak = isPunchedIn && !isOnBreak && !maxBreaksReached

  if (loading) return <DashboardSkeleton />

  return (
    <div className="min-h-screen bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 font-sans transition-colors pb-24">
      <Header userEmail={userEmail} onLogout={handleSignOut} onNavigate={onNavigate} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF5200]">Attendance overview</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight">Your work rhythm</h1>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Hours spent and punches this week</p>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading || actionLoading}
            className="shrink-0 px-3 py-2 rounded-xl border border-[#0050FF]/20 bg-[#0050FF]/10 text-[#0050FF] text-xs font-black hover:bg-[#0050FF]/20 disabled:opacity-50 transition"
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center space-x-2 shadow-sm">
            <span>{error}</span>
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Today Worked" value={formatDuration(totalTodayMinutes)} detail="Total duty time" />
          <MetricCard label="Break Time" value={formatDuration(totalTodayBreak)} detail="Rest duration today" accent="amber" />
          <MetricCard label="This week" value={formatDuration(totalWeekMinutes)} detail="Monday to today" accent="orange" />
          <MetricCard label="Punches today" value={status.todayPunchCount} detail="Completed sessions" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="bg-white dark:bg-[#181E25] border border-slate-200 dark:border-[#28313D] rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-black">Hours by day</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your Monday to Sunday duty pattern</p>
              </div>
              <span className="text-xs font-black text-[#0050FF]">{formatDuration(totalWeekMinutes)}</span>
            </div>
            <div className="mt-7 h-44 flex items-end gap-2 sm:gap-3">
              {effectiveWeeklyBreakdown.map((dayMinutes, index) => {
                const isToday = index === todayIdx
                const height = dayMinutes ? Math.max(8, (dayMinutes / maxDayMinutes) * 100) : 4

                return (
                  <div key={`${weekLabels[index].short}-${index}`} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {dayMinutes ? `${Math.floor(dayMinutes / 60)}h` : ''}
                    </span>
                    <div className="w-full h-32 flex items-end rounded-lg bg-slate-100 dark:bg-slate-800/70 overflow-hidden">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 ${isToday ? 'bg-[#FF5200]' : 'bg-[#0050FF]'}`}
                        style={{ height: `${height}%` }}
                        title={`${weekLabels[index].date}: ${formatDuration(dayMinutes)}`}
                      />
                    </div>
                    <span className={`text-[10px] font-black ${isToday ? 'text-[#FF5200]' : 'text-slate-500 dark:text-slate-400'}`}>
                      {weekLabels[index].short}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-[#181E25] border border-slate-200 dark:border-[#28313D] rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-black">Today at a glance</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Session frequency</p>
              </div>
              <span className="text-2xl font-black text-[#FF5200]">{status.todayPunchCount}</span>
            </div>
            <div className="mt-6 flex items-center gap-5">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{ background: `conic-gradient(#FF5200 ${Math.min(status.todayPunchCount, 8) * 45}deg, #e2e8f0 0deg)` }}
              >
                <div className="w-20 h-20 rounded-full bg-white dark:bg-[#181E25] flex flex-col items-center justify-center">
                  <span className="text-xl font-black">{status.todayPunchCount}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">punches</span>
                </div>
              </div>
              <div className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <p>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#FF5200] mr-2" />
                  {formatDuration(totalTodayMinutes)} worked today
                </p>
                <p>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2" />
                  {formatDuration(totalTodayBreak)} total break time
                </p>
                <p>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#0050FF] mr-2" />
                  {isOnBreak ? 'Currently on break' : isPunchedIn ? 'Shift is active' : 'No active shift'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-[#181E25] border border-[#0050FF]/15 dark:border-[#28313D] rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col items-center">
          <div className="mb-3 flex items-center justify-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnBreak
                  ? 'bg-amber-500 animate-pulse'
                  : isPunchedIn
                  ? 'bg-emerald-500 animate-ping'
                  : 'bg-[#FF5200]'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
              {isOnBreak ? 'ON BREAK' : isPunchedIn ? 'ON DUTY • ACTIVE' : 'OFF DUTY'}
            </span>
          </div>

          <PunchGauge
            state={actionLoading ? 'locating' : isOnBreak ? 'off' : isPunchedIn ? 'on' : 'off'}
            onPress={() => {
              if (isOnBreak) handleAction('end_break')
              else if (isPunchedIn) handleAction('punch_out')
              else handleAction('punch_in')
            }}
            label={isOnBreak ? 'Resume Work' : isPunchedIn ? 'Punch Out' : 'Punch In'}
          />

          <div className="mt-4 flex items-center gap-3">
            {canStartBreak && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction('start_break')}
                className="px-6 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs font-black hover:bg-amber-500/20 disabled:opacity-50 transition"
              >
                Start Break ({breaksRemaining} left)
              </button>
            )}

            {isOnBreak && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleAction('punch_out')}
                className="px-6 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-black hover:bg-red-500/20 disabled:opacity-50 transition"
              >
                Punch Out Directly
              </button>
            )}
          </div>

          {isPunchedIn && !isOnBreak && (
            <p className="mt-3 text-[11px] font-semibold text-slate-400">
              {maxBreaksReached
                ? `All ${MAX_BREAKS_PER_SHIFT} breaks used for this shift.`
                : `${breaksTaken} of ${MAX_BREAKS_PER_SHIFT} breaks used this shift.`}
            </p>
          )}

          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isOnBreak
              ? `Break started ${new Date(status.breakStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${formatDuration(liveBreakMinutes)} elapsed)`
              : isPunchedIn
              ? `Shift started ${new Date(status.punchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${formatDuration(liveActiveMinutes)} elapsed)`
              : 'Ready when you are'}
          </p>
        </section>

        {lastUpdated && (
          <p className="text-center text-[10px] font-semibold text-slate-400">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </main>
    </div>
  )
}