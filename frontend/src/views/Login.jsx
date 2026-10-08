import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { askAddDeviceData } from '../sheets.jsx'

export default function Login() {
  const { setUser, adoptProfile, setGuest, loadConfig } = useStore()
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const setup = !!config?.setup
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  useEffect(() => { loadConfig() }, [loadConfig])
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  const go = async () => {
    if (!login.trim() || !password) { useUI.getState().toast(t('Enter your login and password')); return }
    setBusy(true)
    try {
      const path = setup ? '/api/password/setup' : '/api/password/login'
      const body = { login: login.trim(), password, ...(setup ? { name: name.trim() } : {}) }
      const data = await api(path, { method: 'POST', body: JSON.stringify(body) })
      setUser(data.user)
      await adoptProfile(askAddDeviceData)
      useUI.getState().toast(setup ? t('Welcome, {0}', data.user.name) : t('Welcome back, {0}', data.user.name))
    } catch (e) { useUI.getState().toast(e.message || t('Sign-in failed')) }
    finally { setBusy(false) }
  }
  const head = <>
    <div style={{ fontSize: 54, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="dumbbell" /></div>
    <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.028em', margin: '10px 0 4px' }}>openGym</h1>
  </>
  const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '78vh', textAlign: 'center' }

  // Demo build: no backend to sign in against — the only way in is the local guest profile.
  if (DEMO) return (
    <div className="narrow" style={wrap}>
      {head}
      <div className="muted" style={{ marginBottom: 30 }}>{t('Live demo — everything stays in this browser.')}</div>
      <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
      <div className="card small muted" style={{ textAlign: 'left', marginTop: 16 }}>
        {t('This demo runs entirely in your browser on example data — nothing is sent anywhere. Passkey sign-in and sync across your devices come with the openGym server, which you get by self-hosting it.')}
      </div>
      <div className="dim small" style={{ marginTop: 22, lineHeight: 1.6 }}>
        <a href={REPO} target="_blank" rel="noopener">{t('Self-host it in a minute →')}</a>
      </div>
    </div>
  )

  return (
    <div className="narrow" style={wrap}>
      {head}
      <div className="muted" style={{ marginBottom: 34 }}>{t('Your workouts. Your weights. Your profile.')}</div>
      <div className="muted small" style={{ marginBottom: 16, textAlign: 'left' }}>{setup
        ? t('You are the first person here. This account is the admin and can add everyone else.')
        : t('Sign in with the login and password your admin gave you.')}</div>
      {setup && <input className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 10, textAlign: 'left' }} />}
      <input ref={ref} className="input" placeholder={t('Login')} maxLength={32} value={login} autoCapitalize="none" autoCorrect="off"
        onChange={e => setLogin(e.target.value)} style={{ textAlign: 'left' }} />
      <div style={{ height: 10 }} />
      <input className="input" type="password" placeholder={t('Password')} value={password} autoCapitalize="none"
        onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go() }} style={{ textAlign: 'left' }} />
      <div style={{ height: 12 }} />
      <Button variant="primary" icon="person" onClick={go} disabled={busy}>{busy ? t('Signing in…') : setup ? t('Create admin') : t('Sign in')}</Button>
      {canGuest && <div style={{ height: 10 }} />}
      {canGuest && <Button variant="ghost" className="dim" onClick={() => setGuest(true)}>{t('Continue without account')}</Button>}
      <div className="dim small" style={{ marginTop: 26, lineHeight: 1.5 }}>{t('Each profile keeps its own plan, workouts & body weight.')}</div>
    </div>
  )
}
