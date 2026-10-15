import { useEffect, useState, type FormEvent } from 'react'
import { OWNER_EMAIL } from '../config/supabase-config.ts'
import { cachedUser, onUser, signIn, signOut, type AuthUser } from '../supabase/auth.ts'
import { configMissing, errorCode } from '../supabase/client.ts'
import styles from './Probe.module.css'
import {
  checkLocalStorage,
  readCachedLine,
  saveCachedLine,
  watchProbeLine,
  writeProbeLine,
  type ProbeSource,
  type ProbeTransport,
} from '../supabase/probe.ts'

function clock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function afterPaint(fn: () => void) {
  requestAnimationFrame(() => {
    setTimeout(fn, 0)
  })
}

function transportText(t: ProbeTransport): string {
  if (t.kind === 'connecting') return 'realtime connecting'
  if (t.kind === 'realtime') return 'realtime'
  return `polling every 10s (realtime ${t.status})`
}

interface Live {
  text: string
  source: ProbeSource
  receivedAt: string
}

function liveFromCache(): Live | null {
  const cached = readCachedLine()
  return cached ? { text: cached.text, source: 'cache', receivedAt: cached.receivedAt } : null
}

export function Probe() {
  const [user, setUser] = useState<AuthUser | null>(() => cachedUser())
  const [email, setEmail] = useState(OWNER_EMAIL)
  const [password, setPassword] = useState('')
  const [authNote, setAuthNote] = useState('')
  const [draft, setDraft] = useState('')
  const [lastWrite, setLastWrite] = useState('')
  const [live, setLive] = useState<Live | null>(liveFromCache)
  const [transport, setTransport] = useState<ProbeTransport | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [readError, setReadError] = useState<string | null>(null)
  const [storageError] = useState(() => checkLocalStorage())
  const [online, setOnline] = useState(() => navigator.onLine)
  const [zone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)

  useEffect(() => onUser(setUser), [])

  useEffect(() => {
    if (user) setAuthNote('')
  }, [user])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const uid = user?.id ?? null

  useEffect(() => {
    if (!uid) {
      setTransport(null)
      return
    }
    setReadError(null)
    return watchProbeLine(uid, {
      onValue: (text, source) => {
        const receivedAt = clock(new Date())
        saveCachedLine(text, receivedAt)
        setLive({ text, source, receivedAt })
        setReadError(null)
      },
      onTransport: setTransport,
      onLog: (entry) => {
        const line = `${clock(new Date())} ${entry}`
        console.log('before11 probe realtime', line)
        setLog((prev) => [line, ...prev].slice(0, 5))
      },
      onError: setReadError,
    })
  }, [uid])

  function onSignIn(e: FormEvent) {
    e.preventDefault()
    setAuthNote('Checking…')
    const nextEmail = email
    const nextPassword = password
    afterPaint(() => {
      signIn(nextEmail, nextPassword)
        .then(() => setAuthNote(''))
        .catch((err) => {
          const code = errorCode(err)
          console.log('before11 probe sign-in', code)
          setAuthNote(`Sign-in failed: ${code}`)
        })
    })
  }

  function onWrite(e: FormEvent) {
    e.preventDefault()
    setLastWrite('pending')
    const text = draft
    const writer = uid
    afterPaint(() => {
      if (!writer) {
        setLastWrite('failed: signed-out')
        return
      }
      writeProbeLine(writer, text)
        .then(() => setLastWrite('acknowledged'))
        .catch((err) => {
          const code = errorCode(err)
          console.log('before11 probe write', code)
          setLastWrite(`failed: ${code}`)
        })
    })
  }

  function onReadCache() {
    setLive(liveFromCache())
  }

  function onSignOut() {
    const previous = user
    setUser(null)
    afterPaint(() => {
      signOut().catch((err) => {
        console.log('before11 probe sign-out', errorCode(err))
        setUser(previous)
      })
    })
  }

  return (
    <div className={styles.page}>
      {user ? (
        <p>Auth: signed in as {user.email}</p>
      ) : (
        <form onSubmit={onSignIn}>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
          />
          <button type="submit">Sign in</button>
        </form>
      )}
      {configMissing && !user ? <p>Auth: failed: config-missing</p> : null}
      {authNote ? <p>{authNote}</p> : null}

      <form onSubmit={onWrite}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Line"
        />
        <button type="submit">Write</button>
      </form>
      <p>Last write: {lastWrite}</p>
      <p>Live value: "{live?.text ?? ''}"</p>
      <p>source: {live?.source ?? ''}</p>
      <p>Received at: {live?.receivedAt ?? ''}</p>
      {readError ? <p>Read failed: {readError}</p> : null}
      <p>
        <button type="button" onClick={onReadCache}>
          Read cache
        </button>
      </p>
      <p>Transport: {transport ? transportText(transport) : ''}</p>
      <p>Realtime log:</p>
      {log.map((line, i) => (
        <p key={`${i}-${line}`}>{line}</p>
      ))}
      <p>{storageError ? `Storage: FAILED (${storageError})` : 'Storage: localStorage OK'}</p>
      <p>navigator.onLine: {String(online)}</p>
      <p>{zone}</p>
      <p>
        <button type="button" onClick={onSignOut}>
          Sign out
        </button>
      </p>
    </div>
  )
}
