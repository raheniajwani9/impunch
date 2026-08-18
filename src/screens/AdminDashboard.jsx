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

  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState(null)

  const fetchLogs = useCallback(async (page = 1) => {
    setLogsLoading(true)
    try {
      const res = await api.getRecentLogs(page, 15)
      setLogs(res?.logs || [])
      setTotalPages(res?.totalPages || 1)
      setLogPage(res?.page || 1)
    } catch (err) {
      addToast('error', err?.message || 'Failed to fetch activity logs.')
    } finally {
      setLogsLoading(false)
    }
  }, [addToast])

  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) return
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
  }, [isSuperAdmin, addToast])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(logPage)
    } else if (activeTab === 'users' && isSuperAdmin) {
      fetchUsers()
    }
  }, [activeTab, logPage, fetchLogs, fetchUsers, isSuperAdmin])

  const handleRoleChange = async (targetUser, newRole) => {
    const targetUserId = targetUser.user_id || targetUser.id || targetUser.email
    setUpdatingUserId(targetUserId)

    try {
      await api.updateUserRole(targetUserId, newRole)
      addToast('success', `Role updated to ${newRole}. User session ended.`)
      
      // If superadmin modified their own role, trigger logout immediately
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

  // Safe helper to format ISO date strings into local date and time
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

            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === 'users'
                    ? 'border-[#FF5200] text-[#FF5200] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                User Roles Management
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Live System Activity Logs */}
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
                          <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                            {log.store_name || log.pod_id || log.geofence_id || 'OUT_OF_BOUNDS'}
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

              {/* Pagination */}
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

        {/* TAB 2: User Directory & Roles */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                User Directory & Role Control
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {usersLoading ? (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-slate-400 font-medium">Loading user directory...</td>
                      </tr>
                    ) : !users || users.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-8 text-center text-slate-400 font-medium">No users found.</td>
                      </tr>
                    ) : (
                      users.map((u, idx) => {
                        const targetId = u.user_id || u.id || u.email
                        return (
                          <tr key={targetId || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5 font-bold text-slate-900 dark:text-slate-100">{getUserIdentifier(u)}</td>
                            <td className="p-3.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-3.5">
                              <RoleSelectDropdown
                                currentRole={u.role}
                                disabled={updatingUserId === targetId}
                                onSelectRole={(newRole) => handleRoleChange(u, newRole)}
                              />
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
        )}
      </main>
    </div>
  )
}