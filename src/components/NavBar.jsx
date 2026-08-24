import React from 'react'

function GaugeIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.8" />
      <path d="M12 12L15.5 8.5" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill={active ? '#0050FF' : 'currentColor'} />
    </svg>
  )
}

function DashboardIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.8" />
    </svg>
  )
}

function HistoryIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v4l3 3" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.8" />
    </svg>
  )
}

export default function NavBar({ page, onNavigate }) {
  const tabs = [
    { id: 'punch', label: 'Punch', Icon: GaugeIcon },
    { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
    { id: 'history', label: 'History', Icon: HistoryIcon },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF]/90 dark:bg-[#181E25]/90 backdrop-blur-md border-t border-[#0050FF]/15 dark:border-[#28313D]">
      <div className="max-w-sm mx-auto flex">
        {tabs.map(({ id, label, Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                active ? 'text-[#0050FF]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Icon active={active} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}