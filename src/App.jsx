import React, { useEffect, useState, useCallback, useRef } from 'react'
import Login from './screens/Login'
import Dashboard, { DashboardSkeleton } from './screens/Dashboard'
import PunchScreen from './screens/PunchScreen'
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

const OUT_OF_BOUNDS_LIMIT_MS = 30 * 60 * 1000 

function getCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
  const [page, setPage] = useState('punch')
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('user')
  const [status, setStatus] = useState({
    dutyStatus: 'punched_out',
    punchedAt: null,
    breakStartedAt: null,
    oobStartedAt: null,
    breaksTaken: 0,
    breaksRemaining: 3,
    maxBreaksReached: false,
    isOutOfBounds: false,
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [toasts, setToasts] = useState([])
  const [isProcessingExit, setIsProcessingExit] = useState(false)
  const [now, setNow] = useState(Date.now())
  
  const lastCheckTimeRef = useRef(0)

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('impunch_theme')
    if (savedTheme !== null) return savedTheme === 'dark'
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

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
    setPage('punch')
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
    const resStatus = await api.getStatus(coords.lat, coords.lng)
    const userEmail = session?.user?.email || session?.email || ''
    const role = String(resStatus?.role || session?.user?.role || session?.role || 'user').trim().toLowerCase()
    
    setUserRole(role)
    // Clean, un-nested user object
    setUser({ email: userEmail, role: role })

    // Redirect admins directly to the dashboard tab instead of 'punch'
    const isAdmin = role === 'admin' || role === 'superadmin'
    if (isAdmin) {
      setPage('dashboard')
    }

    setStatus({
      dutyStatus: resStatus?.dutyStatus || 'punched_out',
      punchedAt: resStatus?.punchedAt || null,
      breakStartedAt: resStatus?.breakStartedAt || null,
      oobStartedAt: resStatus?.oobStartedAt || null,
      breaksTaken: resStatus?.breaksTaken || 0,
      breaksRemaining: resStatus?.breaksRemaining ?? 3,
      maxBreaksReached: Boolean(resStatus?.maxBreaksReached),
      isOutOfBounds: Boolean(resStatus?.isOutOfBounds),
    })

    if (resStatus?.isOutOfBounds || resStatus?.podName === 'OUT_OF_BOUNDS') {
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

  const handleAction = async (actionType) => {
    setActionLoading(true)

    if (!navigator.geolocation) {
      addToast('error', 'Geolocation is not supported by your device.')
      setActionLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        try {
          const res = await api.punch(actionType, lat, lng, null)
          if (res?.success) {
            const session = getSession()
            await loadDashboard(session)
          } else {
            addToast('error', res?.error || 'Action failed.')
          }
        } catch (err) {
          addToast('error', err?.message || 'Failed to submit action.')
        } finally {
          setActionLoading(false)
        }
      },
      (geoErr) => {
        console.error('Geolocation error:', geoErr)
        addToast('error', 'Location permission required. Please enable GPS.')
        setActionLoading(false)
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  useEffect(() => {
    if (appState !== APP_STATE.READY || isProcessingExit || !navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const nowTime = Date.now()
        if (nowTime - lastCheckTimeRef.current < 15000) return
        lastCheckTimeRef.current = nowTime

        const currentLat = pos.coords.latitude
        const currentLng = pos.coords.longitude

        try {
          const check = await api.getStatus(currentLat, currentLng)
          
          if (check?.isOutOfBounds || check?.podName === 'OUT_OF_BOUNDS') {
            const firstOobTime = localStorage.getItem('oob_start_time')

            if (!firstOobTime) {
              localStorage.setItem('oob_start_time', nowTime.toString())
              addToast('warning', 'Away from POD area. 30 min auto-logout timer started.')
            } else {
              const durationAway = nowTime - parseInt(firstOobTime, 10)

              if (durationAway >= OUT_OF_BOUNDS_LIMIT_MS) {
                localStorage.removeItem('oob_start_time')
                await triggerAutoPunchOutAndLogout(
                  currentLat, 
                  currentLng, 
                  'Auto-punched out: Away from POD for over 30 minutes.'
                )
              } else {
                const minutesLeft = Math.ceil((OUT_OF_BOUNDS_LIMIT_MS - durationAway) / 60000)
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

  function handleAuthenticated() {
    const session = getSession()
    loadDashboard(session)
  }

  const handleToggleTheme = () => setIsDark((prev) => !prev)
  const isReady = appState === APP_STATE.READY
  const isAdminOrSuper = userRole === 'admin' || userRole === 'superadmin'

  const formatDuration = (totalMinutes = 0) => {
    const minutes = Math.max(0, Math.floor(Number(totalMinutes) || 0))
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    return `${hours}h ${String(remainder).padStart(2, '0')}m`
  }

  const liveActiveMinutes = status?.dutyStatus === 'punched_in' && status?.punchedAt
    ? Math.floor(Math.max(0, now - new Date(status.punchedAt).getTime()) / 60000)
    : 0

  const liveBreakMinutes = status?.dutyStatus === 'on_break' && status?.breakStartedAt
    ? Math.floor(Math.max(0, now - new Date(status.breakStartedAt).getTime()) / 60000)
    : 0

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
          <div style={{ display: page === 'punch' ? 'block' : 'none' }}>
            <PunchScreen
              status={status}
              actionLoading={actionLoading}
              handleAction={handleAction}
              liveActiveMinutes={liveActiveMinutes}
              liveBreakMinutes={liveBreakMinutes}
              formatDuration={formatDuration}
              userEmail={user?.email}
              onLogout={handleSignOut}
              onNavigate={setPage}
            />
          </div>

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
                addToast={addToast}
                onLogout={handleSignOut}
                onNavigate={setPage}
                triggerAutoPunchOutAndLogout={triggerAutoPunchOutAndLogout}
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