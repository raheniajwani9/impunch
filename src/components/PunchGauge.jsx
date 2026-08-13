import React from 'react'

const TICK_COUNT = 24

export default function PunchGauge({ state, onPress, label }) {
  const ticks = Array.from({ length: TICK_COUNT })
  const isLocating = state === 'locating'
  const isOn = state === 'on'

  return (
    <div className="relative w-48 h-48 flex items-center justify-center select-none my-2">
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
          <circle cx="100" cy="100" r="55" fill="none" stroke="#FF5200" strokeWidth="2" className="animate-ping" />
        )}
        <circle cx="100" cy="100" r="72" fill="none" stroke="#0050FF" strokeWidth="1.5" opacity="0.35" />
      </svg>

      <button
        onClick={onPress}
        disabled={isLocating}
        aria-label={label}
        className={`relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center gap-1 text-white shadow-xl transition-transform active:scale-95 duration-300 ${
          isLocating
            ? 'bg-slate-100 dark:bg-[#181E25] border-2 border-[#FF5200] cursor-wait text-slate-800 dark:text-slate-200'
            : isOn
            ? 'bg-gradient-to-b from-rose-500 to-red-600 shadow-red-500/25 hover:from-rose-600 hover:to-red-700'
            : 'bg-gradient-to-b from-[#0050FF] to-[#003ACC] shadow-[#0050FF]/30 hover:from-[#0042D9] hover:to-[#0033B3]'
        }`}
      >
        {isLocating ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5200] animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF5200] leading-tight px-4 text-center">
              Acquiring GPS
            </span>
          </>
        ) : (
          <>
            <span className="font-black text-lg tracking-wide">{isOn ? 'PUNCH OUT' : 'PUNCH IN'}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">
              {isOn ? 'End Shift' : 'Start Shift'}
            </span>
          </>
        )}
      </button>
    </div>
  )
}