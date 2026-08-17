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

function getCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      (err) => {
        let msg = 'Failed to acquire location.'
        if (err.code === 1) msg = 'Location permission required. Please enable GPS.'
        if (err.code === 2) msg = 'Location unavailable. Please check your device GPS.'
        if (err.code === 3) msg = 'Location request timed out.'
        reject(new Error(msg))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

export default function App() {
  const [appState, setAppState] = useState(APP_STATE.CHECKING_SESSION)
  const [page, setPage] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [dutyStatus, setDutyStatus] = useState('punched_out')
  const [punchedAt, setPunchedAt] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [toasts, setToasts] = useState([])
  const [isProcessingExit, setIsProcessingExit] = useState(false)

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

  function handleSignOut() {
    localStorage.removeItem('oob_start_time')
    clearSession()
    setPage('dashboard')
    setAppState(APP_STATE.AUTH)
    setIsProcessingExit(false)
  }

  const triggerAutoPunchOutAndLogout = useCallback(async (lat, lng, reason) => {
    if (isProcessingExit) return
    setIsProcessingExit(true)

    addToast('error', reason || 'You are not at POD location or near to POD.')

    try {
      await api.punch('punch_out', lat, lng, null)
    } catch (err) {
      console.error('Auto punch-out execution error:', err)
    } finally {
      handleSignOut()
    }
  }, [isProcessingExit, addToast])

  useEffect(() => {
    function handleOnline() { setIsOnline(true) }
    function handleOffline() { setIsOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
    
    let coords = null
    try {
      coords = await getCurrentCoordinates()
    } catch (locErr) {
      addToast('error', locErr.message)
      setAppState(APP_STATE.READY)
      return
    }

    try {
      const status = await api.getStatus(coords.lat, coords.lng)
      const userEmail = session?.user?.email || session?.email || ''
      setUser({ email: userEmail, user: { email: userEmail } })
      
      setDutyStatus(status?.dutyStatus || 'punched_out')
      setPunchedAt(status?.punchedAt || null)

      if (status?.isOutOfBounds || status?.podName === 'OUT_OF_BOUNDS') {
        addToast('error', 'You are not at POD location or near to POD.')
      }

      setAppState(APP_STATE.READY)
    } catch (err) {
      if (String(err?.message || '').toLowerCase().includes('session')) {
        clearSession()
        setAppState(APP_STATE.AUTH)
      } else {
        addToast('error', err?.message || 'Could not load dashboard status.')
        setAppState(APP_STATE.READY)
      }
    }
  }

  const OUT_OF_BOUNDS_LIMIT_MS = 30 * 60 * 1000 // 30 minutes

useEffect(() => {
  if (appState !== APP_STATE.READY || isProcessingExit || !navigator.geolocation) return

  const watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const currentLat = pos.coords.latitude
      const currentLng = pos.coords.longitude

      try {
        const check = await api.getStatus(currentLat, currentLng)
        
        if (check?.isOutOfBounds || check?.podName === 'OUT_OF_BOUNDS') {
          const now = Date.now()
          const firstOobTime = localStorage.getItem('oob_start_time')

          if (!firstOobTime) {
            // First time detected out of bounds — start the timer
            localStorage.setItem('oob_start_time', now.toString())
            addToast('warning', 'You are away from the POD location.')
          } else {
            const durationAway = now - parseInt(firstOobTime, 10)

            if (durationAway >= OUT_OF_BOUNDS_LIMIT_MS) {
              // 30 minutes exceeded — clear timer, punch out, and log out
              localStorage.removeItem('oob_start_time')
              await triggerAutoPunchOutAndLogout(
                currentLat, 
                currentLng, 
                'Logged out: Away from POD location for over 30 minutes.'
              )
            } else {
              const minutesLeft = Math.ceil((OUT_OF_BOUNDS_LIMIT_MS - durationAway) / 60000)
              addToast('warning', `You are away from POD. Auto logout in ${minutesLeft} mins.`)
            }
          }
        } else {
          localStorage.removeItem('oob_start_time')
        }
      } catch (err) {
        console.warn('Geofence tracking error:', err)
      }
    },
    (err) => console.warn('GPS watcher error:', err),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  )

  return () => navigator.geolocation.clearWatch(watchId)
}, [appState, isProcessingExit, addToast, triggerAutoPunchOutAndLogout])

  function handleAuthenticated() {
    const session = getSession()
    loadDashboard(session)
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