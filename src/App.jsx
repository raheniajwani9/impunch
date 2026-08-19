import { useEffect, useState, useCallback, useRef } from 'react'
import Login from './screens/Login'
import Dashboard, { DashboardSkeleton } from './screens/Dashboard'
import AdminDashboard from './screens/AdminDashboard'
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

const OUT_OF_BOUNDS_LIMIT_MS = 30 * 60 * 1000 // 30 minutes

function getCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => resolve({ lat: fallbackPos.coords.latitude, lng: fallbackPos.coords.longitude }),
            (fallbackErr) => reject(new Error('Location unavailable. Please verify GPS permissions.')),
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
          )
        } else {
          reject(new Error('Location permission denied. Please enable GPS.'))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  })
}

export default function App() {
  const [appState, setAppState] = useState(APP_STATE.CHECKING_SESSION)
  const [page, setPage] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('user')
  const [dutyStatus, setDutyStatus] = useState('punched_out')
  const [punchedAt, setPunchedAt] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [toasts, setToasts] = useState([])
  const [isProcessingExit, setIsProcessingExit] = useState(false)
  
  const lastCheckTimeRef = useRef(0)

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
    setUserRole('user')
    setUser(null)
  }

  const triggerAutoPunchOutAndLogout = useCallback(async (lat, lng, reason) => {
    if (isProcessingExit) return
    setIsProcessingExit(true)

    addToast('error', reason || 'Auto punch-out initiated: Away from POD zone.')

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
    
    let coords = { lat: 0, lng: 0 }
    try {
      coords = await getCurrentCoordinates()
    } catch (locErr) {
      addToast('warning', locErr.message || 'Proceeding without high-accuracy GPS.')
    }

    try {
      const status = await api.getStatus(coords.lat, coords.lng)
      const userEmail = session?.user?.email || session?.email || ''
      const role = String(status?.role || session?.user?.role || session?.role || 'user').trim().toLowerCase()
      
      setUserRole(role)
      setUser({ email: userEmail, role: role, user: { email: userEmail, role: role } })
      
      setDutyStatus(status?.dutyStatus || 'punched_out')
      setPunchedAt(status?.punchedAt || null)

      if (status?.isOutOfBounds || status?.podName === 'OUT_OF_BOUNDS') {
        addToast('error', 'You are currently away from your assigned POD.')
      }

      setAppState(APP_STATE.READY)
    } catch (err) {
      const errMsg = String(err?.message || '').toLowerCase()
      
      if (errMsg.includes('session') || errMsg.includes('token') || errMsg.includes('unauthorized') || errMsg.includes('expired')) {
        clearSession()
        localStorage.removeItem('oob_start_time')
        setUser(null)
        setUserRole('user')
        setAppState(APP_STATE.AUTH)
        addToast('warning', 'Session expired. Please log in with a new OTP.')
      } else {
        addToast('error', err?.message || 'Could not load dashboard status.')
        setAppState(APP_STATE.READY)
      }
    }
  }

  useEffect(() => {
    if (appState !== APP_STATE.READY || isProcessingExit || !navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now()
        if (now - lastCheckTimeRef.current < 60000) return
        lastCheckTimeRef.current = now

        const currentLat = pos.coords.latitude
        const currentLng = pos.coords.longitude

        try {
          const check = await api.getStatus(currentLat, currentLng)
          
          if (check?.isOutOfBounds || check?.podName === 'OUT_OF_BOUNDS') {
            const firstOobTime = localStorage.getItem('oob_start_time')

            if (!firstOobTime) {
              localStorage.setItem('oob_start_time', now.toString())
              addToast('warning', 'You left the POD area. 30 min auto-logout timer started.')
            } else {
              const durationAway = now - parseInt(firstOobTime, 10)

              if (durationAway >= OUT_OF_BOUNDS_LIMIT_MS) {
                localStorage.removeItem('oob_start_time')
                await triggerAutoPunchOutAndLogout(
                  currentLat, 
                  currentLng, 
                  'Auto-punched out: Away from POD for over 30 minutes.'
                )
              } else {
                const minutesLeft = Math.ceil((OUT_OF_BOUNDS_LIMIT_MS - durationAway) / 60000)
                addToast('warning', `Away from POD. Forced logout in ${minutesLeft} mins.`)
              }
            }
          } else {
            localStorage.removeItem('oob_start_time')
          }
        } catch (err) {
          console.warn('Geofence tracking error:', err)
        }
      },
      (err) => console.warn('GPS Watcher background warning:', err.message),
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 30000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [appState, isProcessingExit, addToast, triggerAutoPunchOutAndLogout])

  useEffect(() => {
    if (appState !== APP_STATE.READY || isProcessingExit) return

    const timerId = setInterval(() => {
      const firstOobTime = localStorage.getItem('oob_start_time')
      if (!firstOobTime) return

      const durationAway = Date.now() - parseInt(firstOobTime, 10)
      if (durationAway >= OUT_OF_BOUNDS_LIMIT_MS) {
        localStorage.removeItem('oob_start_time')
        triggerAutoPunchOutAndLogout(0, 0, 'Auto-punched out: Away from POD for over 30 minutes.')
      }
    }, 30000)

    return () => clearInterval(timerId)
  }, [appState, isProcessingExit, triggerAutoPunchOutAndLogout])

  function handleAuthenticated() {
    const session = getSession()
    loadDashboard(session)
  }

  const handleToggleTheme = () => setIsDark((prev) => !prev)
  const isReady = appState === APP_STATE.READY
  const isAdminOrSuper = userRole === 'admin' || userRole === 'superadmin'

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
          {/* Main View: Admin Console or Agent Dashboard */}
          <div style={{ display: page === 'dashboard' ? 'block' : 'none' }}>
            {isAdminOrSuper ? (
              <AdminDashboard 
                user={user} 
                onLogout={handleSignOut} 
                onNavigate={setPage}
                addToast={addToast} 
              />
            ) : (
              <Dashboard
                user={user}
                initialDutyStatus={dutyStatus}
                initialPunchedAt={punchedAt}
                addToast={addToast}
                onLogout={handleSignOut}
                onNavigate={setPage}
              />
            )}
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

          {!isAdminOrSuper && (
            <NavBar page={page} onNavigate={setPage} />
          )}
        </>
      )}

      <ToastStack toasts={toasts} dismiss={dismissToast} />
    </div>
  )
}