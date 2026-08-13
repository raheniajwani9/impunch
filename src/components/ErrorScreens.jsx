import { GlassCard } from './ui'

export function LocationDeniedModal({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-6">
      <GlassCard className="max-w-sm text-center border border-primary-500/20">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4">
          <path d="M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21z" stroke="#EF4444" strokeWidth="1.6" />
          <circle cx="12" cy="9.5" r="2.3" stroke="#EF4444" strokeWidth="1.6" />
        </svg>
        <h2 className="text-lg font-bold text-ink dark:text-white mb-2">Location access required</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          IMPunch requires location access to validate your timesheet.
        </p>
        <div className="text-left text-xs text-slate-600 dark:text-slate-400 bg-primary-500/5 rounded-xl p-3 mb-5 space-y-1">
          <p className="eyebrow text-[10px] text-primary-500 mb-1">To enable it</p>
          <p><span className="font-medium">iOS:</span> Settings → IMPunch → Location → While Using the App</p>
          <p><span className="font-medium">Android:</span> Settings → Apps → IMPunch → Permissions → Location → Allow</p>
        </div>
        <button
          onClick={onDismiss}
          className="btn-press w-full tap-target rounded-xl bg-primary-500 text-white font-semibold"
        >
          Got it
        </button>
      </GlassCard>
    </div>
  )
}

export function GeofenceViolationScreen({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-6">
      <GlassCard className="max-w-sm text-center border-2 border-accent-500/40">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4">
          <path d="M12 3L2 20h20L12 3z" stroke="#FF5200" strokeWidth="1.6" strokeLinejoin="round" />
          <line x1="12" y1="10" x2="12" y2="14.5" stroke="#FF5200" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="17" r="0.9" fill="#FF5200" />
        </svg>
        <h2 className="text-lg font-bold text-accent-600 dark:text-accent-400 mb-2">Punched In — Out of Bounds</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Your punch was recorded, but you're outside the assigned work zone. This has been flagged for manager review.
        </p>
        <button
          onClick={onDismiss}
          className="btn-press w-full tap-target rounded-xl bg-accent-500 text-white font-semibold"
        >
          Understood
        </button>
      </GlassCard>
    </div>
  )
}