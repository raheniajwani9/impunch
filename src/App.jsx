import { useEffect, useState, useCallback } from 'react'
import Login from './screens/Login'
import Dashboard, { DashboardSkeleton } from './screens/Dashboard'
import Profile from './screens/Profile'
import History from './screens/History' 
import NavBar from './components/NavBar'
import { api, getSession, clearSession } from './lib/api'
import { Banner, ToastStack } from './components/ui'

const APP_STATE = {
  CHECKING_SESSION: 'CHECKING_SESSION',
  AUTH: 'AUTH',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
}

export default function App() {
  const [appState, setAppState] = useState(APP_STATE.CHECKING_SESSION)
  const [page, setPage] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [dutyStatus, setDutyStatus] = useState('punched_out')
  const [punchedAt, setPunchedAt] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [toasts, setToasts] = useState([])

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('impunch_theme')
    if (savedTheme !== null) return savedTheme === 'dark'
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    if (isDark) {
      root.classList.add('dark')
      body?.classList.add('dark')
      localStorage.setItem('impunch_theme', 'dark')
    } else {
      root.classList.remove('dark')
      body?.classList.remove('dark')
      localStorage.setItem('impunch_theme', 'light')
    }
  }, [isDark])

  const addToast = useCallback((tone, message) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, tone, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      if (typeof flushOfflineQueue === 'function') {
        flushOfflineQueue(addToast)
      }
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [addToast])

  useEffect(() => {
    const session = getSession()
    if (!session?.token) {
      setAppState(APP_STATE.AUTH)
      return
    }
    loadDashboard(session)
  }, [])

  async function loadDashboard(session) {
    setAppState(APP_STATE.INITIALIZING)
    try {
      const status = await api.getStatus().catch(() => ({ dutyStatus: 'punched_out', punchedAt: null }))
      
      const userEmail = session?.user?.email || session?.email || ''
      setUser({ email: userEmail, user: { email: userEmail } })
      
      setDutyStatus(status?.dutyStatus || 'punched_out')
      setPunchedAt(status?.punchedAt || null)
      setAppState(APP_STATE.READY)
    } catch (err) {
      if (String(err?.message || '').toLowerCase().includes('session')) {
        clearSession()
        setAppState(APP_STATE.AUTH)
      } else {
        addToast('error', err?.message || 'Could not load your dashboard.')
        setAppState(APP_STATE.AUTH)
      }
    }
  }

  function handleAuthenticated() {
    const session = getSession()
    loadDashboard(session)
  }

  function handleSignOut() {
    clearSession()
    setPage('dashboard')
    setAppState(APP_STATE.AUTH)
  }

  const handleToggleTheme = () => setIsDark((prev) => !prev)

  const isReady = appState === APP_STATE.READY

  return (
    <div className="min-h-screen bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 transition-colors">
      {!isOnline && (
        <Banner tone="offline">
          Offline Mode Active — punches will queue until signal returns.
        </Banner>
      )}

      {appState === APP_STATE.CHECKING_SESSION && null}
      {appState === APP_STATE.AUTH && <Login onAuthenticated={handleAuthenticated} />}
      {appState === APP_STATE.INITIALIZING && <DashboardSkeleton />}

      {isReady && (
        <>
          <div style={{ display: page === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard
              user={user}
              initialDutyStatus={dutyStatus}
              initialPunchedAt={punchedAt}
              addToast={addToast}
              onLogout={handleSignOut}
              onNavigate={setPage}
            />
          </div>

          <div style={{ display: page === 'history' ? 'block' : 'none' }}>
            <History 
              onLogout={handleSignOut} 
              onNavigate={setPage} 
            />
          </div>

          <div style={{ display: page === 'profile' ? 'block' : 'none' }}>
            <Profile
              user={user}
              isDark={isDark}
              onToggleTheme={handleToggleTheme}
              onSignOut={handleSignOut}
              onNavigate={setPage}
            />
          </div>

          <NavBar page={page} onNavigate={setPage} />
        </>
      )}

      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </div>
  )
}