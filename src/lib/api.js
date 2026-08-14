const SESSION_KEY = 'impunch_session'
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    console.error('Failed to parse session:', err)
    return null
  }
}

export function setSession(sessionData) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
  } catch (err) {
    console.error('Failed to save session:', err)
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (err) {
    console.error('Failed to clear session:', err)
  }
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

  const response = await fetch(url)
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
      setSession({
        token: res.token,
        email: res.user?.email || email,
        user: res.user || { email },
      })
    }
    return res
  },

  async getStatus() {
    const session = getSession()
    const token = session?.token || ''
    
    try {
      const res = await runBackendFunction('getStatus', [token])
      return {
        dutyStatus: res?.dutyStatus || 'punched_out',
        punchedAt: res?.punchedAt || null,
      }
    } catch (err) {
      console.warn('getStatus API error:', err)
      return { dutyStatus: 'punched_out', punchedAt: null }
    }
  },

  async getRecentLogs(limit = 50) {
    const session = getSession()
    const token = session?.token || ''

    try {
      const res = await runBackendFunction('getRecentLogs', [token, limit])
      console.log('getRecentLogs response:', res)

      if (Array.isArray(res)) return res
      if (res && Array.isArray(res.logs)) return res.logs
      if (res && typeof res === 'object') {
        const foundArray = Object.values(res).find((v) => Array.isArray(v))
        if (foundArray) return foundArray
      }
      return []
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

    return await runBackendFunction('punch', [
      token,
      action,
      lat,
      lng,
      requestedGeofenceId,
    ])
  },
}