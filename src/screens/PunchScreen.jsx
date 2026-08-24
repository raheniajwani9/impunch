import React, { useEffect, useState } from 'react'
import PunchGauge from '../components/PunchGauge'
import Header from '../components/Header'

const FORCE_LOGOUT_LIMIT_MS = 30 * 60 * 1000 // 30 minutes

export default function PunchScreen({
  status = {},
  actionLoading = false,
  handleAction = () => {},
  liveActiveMinutes = 0,
  liveBreakMinutes = 0,
  formatDuration = (m) => `${m}m`,
  userEmail = '',
  onLogout = () => {},
  onNavigate = () => {},
  MAX_BREAKS_PER_SHIFT = 3,
}) {
  const [forceLogoutTimeLeft, setForceLogoutTimeLeft] = useState(null)
  const [logoutReason, setLogoutReason] = useState('')

  const isPunchedIn = status?.dutyStatus === 'punched_in'
  const isOnBreak = status?.dutyStatus === 'on_break'
  const breaksTaken = Number(status?.breaksTaken) || 0
  const breaksRemaining = Number(status?.breaksRemaining ?? MAX_BREAKS_PER_SHIFT)
  const maxBreaksReached = Boolean(status?.maxBreaksReached)
  const canStartBreak = isPunchedIn && !isOnBreak && !maxBreaksReached

  // Real-time calculation for Forceful Logout Countdown
  useEffect(() => {
    const updateCountdown = () => {
      let startTime = null
      let reason = ''

      // 1. Check if user is away from POD (Server timestamp or local fallback)
      if (status?.isOutOfBounds || localStorage.getItem('oob_start_time')) {
        const localStart = localStorage.getItem('oob_start_time')
        startTime = status?.oobStartedAt 
          ? new Date(status.oobStartedAt).getTime() 
          : localStart ? parseInt(localStart, 10) : Date.now()
        
        reason = 'Away from POD'
      } 
      // 2. Check if user is on break (Break limit)
      else if (isOnBreak && status?.breakStartedAt) {
        startTime = new Date(status.breakStartedAt).getTime()
        reason = 'Break time limit'
      }

      if (!startTime || isNaN(startTime)) {
        setForceLogoutTimeLeft(null)
        setLogoutReason('')
        return
      }

      const elapsed = Date.now() - startTime
      const remaining = FORCE_LOGOUT_LIMIT_MS - elapsed

      setForceLogoutTimeLeft(remaining > 0 ? remaining : 0)
      setLogoutReason(reason)
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [status?.isOutOfBounds, status?.oobStartedAt, status?.breakStartedAt, isOnBreak])

  const formatTimerDisplay = (ms) => {
    if (ms === null || ms <= 0) return '00:00'
    const totalSecs = Math.floor(ms / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="min-h-screen bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 font-sans transition-colors pb-24 flex flex-col">
      <Header userEmail={userEmail} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center items-center">
        <div className="w-full bg-white dark:bg-[#181E25] border border-[#0050FF]/15 dark:border-[#28313D] rounded-3xl p-8 shadow-xl flex flex-col items-center">
          
          {/* Status Badge */}
          <div className="mb-4 flex items-center justify-center space-x-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isOnBreak
                  ? 'bg-amber-500 animate-pulse'
                  : isPunchedIn
                  ? 'bg-emerald-500 animate-ping'
                  : 'bg-[#FF5200]'
              }`}
            />
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
              {isOnBreak ? 'ON BREAK' : isPunchedIn ? 'ON DUTY • ACTIVE' : 'OFF DUTY'}
            </span>
          </div>

          {/* Punch Clock Gauge */}
          <PunchGauge
            state={actionLoading ? 'locating' : isOnBreak ? 'off' : isPunchedIn ? 'on' : 'off'}
            onPress={() => {
              if (isOnBreak) handleAction('end_break')
              else if (isPunchedIn) handleAction('punch_out')
              else handleAction('punch_in')
            }}
            label={isOnBreak ? 'Resume Work' : isPunchedIn ? 'Punch Out' : 'Punch In'}
          />

          {/* Live Forced Logout Timer Banner */}
          {forceLogoutTimeLeft !== null && (
            <div className="mt-5 w-full max-w-sm px-4 py-3 bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-red-600 dark:text-red-400">
                  Auto Logout ({logoutReason})
                </span>
              </div>
              <span className="font-mono text-base font-black text-red-600 dark:text-red-400 tracking-wider">
                {formatTimerDisplay(forceLogoutTimeLeft)}
              </span>
            </div>
          )}

          {/* Break Action Buttons */}
          <div className="mt-6 flex items-center gap-3">
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

          {/* Break Details */}
          {isPunchedIn && !isOnBreak && (
            <p className="mt-3 text-[11px] font-semibold text-slate-400">
              {maxBreaksReached
                ? `All ${MAX_BREAKS_PER_SHIFT} breaks used for this shift.`
                : `${breaksTaken} of ${MAX_BREAKS_PER_SHIFT} breaks used this shift.`}
            </p>
          )}

          {/* Timing Subtext */}
          <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isOnBreak && status?.breakStartedAt
              ? `Break started ${formatTime(status.breakStartedAt)} (${formatDuration(liveBreakMinutes)} elapsed)`
              : isPunchedIn && status?.punchedAt
              ? `Shift started ${formatTime(status.punchedAt)} (${formatDuration(liveActiveMinutes)} elapsed)`
              : 'Ready when you are'}
          </p>
        </div>
      </main>
    </div>
  )
}