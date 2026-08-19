import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import Header from '../components/Header'

const ROLES = ['user', 'admin', 'superadmin']

const ROLE_CLASSES = {
  user: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  superadmin: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
}

function RoleSelectDropdown({ currentRole, onSelectRole, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const activeRole = currentRole?.toLowerCase() || 'user'
  const activeClass = ROLE_CLASSES[activeRole] || ROLE_CLASSES.user

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold transition-all shadow-sm active:scale-95 capitalize ${activeClass} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'
        }`}
      >
        <span>{activeRole}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#181E25] border border-slate-200 dark:border-[#28313D] rounded-xl shadow-lg py-1 z-50">
          {ROLES.map((roleKey) => {
            const isSelected = activeRole === roleKey
            return (
              <button
                key={roleKey}
                onClick={() => {
                  setIsOpen(false)
                  if (!isSelected) onSelectRole(roleKey)
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-semibold capitalize hover:bg-slate-100 dark:hover:bg-[#28313D] transition-colors flex items-center justify-between ${
                  isSelected ? 'text-[#0050FF] dark:text-blue-400 font-bold bg-slate-50 dark:bg-slate-800/50' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{roleKey}</span>
                {isSelected && (
                  <svg className="w-3 h-3 text-[#0050FF] dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard({ user, onLogout, onNavigate, addToast }) {
  const [activeTab, setActiveTab] = useState('logs')
  const isSuperAdmin = user?.role === 'superadmin'
  const isAdmin = isSuperAdmin || user?.role === 'admin'

  const [logs, setLogs] = useState([])
  const [storesMap, setStoresMap] = useState({})
  const [logsLoading, setLogsLoading] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState(null)

  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [isAddingUser, setIsAddingUser] = useState(false)
  
  const [userToRemove, setUserToRemove] = useState(null) // Modal target
  const [removingEmail, setRemovingEmail] = useState(null)

  const fetchLogs = useCallback(async (page = 1) => {
    setLogsLoading(true)
    try {
      const [logsRes, storesRes] = await Promise.allSettled([
        api.getRecentLogs(page, 15),
        api.getStores ? api.getStores() : Promise.resolve([])
      ])

      if (storesRes.status === 'fulfilled' && storesRes.value) {
        const storeData = storesRes.value.stores || storesRes.value || []
        const mapping = {}

        if (Array.isArray(storeData)) {
          storeData.forEach((item) => {
            const rawPodKey =
              item.pod_id ??
              item['POD ID'] ??
              item['Pod ID'] ??
              item.podId ??
              item.podid ??
              item.id

            if (rawPodKey !== undefined && rawPodKey !== null) {
              const podKey = String(rawPodKey).trim()
              const storeName = item.store_name ?? item['Store Name'] ?? item['store name'] ?? item.name ?? ''
              const city = item.city ?? item['City'] ?? item['CITY'] ?? ''

              mapping[podKey] = {
                storeName: String(storeName).trim(),
                city: String(city).trim()
              }
            }
          })
        }
        setStoresMap(mapping)
      }

      if (logsRes.status === 'fulfilled' && logsRes.value) {
        const res = logsRes.value
        setLogs(res?.logs || [])
        setTotalPages(res?.totalPages || 1)
        setLogPage(res?.page || page)
      } else if (logsRes.status === 'rejected') {
        throw logsRes.reason
      }
    } catch (err) {
      addToast('error', err?.message || 'Failed to fetch activity logs.')
    } finally {
      setLogsLoading(false)
    }
  }, [addToast])

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return
    setUsersLoading(true)
    try {
      const res = await api.getAllUsers()
      if (res && res.success === false) {
        addToast('error', res.error || 'Failed to fetch user directory.')
        setUsers([])
        return
      }
      const userList = Array.isArray(res) ? res : (res?.result || res?.users || res?.data || [])
      setUsers(userList)
    } catch (err) {
      addToast('error', err?.message || 'Failed to fetch user directory.')
    } finally {
      setUsersLoading(false)
    }
  }, [isAdmin, addToast])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(logPage)
    } else if (activeTab === 'users' && isAdmin) {
      fetchUsers()
    }
  }, [activeTab, logPage, fetchLogs, fetchUsers, isAdmin])

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!newEmail || !newEmail.includes('@')) {
      addToast('error', 'Please enter a valid email address.')
      return
    }

    setIsAddingUser(true)
    try {
      await api.addUser(newEmail, newRole)
      addToast('success', `User ${newEmail} added successfully!`)
      setNewEmail('')
      setNewRole('user')
      fetchUsers()
    } catch (err) {
      addToast('error', err?.message || 'Failed to add user.')
    } finally {
      setIsAddingUser(false)
    }
  }

  // Opens custom modal
  const promptRemoveUser = (targetEmail) => {
    setUserToRemove(targetEmail)
  }

  const confirmRemoveUser = async () => {
    if (!userToRemove) return
    const targetEmail = userToRemove
    setRemovingEmail(targetEmail)

    try {
      await api.removeUser(targetEmail)
      addToast('success', `User ${targetEmail} removed.`)
      setUsers(prev => prev.filter(u => u.email !== targetEmail))
    } catch (err) {
      addToast('error', err?.message || 'Failed to remove user.')
    } finally {
      setRemovingEmail(null)
      setUserToRemove(null)
    }
  }

  const handleRoleChange = async (targetUser, newRole) => {
    const targetUserId = targetUser.user_id || targetUser.id || targetUser.email
    setUpdatingUserId(targetUserId)

    try {
      await api.updateUserRole(targetUserId, newRole)
      addToast('success', `Role updated to ${newRole}. User session ended.`)
      
      if (targetUser.email === user?.email || targetUserId === user?.user_id) {
        onLogout()
        return
      }

      setUsers(prev => prev.map(u => (u.user_id === targetUserId || u.id === targetUserId) ? { ...u, role: newRole } : u))
    } catch (err) {
      addToast('error', err?.message || 'Failed to update user role.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const getUserIdentifier = (item) => {
    return item.name || item.username || item.user_name || item.email || item.user_id || 'N/A'
  }

  const formatStoreDisplay = (log) => {
    const podKey = String(log.pod_id || log.geofence_id || '').trim()
    const storeInfo = storesMap[podKey]

    if (storeInfo?.storeName) {
      return storeInfo.city 
        ? `${storeInfo.storeName} (${storeInfo.city})` 
        : storeInfo.storeName
    }

    if (log.store_name) {
      return log.city 
        ? `${log.store_name} (${log.city})` 
        : log.store_name
    }

    return podKey || 'OUT_OF_BOUNDS'
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return isNaN(date.getTime())
      ? isoString
      : date.toLocaleString([], {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
  }

  return (
    <div className="min-h-screen bg-[#FDF5EE] dark:bg-[#0E1217] text-slate-900 dark:text-slate-100 transition-colors">
      <Header 
        userEmail={user?.email} 
        onLogout={onLogout} 
        onNavigate={onNavigate} 
      />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="pb-6 border-b border-slate-200 dark:border-[#28313D] mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Admin Console
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isSuperAdmin 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' 
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
            }`}>
              {user?.role || 'Admin'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Signed in as <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>
          </p>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${
                activeTab === 'logs'
                  ? 'border-[#FF5200] text-[#FF5200] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Activity Logs
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === 'users'
                    ? 'border-[#FF5200] text-[#FF5200] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                User Directory & Access
              </button>
            )}
          </div>
        </div>

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Live System Punches
              </h2>
              <button
                onClick={() => fetchLogs(logPage)}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-[#0050FF] text-white font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                Refresh Logs
              </button>
            </div>

            <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#28313D] rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#28313D] text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="p-3.5 font-medium">User / Email</th>
                      <th className="p-3.5 font-medium">POD / Store</th>
                      <th className="p-3.5 font-medium">Punch In Time</th>
                      <th className="p-3.5 font-medium">Punch Out Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {logsLoading ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Loading activity logs...</td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">No logs found.</td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                            {getUserIdentifier(log)}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            {formatStoreDisplay(log)}
                          </td>
                          <td className="p-3.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                            {formatDateTime(log.punch_in_time)}
                          </td>
                          <td className="p-3.5 text-xs text-rose-600 dark:text-rose-400 font-semibold whitespace-nowrap">
                            {log.punch_out_time ? formatDateTime(log.punch_out_time) : 'Active (On Duty)'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-[#28313D] text-sm">
                <button
                  disabled={logPage <= 1 || logsLoading}
                  onClick={() => setLogPage(p => Math.max(p - 1, 1))}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#28313D] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-slate-500 text-xs font-medium">
                  Page {logPage} of {totalPages}
                </span>
                <button
                  disabled={logPage >= totalPages || logsLoading}
                  onClick={() => setLogPage(p => p + 1)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#28313D] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="space-y-6">
            {/* Add User Card */}
            <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#28313D] rounded-xl p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Add Authorized User
              </h2>
              <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="email"
                  placeholder="Enter user email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0E1217] border border-slate-200 dark:border-[#28313D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0050FF]"
                  required
                />
                
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0E1217] border border-slate-200 dark:border-[#28313D] text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  {isSuperAdmin && <option value="superadmin">Superadmin</option>}
                </select>

                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-4 py-2 text-xs font-bold bg-[#FF5200] hover:bg-[#FF5200]/90 text-white rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isAddingUser ? 'Adding...' : '+ Add User'}
                </button>
              </form>
            </div>

            {/* User List Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  User Directory ({users.length})
                </h2>
                <button
                  onClick={fetchUsers}
                  className="text-xs px-3.5 py-1.5 rounded-lg bg-[#0050FF] text-white font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  Refresh Directory
                </button>
              </div>

              <div className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#28313D] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-[#28313D] text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="p-3.5 font-medium">User Name / Email</th>
                        <th className="p-3.5 font-medium">Created At</th>
                        <th className="p-3.5 font-medium">Assigned Role</th>
                        <th className="p-3.5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {usersLoading ? (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">Loading user directory...</td>
                        </tr>
                      ) : !users || users.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-slate-400 font-medium">No users found.</td>
                        </tr>
                      ) : (
                        users.map((u, idx) => {
                          const targetId = u.user_id || u.id || u.email
                          const isSelf = u.email === user?.email
                          const targetRole = String(u.role || 'user').toLowerCase()

                          // Permission rules:
                          // - Cannot remove yourself
                          // - Admins cannot remove other admins or superadmins
                          const canRemove = !isSelf && (isSuperAdmin || (isAdmin && targetRole === 'user'))

                          return (
                            <tr key={targetId || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                                {getUserIdentifier(u)}
                                {isSelf && <span className="ml-2 text-[10px] text-[#0050FF] font-extrabold">(You)</span>}
                              </td>
                              <td className="p-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="p-3.5">
                                <RoleSelectDropdown
                                  currentRole={u.role}
                                  disabled={updatingUserId === targetId || (!isSuperAdmin && u.role === 'superadmin')}
                                  onSelectRole={(newRole) => handleRoleChange(u, newRole)}
                                />
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  disabled={!canRemove || removingEmail === u.email}
                                  onClick={() => promptRemoveUser(u.email)}
                                  className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  {removingEmail === u.email ? 'Removing...' : 'Remove'}
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Custom Dark Confirmation Modal */}
      {userToRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#161B22] border border-[#28313D] rounded-2xl max-w-sm w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-lg">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove User Access</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-200">{userToRemove}</strong>? Their session will be ended immediately.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setUserToRemove(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveUser}
                disabled={removingEmail === userToRemove}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {removingEmail === userToRemove ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}