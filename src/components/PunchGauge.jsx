const TICK_COUNT = 24

export default function PunchGauge({ state, onPress, label }) {
  const ticks = Array.from({ length: TICK_COUNT })
  const isLocating = state === 'locating'
  const isOn = state === 'on'

  return (
    <div className="relative w-48 h-48 flex items-center justify-center select-none">
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
        {ticks.map((_, i) => {
          const angle = (i / TICK_COUNT) * 360
          const major = i % 6 === 0
          return (
            <line
              key={i}
              x1="100" y1={major ? '10' : '16'} x2="100" y2="24"
              stroke={major ? '#0050FF' : 'rgba(0,80,255,0.3)'}
              strokeWidth={major ? 2.5 : 1.5}
              transform={`rotate(${angle} 100 100)`}
            />
          )
        })}
        {isLocating && (
          <circle cx="100" cy="100" r="55" fill="none" stroke="#FF5200" strokeWidth="2" className="animate-radar" />
        )}
        <circle cx="100" cy="100" r="72" fill="none" stroke="#0050FF" strokeWidth="1.5" opacity="0.35" />
      </svg>

      <button
        onClick={onPress}
        disabled={isLocating}
        aria-label={label}
        className={`btn-press tap-target relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center gap-1 text-white shadow-xl transition-colors duration-300 ${
          isLocating
            ? 'bg-white dark:bg-ink border-2 border-accent-500/50 cursor-wait'
            : isOn
            ? 'bg-red-500 shadow-red-500/25'
            : 'bg-emerald-500 shadow-emerald-500/25'
        }`}
      >
        {isLocating ? (
          <>
            <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
            <span className="text-[11px] eyebrow text-accent-600 dark:text-accent-400 leading-tight px-4 text-center">Acquiring GPS Lock</span>
          </>
        ) : (
          <span className="font-bold text-base">{isOn ? 'Punch Out' : 'Punch In'}</span>
        )}
      </button>
    </div>
  )
}