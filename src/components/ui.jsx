export function GlassCard({ children, className = '' }) {
  return (
    <div className={`glass rounded-3xl shadow-lg shadow-primary-500/5 p-6 ${className}`}>
      {children}
    </div>
  )
}

export function SkeletonBox({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-primary-500/10 ${className}`} />
}

const toneStyles = {
  sync: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  violation: 'bg-accent-500/10 border-accent-500/30 text-accent-600 dark:text-accent-400',
  offline: 'bg-primary-500/10 border-primary-500/30 text-primary-600 dark:text-primary-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
}

export function Toast({ tone = 'sync', children, onDismiss }) {
  return (
    <div
      role="status"
      className={`glass border ${toneStyles[tone]} rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 shadow-lg animate-[toastIn_0.25s_ease]`}
    >
      <span>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 tap-target text-xs shrink-0">
          ✕
        </button>
      )}
    </div>
  )
}

export function ToastStack({ toasts, dismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm space-y-2 z-50">
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
    <div className={`w-full text-center eyebrow text-[11px] py-2.5 px-4 border-b ${toneStyles[tone]}`}>
      {children}
    </div>
  )
}

export function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className="btn-press tap-target w-11 h-11 rounded-full glass border border-primary-500/20 flex items-center justify-center"
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.8A9 9 0 1111.2 3 7.2 7.2 0 0021 12.8z" stroke="#3374FF" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4.5" stroke="#FF5200" strokeWidth="1.6" />
          <path d="M12 3v2.2M12 18.8V21M4.2 12H2M22 12h-2.2M5.6 5.6l1.5 1.5M18.4 18.4l-1.5-1.5M18.4 5.6l-1.5 1.5M5.6 18.4l1.5-1.5" stroke="#FF5200" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}