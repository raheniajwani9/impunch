const SESSION_KEY = 'impunch_session'
const MAX_POD_DISTANCE_KM = 100

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    return null
  }
}

export function setSession(sessionData) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
  } catch (err) {}
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (err) {}
}

async function runBackendFunction(fnName, args = []) {
  if (
    typeof window !== 'undefined' &&
    window.google &&
    window.google.script &&
    window.google.script.run
  ) {
    return new Promise((resolve, reject) => {
      window.google.script.run
        .withSuccessHandler((res) => {
          if (res && res.success === false) {
            reject(new Error(res.error || 'Request failed on backend.'))
          } else {
            resolve(res)
          }
        })
        .withFailureHandler((err) => {
          reject(new Error(err?.message || err || 'Google Apps Script call failed.'))
        })
        [fnName](...args)
    })
  }

  const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL || ''
  if (!scriptUrl) {
    throw new Error('Apps Script Web App URL is not defined in environment variables.')
  }

  const url = `${scriptUrl}?fn=${encodeURIComponent(fnName)}&args=${encodeURIComponent(
    JSON.stringify(args)
  )}`

  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: Failed to reach backend API.`)
  }

  const data = await response.json()
  if (data && data.success === false) {
    throw new Error(data.error || 'API execution failed.')
  }

  return data
}

export const api = {
  async sendOtp(email) {
    return await runBackendFunction('sendOtp', [email])
  },

  async verifyOtp(email, code) {
    const res = await runBackendFunction('verifyOtp', [email, code])
    if (res && res.token) {
      const extractedRole = res.user?.role || res.role || 'user'
      setSession({
        token: res.token,
        email: res.user?.email || email,
        role: extractedRole,
        user: res.user || { email, role: extractedRole },
      })
    }
    return res
  },

  async getAllUsers() {
  const session = getSession()
  try {
    const res = await runBackendFunction('getAllUsers', [session?.token])
    console.log('Raw response from getAllUsers:', res)
    
    if (Array.isArray(res)) return res
    if (res && Array.isArray(res.result)) return res.result
    if (res && Array.isArray(res.users)) return res.users
    if (res && Array.isArray(res.data)) return res.data
    
    return []
  } catch (err) {
    console.error('getAllUsers API Error:', err)
    throw err
  }
},

  async updateUserRole(targetUserId, newRole) {
    const session = getSession()
    return await runBackendFunction('updateUserRole', [
      session?.token,
      targetUserId,
      newRole,
    ])
  },

  async getStores() {
    try {
      const res = await runBackendFunction('getStores', [])
      
      if (res && res.stores && Array.isArray(res.stores)) {
        return res.stores
      }
      if (Array.isArray(res)) {
        return res
      }
      return []
    } catch (err) {
      console.error('getStores API Error:', err)
      return []
    }
  },

  async getStatus(lat = null, lng = null) {
    const session = getSession()
    const token = session?.token || ''

    try {
      const res = await runBackendFunction('getStatus', [token, lat, lng])
      return {
        success: res?.success !== false,
        role: res?.role || res?.user?.role || null,
        dutyStatus: res?.dutyStatus || 'punched_out',
        punchedAt: res?.punchedAt || null,
        podName: res?.podName || res?.geofenceId || null,
        podLat: res?.podLat || res?.geofenceLat || null,
        podLng: res?.podLng || res?.geofenceLng || null,
        isOutOfBounds:
          res?.isOutOfBounds || res?.is_violation || res?.podName === 'OUT_OF_BOUNDS',
      }
    } catch (err) {
      console.warn('getStatus API error:', err)
      throw err
    }
  },

  async getRecentLogs(page = 1, pageSize = 10) {
    const session = getSession()
    const token = session?.token || ''

    try {
      const res = await runBackendFunction('getRecentLogs', [
        token,
        page,
        pageSize,
      ])
      if (res && typeof res === 'object') {
        return {
          success: res.success !== false,
          logs: res.logs || (Array.isArray(res) ? res : []),
          totalPages: res.totalPages || 1,
          totalRecords: res.totalRecords || 0,
          currentPage: res.currentPage || page,
        }
      }
      return {
        success: true,
        logs: [],
        totalPages: 1,
        totalRecords: 0,
        currentPage: page,
      }
    } catch (err) {
      console.error('getRecentLogs API error:', err)
      throw err
    }
  },

  async punch(action, lat, lng, requestedGeofenceId = null) {
    const session = getSession()
    const token = session?.token || ''

    if (!token) {
      throw new Error('Session expired. Please log in again.')
    }

    if (action === 'punch_in' || action === 'IN') {
      const status = await this.getStatus(lat, lng)

      if (status.isOutOfBounds || status.podName === 'OUT_OF_BOUNDS') {
        throw new Error('You are not at POD location or near to POD.')
      }
    }

    return await runBackendFunction('punch', [
      token,
      action,
      lat,
      lng,
      requestedGeofenceId,
    ])
  },
}