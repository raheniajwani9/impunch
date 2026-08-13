import { useEffect, useState } from 'react'
import { GlassCard, SkeletonBox, ThemeToggle } from '../components/ui'
import { api, clearSession } from '../lib/api'

export default function Profile({ user, isDark, onToggleTheme, onSignOut }) {
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getRecentLogs(5)
      .then((res) => setLogs(res.logs || []))
      .catch((err) => setError(err.message || 'Could not load activity.'))
  }, [])

  function handleSignOut() {
    clearSession()
    onSignOut()
  }

  return (
    <div className="min-h-screen px-6 pt-8 pb-28 bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-sm mx-auto space-y-5">
        {/* Profile Card */}
        <GlassCard className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0050FF]/10 dark:bg-[#0050FF]/20 border border-[#0050FF]/30 flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="4" width="14" height="17" rx="2" stroke="#0050FF" strokeWidth="1.8" />
              <circle cx="12" cy="10" r="2.2" stroke="#0050FF" strokeWidth="1.8" />
              <path d="M8 17c0.7-2 2-3 4-3s3.3 1 4 3" stroke="#0050FF" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="overflow-hidden">
            <p className="text-slate-900 dark:text-white font-bold text-sm truncate">{user?.email || 'Field Agent'}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF5200] mt-0.5">Swiggy Field Operations</p>
          </div>
        </GlassCard>

        {/* Theme Settings Card */}
        <GlassCard className="flex items-center justify-between">
          <div>
            <p className="text-slate-900 dark:text-white font-bold text-sm">Theme Appearance</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
            </p>
          </div>
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </GlassCard>

        {/* Recent Activity Card */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0050FF] mb-2 px-1">
            Recent Punch History
          </p>
          <GlassCard className="divide-y divide-slate-100 dark:divide-[#28313D] !p-0 overflow-hidden">
            {logs === null && (
              <div className="p-4 space-y-3">
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="h-4 w-1/2" />
                <SkeletonBox className="h-4 w-2/3" />
              </div>
            )}
            {logs !== null && logs.length === 0 && (
              <p className="text-slate-400 text-xs p-4 text-center">No punches logged yet today.</p>
            )}
            {logs !== null &&
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-black ${
                        log.action === 'punch_in'
                          ? 'bg-[#0050FF]/10 text-[#0050FF] border border-[#0050FF]/20'
                          : 'bg-[#FF5200]/10 text-[#FF5200] border border-[#FF5200]/20'
                      }`}
                    >
                      {log.action === 'punch_in' ? 'IN' : 'OUT'}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[140px]">
                      {log.geofence_id && log.geofence_id !== 'OUT_OF_BOUNDS' ? log.geofence_id : 'Out of Bounds'}
                    </span>
                    {log.is_violation && (
                      <span className="text-[9px] bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded">
                        ⚠
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
          </GlassCard>
          {error && <p className="text-xs text-red-500 mt-2 px-1 font-semibold">{error}</p>}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-sm active:scale-95 transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}