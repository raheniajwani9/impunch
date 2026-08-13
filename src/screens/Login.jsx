import { useState, useRef, useEffect } from 'react'
import { GlassCard } from '../components/ui'
import { api, setSession } from '../lib/api'

const AUTH_SUB = { LOGIN_INPUT: 'LOGIN_INPUT', LOADING_AUTH: 'LOADING_AUTH', OTP_SENT: 'OTP_SENT', INVALID_OTP: 'INVALID_OTP' }
const RESEND_SECONDS = 60

export default function Login({ onAuthenticated }) {
  const [sub, setSub] = useState(AUTH_SUB.LOGIN_INPUT)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS)
  const [error, setError] = useState('')
  const otpInputRef = useRef(null)

  useEffect(() => {
    if (sub !== AUTH_SUB.OTP_SENT && sub !== AUTH_SUB.INVALID_OTP) return
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [sub, resendTimer])

  useEffect(() => {
    if (sub === AUTH_SUB.OTP_SENT) otpInputRef.current?.focus()
  }, [sub])

  async function handleSendOtp(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSub(AUTH_SUB.LOADING_AUTH)
    setError('')
    try {
      await api.sendOtp(email.trim())
      setResendTimer(RESEND_SECONDS)
      setSub(AUTH_SUB.OTP_SENT)
    } catch (err) {
      setError(err.message || 'Could not send code. Try again.')
      setSub(AUTH_SUB.LOGIN_INPUT)
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (code.length !== 6) return
    setSub(AUTH_SUB.LOADING_AUTH)
    try {
      const { token, user } = await api.verifyOtp(email.trim(), code)
      setSession({ token, email: user?.email || email })
      onAuthenticated()
    } catch (err) {
      setError(err.message || 'Invalid code. Try again.')
      setSub(AUTH_SUB.INVALID_OTP)
      setCode('')
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    setError('')
    try {
      await api.sendOtp(email.trim())
      setResendTimer(RESEND_SECONDS)
      setSub(AUTH_SUB.OTP_SENT)
    } catch (err) {
      setError(err.message || 'Could not resend code.')
    }
  }

  const isLoading = sub === AUTH_SUB.LOADING_AUTH
  const isOtpStage = sub === AUTH_SUB.OTP_SENT || sub === AUTH_SUB.INVALID_OTP

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 app-bg">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full glass border border-primary-500/30 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#0050FF" strokeWidth="1.6" />
              <path d="M12 12L15.5 8.5" stroke="#0050FF" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="12" cy="12" r="1.4" fill="#0050FF" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ink dark:text-white tracking-tight">IMPunch</h1>
          <p className="eyebrow text-[11px] text-primary-500 mt-1">Field Attendance Instrument</p>
        </div>

        <GlassCard>
          {!isOtpStage ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="eyebrow text-[10px] text-slate-500 mb-2 block">Work Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full tap-target rounded-xl bg-white dark:bg-ink border border-primary-500/20 px-4 text-ink dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-press w-full tap-target rounded-xl bg-primary-500 text-white font-semibold disabled:opacity-70"
              >
                {isLoading ? 'Sending…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  Enter the 6-digit code sent to <span className="text-ink dark:text-white font-medium">{email}</span>
                </p>
                <input
                  ref={otpInputRef}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  disabled={isLoading}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    if (sub === AUTH_SUB.INVALID_OTP) setSub(AUTH_SUB.OTP_SENT)
                  }}
                  className={`w-full tap-target rounded-xl bg-white dark:bg-ink border px-4 text-ink dark:text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 disabled:opacity-50 ${
                    sub === AUTH_SUB.INVALID_OTP ? 'border-red-500 focus:ring-red-500/50 animate-shake' : 'border-primary-500/20 focus:ring-primary-500/50'
                  }`}
                  placeholder="••••••"
                />
                {sub === AUTH_SUB.INVALID_OTP && <p className="text-sm text-red-500 mt-2">{error || 'Invalid code.'}</p>}
              </div>
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="btn-press w-full tap-target rounded-xl bg-primary-500 text-white font-semibold disabled:opacity-50"
              >
                {isLoading ? 'Verifying…' : 'Verify & Sign in'}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0}
                className="w-full text-sm text-slate-500 disabled:opacity-40 tap-target font-mono"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  )
}