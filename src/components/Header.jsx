import React, { useState, useRef, useEffect } from 'react'

export default function Header({ userEmail, onLogout, onNavigate }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Get the first initial letter of the user's email
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="w-full px-4 sm:px-6 py-4 flex justify-between items-center border-b border-[#0050FF]/15 dark:border-[#28313D] bg-[#FDF5EE] dark:bg-[#0E1217]">
      {/* App Branding */}
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

      {/* User Initial Avatar & Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="w-10 h-10 rounded-full bg-[#0050FF] text-white font-bold flex items-center justify-center border-2 border-white dark:border-[#28313D] shadow-md hover:opacity-90 active:scale-95 transition"
        >
          {initial}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#181E25] rounded-xl shadow-lg border border-slate-200 dark:border-[#28313D] py-1.5 z-50">
            <button
              onClick={() => {
                setDropdownOpen(false)
                if (onNavigate) onNavigate('profile')
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#28313D] transition"
            >
              View Profile
            </button>
            <button
              onClick={() => {
                setDropdownOpen(false)
                onLogout()
              }}
              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-[#28313D] transition"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}