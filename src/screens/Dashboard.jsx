import { useState, useRef } from 'react'
import { GlassCard, SkeletonBox } from '../components/ui'
import { LocationDeniedModal, GeofenceViolationScreen } from '../components/ErrorScreens'
import PunchGauge from '../components/PunchGauge'
import { api } from '../lib/api'

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen px-6 pt-10 pb-28 app-bg">
      <div className="max-w-sm mx-auto space-y-4">
        <SkeletonBox className="h-4 w-28" />
        <GlassCard className="flex flex-col items-center py-10">
          <SkeletonBox className="h-48 w-48 rounded-full mb-4" />
          <SkeletonBox className="h-3 w-20" />
        </GlassCard>
      </div>
    </div>
  )
}

const DUTY = { PUNCHED_OUT: 'PUNCHED_OUT', PUNCHING_IN: 'PUNCHING_IN', PUNCHED_IN: 'PUNCHED_IN' }
const MAX_GPS_RETRIES = 3

export default function Dashboard({ user, initialDutyStatus, initialPunchedAt, addToast }) {
  const [duty, setDuty] = useState(initialDutyStatus === 'punched_in' ? DUTY.PUNCHED_IN : DUTY.PUNCHED_OUT)
  const [punchedAt, setPunchedAt] = useState(initialPunchedAt || null)
  const [showLocationDenied, setShowLocationDenied] = useState(false)
  const [showViolation, setShowViolation] = useState(false)
  const retriesRef = useRef(0)
  const restingDuty = initialDutyStatus === 'punched_in' ? DUTY.PUNCHED_IN : DUTY.PUNCHED_OUT

  function attemptGeolocation(onSuccess) {
    if (!navigator.geolocation) {
      addToast('error', 'Geolocation is not supported on this device.')
      setDuty(restingDuty)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        retriesRef.current = 0
        onSuccess(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setShowLocationDenied(true)
          setDuty(restingDuty)
          return
        }
        if (retriesRef.current < MAX_GPS_RETRIES) {
          retriesRef.current += 1
          addToast('offline', 'GPS signal weak. Move near a window.')
          setTimeout(() => attemptGeolocation(onSuccess), 1500)
        } else {
          retriesRef.current = 0
          addToast('error', 'Could not get a GPS lock. Try again in a moment.')
          setDuty(restingDuty)
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  async function handlePunch() {
    const action = duty === DUTY.PUNCHED_IN ? 'punch_out' : 'punch_in'
    setDuty(DUTY.PUNCHING_IN)

    if (!navigator.onLine) {
      queueOfflinePunch(action)
      addToast('offline', 'Punch Queued. Will sync when signal returns.')
      setDuty(action === 'punch_in' ? DUTY.PUNCHED_IN : DUTY.PUNCHED_OUT)
      setPunchedAt(action === 'punch_in' ? new Date() : null)
      return
    }

    attemptGeolocation(async (lat, lng) => {
      try {
        const result = await api.punch(action, lat, lng, null)
        setDuty(action === 'punch_in' ? DUTY.PUNCHED_IN : DUTY.PUNCHED_OUT)
        setPunchedAt(action === 'punch_in' ? new Date() : null)
        if (result.is_violation) {
          setShowViolation(true)
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        }
      } catch (err) {
        addToast('error', err.message || 'Punch failed. Try again.')
        setDuty(restingDuty)
      }
    })
  }

  const isPunchingIn = duty === DUTY.PUNCHING_IN
  const isOn = duty === DUTY.PUNCHED_IN
  const gaugeState = isPunchingIn ? 'locating' : isOn ? 'on' : 'off'

  return (
    <div className="min-h-screen px-6 pt-10 pb-28 app-bg">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="eyebrow text-[10px] text-primary-500">Signed in</p>
            <p className="text-ink dark:text-white font-medium text-sm">{user?.email}</p>
          </div>
        </div>

        <GlassCard className="flex flex-col items-center py-10">
          <p className="eyebrow text-[11px] text-slate-500">
            {isOn ? 'Active Duty' : isPunchingIn ? 'Locating' : 'Off Duty'}
          </p>
          <div className="mt-6">
            <PunchGauge state={gaugeState} onPress={handlePunch} label={isOn ? 'Punch Out' : 'Punch In'} />
          </div>

          {isOn && punchedAt && (
            <p className="font-mono text-xs text-slate-500 mt-5 tracking-wide">
              SINCE {new Date(punchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </GlassCard>
      </div>

      {showLocationDenied && <LocationDeniedModal onDismiss={() => setShowLocationDenied(false)} />}
      {showViolation && <GeofenceViolationScreen onDismiss={() => setShowViolation(false)} />}
    </div>
  )
}

const OFFLINE_QUEUE_KEY = 'impunch_offline_queue'

function queueOfflinePunch(action) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]')
  queue.push({ action, queuedAt: new Date().toISOString() })
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export async function flushOfflineQueue(addToast) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]')
  if (!queue.length) return
  let synced = 0
  for (const item of queue) {
    try {
      await api.punch(item.action, null, null, null)
      synced++
    } catch {
    }
  }
  if (synced > 0) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(synced)))
    addToast('sync', `${synced} Offline Punch${synced > 1 ? 'es' : ''} synced successfully.`)
  }
}