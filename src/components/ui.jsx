import React from 'react'

export function GlassCard({ children, className = '' }) {
  return (
    <div className={`bg-[#FFFFFF] dark:bg-[#181E25] border border-[#0050FF]/10 dark:border-[#28313D] rounded-2xl shadow-lg shadow-[#0050FF]/5 p-5 ${className}`}>
      {children}
    </div>
  )
}

export function SkeletonBox({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-[#0050FF]/10 dark:bg-[#28313D] ${className}`} />
}

const toneStyles = {
  sync: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300',
  violation: 'bg-[#FF5200]/10 border-[#FF5200]/30 text-[#FF5200]',
  offline: 'bg-[#0050FF]/10 border-[#0050FF]/30 text-[#0050FF]',
  error: 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400',
}

export function Toast({ tone = 'sync', children, onDismiss }) {
  return (
    <div
      role="status"
      className={`border ${toneStyles[tone]} rounded-2xl px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-toastIn`}
    >
      <span>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-xs shrink-0 font-black">
          ✕
        </button>
      )}
    </div>
  )
}

export function ToastStack({ toasts, dismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm space-y-2 z-50">
      {toasts.map((t) => (
        <Toast key={t.id} tone={t.tone} onDismiss={() => dismiss(t.id)}>
          {t.message}
        </Toast>
      ))}
    </div>
  )
}

export function Banner({ tone = 'offline', children }) {
  return (
    <div className={`w-full text-center text-[11px] font-bold uppercase tracking-wider py-2 px-4 border-b ${toneStyles[tone]}`}>
      {children}
    </div>
  )
}

export function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#28313D] border border-slate-200 dark:border-[#28313D] flex items-center justify-center transition active:scale-95"
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.8A9 9 0 1111.2 3 7.2 7.2 0 0021 12.8z" stroke="#0050FF" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4.5" stroke="#FF5200" strokeWidth="2" />
          <path d="M12 3v2.2M12 18.8V21M4.2 12H2M22 12h-2.2M5.6 5.6l1.5 1.5M18.4 18.4l-1.5-1.5M18.4 5.6l-1.5 1.5M5.6 18.4l1.5-1.5" stroke="#FF5200" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}