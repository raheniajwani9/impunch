import { useEffect, useState, useCallback } from 'react'
import Login from './screens/Login'
import Dashboard, { DashboardSkeleton, flushOfflineQueue } from './screens/Dashboard'
import Profile from './screens/Profile'
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
  const [isDark, setIsDark] = useState(true)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((tone, message) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, tone, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      flushOfflineQueue(addToast)
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
      const status = await api.getStatus()
      setUser({ email: session.email })
      setDutyStatus(status.dutyStatus || 'punched_out')
      setPunchedAt(status.punchedAt || null)
      setAppState(APP_STATE.READY)
    } catch (err) {
      console.error('loadDashboard failed:', err)
      if (String(err.message || '').toLowerCase().includes('session')) {
        clearSession()
        setAppState(APP_STATE.AUTH)
      } else {
        addToast('error', err.message || 'Could not load your dashboard.')
        setAppState(APP_STATE.AUTH)
      }
    }
  }

  function handleAuthenticated() {
    const session = getSession()
    loadDashboard(session)
  }

  function handleSignOut() {
    setPage('dashboard')
    setAppState(APP_STATE.AUTH)
  }

  const isReady = appState === APP_STATE.READY

  return (
    <>
      {!isOnline && <Banner tone="offline">Offline Mode Active — punches will queue until signal returns.</Banner>}

      {appState === APP_STATE.CHECKING_SESSION && null}
      {appState === APP_STATE.AUTH && <Login onAuthenticated={handleAuthenticated} />}
      {appState === APP_STATE.INITIALIZING && <DashboardSkeleton />}

      {isReady && (
        <div style={{ display: page === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard
            user={user}
            initialDutyStatus={dutyStatus}
            initialPunchedAt={punchedAt}
            addToast={addToast}
          />
        </div>
      )}
      {isReady && (
        <div style={{ display: page === 'profile' ? 'block' : 'none' }}>
          <Profile
            user={user}
            isDark={isDark}
            onToggleTheme={() => setIsDark((d) => !d)}
            onSignOut={handleSignOut}
          />
        </div>
      )}

      {isReady && <NavBar page={page} onNavigate={setPage} />}

      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </>
  )
}