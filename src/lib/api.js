// lib/api.js
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

function runScript(fnName, ...args) {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler((res) => {
          // If the backend returns null/undefined for status, resolve with default object
          if (res === null || res === undefined) {
            if (fnName === 'getStatus') {
              resolve({ dutyStatus: 'punched_out', punchedAt: null });
            } else {
              resolve({});
            }
          } else if (res && res.error) {
            reject(new Error(res.error));
          } else {
            resolve(res);
          }
        })
        .withFailureHandler((err) => {
          if (fnName === 'getStatus') {
            // Recover gracefully on network/auth failure
            resolve({ dutyStatus: 'punched_out', punchedAt: null });
          } else {
            reject(new Error(err.message || 'Script execution failed.'));
          }
        })[fnName](...args);
    } else {
      reject(new Error('google.script.run is not available.'));
    }
  });
}

export const api = {
  sendOtp: (email) => runScript('sendOtp', email),
  verifyOtp: (email, code) => runScript('verifyOtp', email, code),
  getStatus: () => runScript('getStatus', getSession()?.token || null),
  getRecentLogs: (limit) => runScript('getRecentLogs', getSession()?.token || null, limit),
  punch: (action, lat, lng, geofenceId) =>
    runScript('punch', getSession()?.token || null, action, lat, lng, geofenceId),
}