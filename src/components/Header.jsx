import React from 'react'

export default function Header({ userEmail, onLogout }) {
  return (
    <header className="w-full px-4 sm:px-6 py-4 flex justify-between items-center border-b border-[#0050FF]/15 dark:border-[#28313D] bg-[#FDF5EE] dark:bg-[#0E1217]">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0050FF] flex items-center justify-center font-black text-white text-base sm:text-lg shadow-md shadow-[#0050FF]/25 shrink-0">
          IM
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-black tracking-wide text-[#0050FF] leading-tight">
            INSTAMART <span className="text-[#FF5200]">PUNCH</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
            {userEmail || 'Field Agent'}
          </p>
        </div>
      </div>

      <button
        onClick={onLogout}
        className="text-xs bg-[#FFFFFF] dark:bg-[#181E25] hover:bg-slate-50 dark:hover:bg-[#28313D] text-slate-700 dark:text-slate-200 font-bold px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 dark:border-[#28313D] transition active:scale-95 shadow-sm"
      >
        Sign Out
      </button>
    </header>
  )
}