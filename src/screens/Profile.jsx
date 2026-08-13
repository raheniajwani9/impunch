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
    <div className="min-h-screen px-6 pt-10 pb-28 app-bg">
      <div className="max-w-sm mx-auto space-y-6">
        <h1 className="eyebrow text-[11px] text-primary-500">Profile</h1>

        <GlassCard className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full glass border border-primary-500/30 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="4" width="14" height="17" rx="2" stroke="#0050FF" strokeWidth="1.6" />
              <circle cx="12" cy="10" r="2.2" stroke="#0050FF" strokeWidth="1.6" />
              <path d="M8 17c0.7-2 2-3 4-3s3.3 1 4 3" stroke="#0050FF" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-ink dark:text-white font-medium">{user?.email}</p>
            <p className="eyebrow text-[10px] text-slate-500 mt-0.5">Field Worker</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center justify-between">
          <div>
            <p className="text-ink dark:text-white font-medium text-sm">Appearance</p>
            <p className="eyebrow text-[10px] text-slate-500 mt-0.5">{isDark ? 'Dark' : 'Light'}</p>
          </div>
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </GlassCard>

        <div>
          <p className="eyebrow text-[10px] text-primary-500 mb-2 px-1">Recent Activity</p>
          <GlassCard className="divide-y divide-primary-500/10 !p-0">
            {logs === null && (
              <div className="p-4 space-y-3">
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="h-4 w-1/2" />
                <SkeletonBox className="h-4 w-2/3" />
              </div>
            )}
            {logs !== null && logs.length === 0 && (
              <p className="text-slate-500 text-sm p-4">No punches logged yet.</p>
            )}
            {logs !== null &&
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${log.action === 'punch_in' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-ink dark:text-slate-200">{log.action === 'punch_in' ? 'Punched In' : 'Punched Out'}</span>
                    {log.is_violation && <span className="eyebrow text-[9px] text-accent-600 dark:text-accent-400">⚠ Flagged</span>}
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    {new Date(log.created_at).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
          </GlassCard>
          {error && <p className="text-sm text-red-500 mt-2 px-1">{error}</p>}
        </div>

        <button
          onClick={handleSignOut}
          className="btn-press w-full tap-target rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-semibold"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}