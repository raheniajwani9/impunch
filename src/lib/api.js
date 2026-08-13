const SESSION_KEY = 'impunch_session'

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}
export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL

function runScript(fnName, ...args) {
  const url = `${API_URL}?fn=${encodeURIComponent(fnName)}&args=${encodeURIComponent(JSON.stringify(args))}`

  return fetch(url)
    .then((res) => res.text())
    .then((text) => {
      if (text.trim().startsWith('<')) {
        throw new Error(
          'Server returned a webpage instead of data — the Apps Script deployment likely ' +
          'needs a new version deployed, or API_URL is wrong.'
        )
      }
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('Server returned invalid data.')
      }
      if (!data) throw new Error('Server returned an empty response. Try again.')
      if (!data.success) throw new Error(data.error || 'Request failed')
      return data
    })
    .catch((err) => {
      throw err instanceof Error ? err : new Error('Network error')
    })
}

export const api = {
  sendOtp: (email) => runScript('sendOtp', email),
  verifyOtp: (email, code) => runScript('verifyOtp', email, code),
  getStatus: () => runScript('getStatus', getSession()?.token || null),
  getRecentLogs: (limit) => runScript('getRecentLogs', getSession()?.token || null, limit),
  punch: (action, lat, lng, geofenceId) =>
    runScript('punch', getSession()?.token || null, action, lat, lng, geofenceId),
}