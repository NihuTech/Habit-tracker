import { useState, useRef } from 'react'
import './auth.css'
import { authLogin, authSignup } from './api'
import type { SessionUser } from './api'

// ── helpers ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(raw: string): string {
  const v = raw.trim().toLowerCase()
  if (!v) return 'Email is required.'
  if (v.length > 254) return 'Email must be 254 characters or fewer.'
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address.'
  // reject "a@b" (no dot after @) and "a@b." (trailing dot)
  const domain = v.split('@')[1]
  if (!domain.includes('.') || domain.endsWith('.')) return 'Enter a valid email address.'
  return ''
}

function validatePassword(pw: string, isSignup: boolean): string {
  if (!pw) return 'Password is required.'
  if (isSignup && pw.length < 8) return 'Use at least 8 characters.'
  return ''
}

function validateName(name: string): string {
  if (!name.trim()) return 'Name is required.'
  return ''
}

// ── eye icon SVGs (inline, no dependency) ────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

// ── props ─────────────────────────────────────────────────────────────────────

interface AuthPageProps {
  onAuthenticated: (user: SessionUser, token: string) => void
}

// ── component ─────────────────────────────────────────────────────────────────

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const isSignup = mode === 'signup'

  // field values
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // field errors (shown after blur or submit)
  const [nameErr, setNameErr] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [pwErr, setPwErr] = useState('')

  // touched flags (to show inline errors only after user has visited the field)
  const [nameTouched, setNameTouched] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [pwTouched, setPwTouched] = useState(false)

  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  // keep a ref so we can focus the first errored field on submit
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  function switchMode(next: 'login' | 'signup') {
    setMode(next)
    setNameErr(''); setEmailErr(''); setPwErr('')
    setNameTouched(false); setEmailTouched(false); setPwTouched(false)
    setServerError('')
  }

  // live validation on blur
  function onNameBlur() {
    setNameTouched(true)
    setNameErr(validateName(name))
  }
  function onEmailBlur() {
    setEmailTouched(true)
    setEmailErr(validateEmail(email))
  }
  function onPwBlur() {
    setPwTouched(true)
    setPwErr(validatePassword(password, isSignup))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')

    // force-validate all fields
    const ne = isSignup ? validateName(name) : ''
    const ee = validateEmail(email)
    const pe = validatePassword(password, isSignup)

    setNameTouched(true); setNameErr(ne)
    setEmailTouched(true); setEmailErr(ee)
    setPwTouched(true); setPwErr(pe)

    if (ne || ee || pe) {
      // focus first errored field
      if (ne) nameRef.current?.focus()
      else if (ee) emailRef.current?.focus()
      else pwRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      let result: { token: string; user: SessionUser }

      if (isSignup) {
        result = await authSignup({ name: name.trim(), email: cleanEmail, password })
      } else {
        result = await authLogin({ email: cleanEmail, password })
      }

      onAuthenticated(result.user, result.token)
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Something went wrong.'
      if (msg.includes('already exists') || msg.includes('409') || msg.includes('Conflict')) {
        setServerError('An account with this email already exists.')
      } else if (
        msg.includes('Invalid email or password') ||
        msg.includes('401') ||
        msg.includes('Unauthorized')
      ) {
        setServerError('Incorrect email or password.')
      } else if (msg.toLowerCase().includes('reach') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch')) {
        setServerError("Can't reach the server. Please check your connection.")
      } else {
        setServerError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true">HT</div>
          <h1>Habit Tracker</h1>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            type="button"
            aria-selected={mode === 'login'}
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log in
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={mode === 'signup'}
            className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
          {isSignup && (
            <div className="auth-field">
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                ref={nameRef}
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameTouched) setNameErr(validateName(e.target.value)) }}
                onBlur={onNameBlur}
                className={nameTouched && nameErr ? 'input-error' : ''}
                placeholder="Your name"
              />
              {nameTouched && nameErr ? (
                <span className="auth-field-error" role="alert">{nameErr}</span>
              ) : null}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <div className="auth-input-wrap">
              <input
                id="auth-email"
                ref={emailRef}
                type="email"
                autoComplete={isSignup ? 'email' : 'username'}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailTouched) setEmailErr(validateEmail(e.target.value)) }}
                onBlur={onEmailBlur}
                className={emailTouched && emailErr ? 'input-error' : ''}
                placeholder="you@example.com"
              />
            </div>
            {emailTouched && emailErr ? (
              <span className="auth-field-error" role="alert">{emailErr}</span>
            ) : null}
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="auth-password"
                ref={pwRef}
                type={showPw ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (pwTouched) setPwErr(validatePassword(e.target.value, isSignup)) }}
                onBlur={onPwBlur}
                className={pwTouched && pwErr ? 'input-error' : ''}
                placeholder={isSignup ? 'At least 8 characters' : ''}
              />
              <button
                type="button"
                className="auth-toggle-pw"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {pwTouched && pwErr ? (
              <span className="auth-field-error" role="alert">{pwErr}</span>
            ) : null}
          </div>

          {serverError ? (
            <div className="auth-server-error" role="alert">{serverError}</div>
          ) : null}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? (isSignup ? 'Creating account…' : 'Logging in…') : (isSignup ? 'Create account' : 'Log in')}
          </button>
        </form>
      </div>
    </div>
  )
}
