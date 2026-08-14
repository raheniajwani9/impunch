import React from 'react'
import { GlassCard, ThemeToggle } from '../components/ui'
import { clearSession } from '../lib/api'

export default function Profile({ user, isDark, onToggleTheme, onSignOut }) {
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