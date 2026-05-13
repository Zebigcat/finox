import { useState } from 'react'
import { Save, Eye, EyeOff, CheckCircle, ExternalLink, LogOut, User, Plus, Trash2 } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'

export default function Settings() {
  const { apiKey, setApiKey, user, signOut, referenceBalance, setReferenceBalance, customCategories, addCategory, deleteCategory } = useFinance()

  const [newCatName,  setNewCatName]  = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('')
  const [catError,    setCatError]    = useState('')

  const handleAddCategory = () => {
    const name = newCatName.trim()
    if (!name) { setCatError('Le nom est requis.'); return }
    if (name.length > 30) { setCatError('30 caractères max.'); return }
    addCategory({ name, emoji: newCatEmoji.trim() || '📦' })
    setNewCatName('')
    setNewCatEmoji('')
    setCatError('')
  }
  const [localKey, setLocalKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const [refAmount, setRefAmount] = useState(referenceBalance.amount)
  const [refDate,   setRefDate]   = useState(referenceBalance.date)
  const [refSaved,  setRefSaved]  = useState(false)

  const handleSave = () => {
    setApiKey(localKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSaveRef = () => {
    const amount = parseFloat(refAmount)
    if (isNaN(amount) || !refDate) return
    setReferenceBalance({ amount, date: refDate })
    setRefSaved(true)
    setTimeout(() => setRefSaved(false), 3000)
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

          {/* Reference balance section */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
              <span className="card-title">Solde de référence</span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
              Définissez un solde connu à une date précise. Finox calculera votre solde réel en ajoutant
              toutes les transactions postérieures à cette date.
            </p>

            {refSaved && (
              <div className="success-notice" style={{ marginBottom: 16 }}>
                <CheckCircle size={16} />
                Solde de référence mis à jour !
              </div>
            )}

            <div className="settings-form">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 140px' }}>
                  <label className="form-label">Montant (€)</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    value={refAmount}
                    onChange={e => setRefAmount(e.target.value)}
                    placeholder="2.00"
                  />
                </div>
                <div className="form-group" style={{ flex: '1 1 160px' }}>
                  <label className="form-label">Date de référence</label>
                  <input
                    className="form-input"
                    type="date"
                    value={refDate}
                    onChange={e => setRefDate(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSaveRef}
                disabled={!refDate || refAmount === ''}
              >
                <Save size={16} /> Sauvegarder
              </button>
            </div>
          </div>

          {/* Custom categories section */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <span className="card-title">Catégories personnalisées</span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
              Ajoutez vos propres catégories. Elles seront disponibles lors de l'ajout ou la modification d'une transaction.
            </p>

            {customCategories.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {customCategories.map(({ name, emoji }) => (
                  <div
                    key={name}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '5px 10px', fontSize: 13,
                    }}
                  >
                    <span>{emoji}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{name}</span>
                    <button
                      onClick={() => deleteCategory(name)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                type="text"
                placeholder="🏷️"
                value={newCatEmoji}
                onChange={e => { setNewCatEmoji(e.target.value); setCatError('') }}
                style={{ width: 64, textAlign: 'center', fontSize: 18, padding: '8px 4px' }}
                maxLength={4}
              />
              <input
                className="form-input"
                type="text"
                placeholder="Nom de la catégorie"
                value={newCatName}
                onChange={e => { setNewCatName(e.target.value); setCatError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                style={{ flex: 1, minWidth: 160 }}
                maxLength={30}
              />
              <button className="btn btn-primary" onClick={handleAddCategory} style={{ flexShrink: 0 }}>
                <Plus size={16} /> Ajouter
              </button>
            </div>
            {catError && <p className="form-error" style={{ marginTop: 8 }}>{catError}</p>}
          </div>

          {/* API Key section */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
              <span className="card-title">Clé API Claude</span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
              L'agent IA utilise l'API Claude pour analyser vos finances. Votre clé est stockée
              localement dans votre navigateur et n'est jamais envoyée à un serveur tiers.
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
                <li>Aucune donnée n'est envoyée à un serveur (sauf à l'API Claude pour le chat)</li>
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
              <span>Créé par Alexis Boukandoura</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
