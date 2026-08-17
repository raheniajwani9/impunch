import { useState, useRef, useEffect } from 'react'
import { GlassCard } from '../components/ui'
import { api, setSession } from '../lib/api'

const AUTH_SUB = {
  LOGIN_INPUT: 'LOGIN_INPUT',
  LOADING_AUTH: 'LOADING_AUTH',
  OTP_SENT: 'OTP_SENT',
  INVALID_OTP: 'INVALID_OTP',
}
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
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return
    
    const allowedDomainRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?(swiggy\.in|scootsy\.com|swiggyimnet\.in)$/

    if (!allowedDomainRegex.test(cleanEmail)) {
      setError('Only Swiggy, Scootsy, or Swiggyimnet email IDs are allowed.')
      return
    }

    setSub(AUTH_SUB.LOADING_AUTH)
    setError('')
    try {
      await api.sendOtp(cleanEmail)
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
    <div className="min-h-screen w-full flex items-center justify-center px-6 bg-[#FDF5EE] dark:bg-[#0E1217] transition-colors">
      <div className="w-full max-w-sm">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0050FF] text-white font-black text-xl shadow-lg shadow-[#0050FF]/25 mb-3">
            IM
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            INSTAMART <span className="text-[#FF5200]">PUNCH</span>
          </h1>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0050FF] mt-1">
            Field Attendance Instrument
          </p>
        </div>

        <GlassCard>
          {!isOtpStage ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@swiggy.in"
                  className="w-full h-12 rounded-xl bg-white dark:bg-[#181E25] border border-slate-200 dark:border-[#28313D] px-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0050FF] focus:border-transparent transition text-sm disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-[#0050FF] hover:bg-[#0042D9] active:scale-95 text-white font-black text-sm tracking-wide shadow-md shadow-[#0050FF]/20 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                  Enter the 6-digit code sent to <br />
                  <span className="text-slate-900 dark:text-white font-bold">{email}</span>
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
                  className={`w-full h-14 rounded-xl bg-white dark:bg-[#181E25] border px-4 text-slate-900 dark:text-white text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 disabled:opacity-50 transition ${
                    sub === AUTH_SUB.INVALID_OTP
                      ? 'border-red-500 focus:ring-red-500/50 animate-shake'
                      : 'border-slate-200 dark:border-[#28313D] focus:ring-[#0050FF]'
                  }`}
                  placeholder="••••••"
                />
                {sub === AUTH_SUB.INVALID_OTP && (
                  <p className="text-xs text-red-500 font-semibold mt-2">{error || 'Invalid verification code.'}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="w-full h-12 rounded-xl bg-[#0050FF] hover:bg-[#0042D9] active:scale-95 text-white font-black text-sm tracking-wide shadow-md shadow-[#0050FF]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying…' : 'Verify & Sign in'}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0}
                className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-[#0050FF] disabled:opacity-50 font-mono font-medium py-1 transition"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
              </button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  )
}