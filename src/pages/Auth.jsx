import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, ArrowRight, Sparkles, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

// Three modes: 'login' | 'signup' | 'magic'
export default function Auth() {
  const [mode,     setMode]     = useState('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [notice,   setNotice]   = useState(null) // { type: 'success'|'error', text }

  const notify = (type, text) => setNotice({ type, text })
  const clearNotice = () => setNotice(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) { notify('error', 'L\'adresse e-mail est requise.'); return }
    setLoading(true)
    clearNotice()

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin + '/dashboard' },
        })
        if (error) throw error
        notify('success', `Lien envoyé à ${email} ! Vérifiez votre boîte mail.`)
        setEmail('')
      } else if (mode === 'login') {
        if (!password) { notify('error', 'Le mot de passe est requis.'); setLoading(false); return }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        // Redirect handled by App.jsx auth state listener
      } else {
        // signup
        if (!password) { notify('error', 'Choisissez un mot de passe.'); setLoading(false); return }
        if (password.length < 6) { notify('error', 'Le mot de passe doit faire au moins 6 caractères.'); setLoading(false); return }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + '/dashboard' },
        })
        if (error) throw error
        notify('success', 'Compte créé ! Vérifiez votre e-mail pour confirmer votre inscription.')
      }
    } catch (err) {
      const msg = err.message || 'Une erreur est survenue.'
      if (msg.includes('Invalid login')) notify('error', 'E-mail ou mot de passe incorrect.')
      else if (msg.includes('already registered')) notify('error', 'Cet e-mail est déjà utilisé. Connectez-vous.')
      else notify('error', msg)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m) => { setMode(m); clearNotice(); setPassword('') }

  return (
    <div className="auth-page">
      {/* Logo */}
      <div className="auth-logo">
        <div className="sidebar-logo-icon" style={{ width: 44, height: 44, fontSize: 18 }}>Fx</div>
        <span className="sidebar-logo-text" style={{ fontSize: 24 }}>Finox</span>
      </div>

      <div className="auth-card">
        <div className="auth-card-header">
          <h1 className="auth-title">
            {mode === 'login'  && 'Connexion'}
            {mode === 'signup' && 'Créer un compte'}
            {mode === 'magic'  && 'Lien magique'}
          </h1>
          <p className="auth-sub">
            {mode === 'login'  && 'Bienvenue, connectez-vous à votre espace Finox.'}
            {mode === 'signup' && 'Créez votre compte pour accéder à Finox.'}
            {mode === 'magic'  && 'Recevez un lien de connexion par e-mail, sans mot de passe.'}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab${mode === 'login'  ? ' active' : ''}`} onClick={() => switchMode('login')}>
            Connexion
          </button>
          <button className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => switchMode('signup')}>
            Inscription
          </button>
          <button className={`auth-tab${mode === 'magic'  ? ' active' : ''}`} onClick={() => switchMode('magic')}>
            <Sparkles size={12} /> Lien magique
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div className={notice.type === 'success' ? 'success-notice' : 'api-key-notice'} style={{ marginBottom: 16 }}>
            {notice.type === 'success'
              ? <CheckCircle size={16} color="var(--green)" />
              : <AlertCircle size={16} />}
            <p>{notice.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" htmlFor="auth-email">Adresse e-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="auth-email"
                className="form-input"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                style={{ paddingLeft: 38 }}
                required
              />
            </div>
          </div>

          {/* Password (not for magic link) */}
          {mode !== 'magic' && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" htmlFor="auth-password">
                Mot de passe
                {mode === 'signup' && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (6 caractères min.)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="auth-password"
                  className="form-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{ paddingLeft: 38, paddingRight: 44 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 15 }}
          >
            {loading ? 'Chargement…' : (
              <>
                {mode === 'login'  && <><ArrowRight size={16} /> Se connecter</>}
                {mode === 'signup' && <><ArrowRight size={16} /> Créer le compte</>}
                {mode === 'magic'  && <><Mail size={16} /> Envoyer le lien</>}
              </>
            )}
          </button>
        </form>
      </div>

      <p className="auth-footer">
        Vos données sont stockées de façon privée et sécurisée sur Supabase.
      </p>
    </div>
  )
}
