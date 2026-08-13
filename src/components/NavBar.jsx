function GaugeIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.6" />
      <path d="M12 12L15.5 8.5" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill={active ? '#0050FF' : 'currentColor'} />
    </svg>
  )
}
function BadgeIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="17" rx="2" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.2" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.6" />
      <path d="M8 17c0.7-2 2-3 4-3s3.3 1 4 3" stroke={active ? '#0050FF' : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function NavBar({ page, onNavigate }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', Icon: GaugeIcon },
    { id: 'profile', label: 'Profile', Icon: BadgeIcon },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-primary-500/10">
      <div className="max-w-sm mx-auto flex">
        {tabs.map(({ id, label, Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex-1 tap-target flex flex-col items-center justify-center gap-1 py-2.5 eyebrow text-[10px] transition-colors ${
                active ? 'text-primary-500' : 'text-slate-400'
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