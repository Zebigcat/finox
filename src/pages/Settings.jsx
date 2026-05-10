import { useState } from 'react'
import { Save, Eye, EyeOff, CheckCircle, ExternalLink, LogOut, User } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'

export default function Settings() {
  const { apiKey, setApiKey, user, signOut } = useFinance()
  const [localKey, setLocalKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setApiKey(localKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Configuration de l'application</p>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: 520 }}>
          {/* Account section */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">Compte</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'var(--accent-glow)', border: '1px solid rgba(124,111,205,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <User size={20} color="var(--accent-light)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connecté via Supabase</div>
              </div>
              <button className="btn btn-secondary" onClick={signOut} style={{ flexShrink: 0, color: 'var(--red)', borderColor: 'rgba(248,113,113,0.3)' }}>
                <LogOut size={14} /> Déconnexion
              </button>
            </div>
          </div>

          {/* API Key section */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
              <span className="card-title">Clé API Anthropic</span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
              L'agent IA Finox utilise l'API Anthropic (Claude). Votre clé est stockée localement
              dans votre navigateur et n'est jamais envoyée à un serveur tiers.
            </p>

            {saved && (
              <div className="success-notice" style={{ marginBottom: 16 }}>
                <CheckCircle size={16} />
                Clé API sauvegardée avec succès !
              </div>
            )}

            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">Clé API</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-ant-api03-…"
                    value={localKey}
                    onChange={e => setLocalKey(e.target.value)}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    onClick={() => setShowKey(v => !v)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="form-hint">
                  Obtenez votre clé sur{' '}
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}
                  >
                    console.anthropic.com
                    <ExternalLink size={11} style={{ display: 'inline', marginLeft: 3 }} />
                  </a>
                </span>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!localKey.trim()}
              >
                <Save size={16} /> Sauvegarder
              </button>
            </div>
          </div>

          {/* Info card */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">À propos de Finox</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <p style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Finox</strong> est une application
                de gestion de finances personnelles qui fonctionne entièrement dans votre navigateur.
              </p>
              <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>Toutes vos données sont stockées localement (localStorage)</li>
                <li>Aucune donnée n'est envoyée à un serveur (sauf à l'API Anthropic)</li>
                <li>Compatible avec les exports CSV Sumeria / Orange Bank</li>
                <li>Catégorisation automatique des transactions</li>
              </ul>
            </div>
            <div style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--text-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Finox v1.0.0</span>
              <span>Powered by Claude (Anthropic)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
