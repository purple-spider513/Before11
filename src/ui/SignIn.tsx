import { useState, type FormEvent } from 'react'
import { OWNER_EMAIL } from '../config/supabase-config.ts'
import { signIn } from '../supabase/auth.ts'
import { configMissing } from '../supabase/client.ts'
import styles from './SignIn.module.css'

function message(error: unknown): string {
  if (configMissing || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return "Can't reach the sign-in server. Check the Wi-Fi and try again."
  }
  const err = error as { code?: string; status?: number; name?: string }
  if (err.status === 429 || err.code === 'over_request_rate_limit') return 'Too many tries. Wait a minute and try again.'
  if (err.status === 0 || err.name === 'AuthRetryableFetchError') {
    return "Can't reach the sign-in server. Check the Wi-Fi and try again."
  }
  if (err.code === 'invalid_credentials' || err.code) return 'Wrong email or password.'
  return 'Wrong email or password.'
}

export function SignIn() {
  const [email, setEmail] = useState(OWNER_EMAIL)
  const [password, setPassword] = useState('')
  const [note, setNote] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (configMissing) {
      setNote("Can't reach the sign-in server. Check the Wi-Fi and try again.")
      return
    }
    setNote('Checking…')
    const nextEmail = email
    const nextPassword = password
    requestAnimationFrame(() => {
      setTimeout(() => {
        signIn(nextEmail, nextPassword)
          .then(() => setNote(''))
          .catch((error) => setNote(message(error)))
      }, 0)
    })
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <p className={styles.title}>Sign in to Before11</p>
      <input
        className="field"
        type="email"
        autoComplete="username"
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="field"
        type="password"
        autoComplete="current-password"
        aria-label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary" type="submit">
        Sign in
      </button>
      {note ? <p className={styles.note}>{note}</p> : null}
    </form>
  )
}
