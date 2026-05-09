import { useState, useEffect, useRef } from 'react'
import { X, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import { CATEGORIES, getCategoryEmoji } from '../utils/csvParser'

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULT_FORM = {
  type: 'expense',   // 'expense' | 'income'
  date: today(),
  description: '',
  amount: '',
  category: 'Autre',
}

export default function AddTransactionModal({ onClose }) {
  const { addTransactions } = useFinance()
  const [form, setForm] = useState({ ...DEFAULT_FORM, date: today() })
  const [error, setError] = useState('')
  const descRef = useRef(null)

  // Auto-focus description on mount, close on Escape
  useEffect(() => {
    descRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (field, value) => {
    setError('')
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const desc = form.description.trim()
    const amt = parseFloat(form.amount)

    if (!desc) { setError('La description est requise.'); return }
    if (!form.amount || isNaN(amt) || amt <= 0) { setError('Montant invalide (doit être > 0).'); return }
    if (!form.date) { setError('La date est requise.'); return }

    const signed = form.type === 'expense' ? -Math.abs(amt) : Math.abs(amt)

    const tx = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: form.date,
      label: desc,
      merchant: desc,
      amount: signed,
      category: form.category,
      emoji: getCategoryEmoji(form.category),
      balance: null,
    }

    addTransactions([tx])
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Dialog */}
      <div className="modal" role="dialog" aria-modal="true" aria-label="Ajouter une transaction">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-icon">
              <Plus size={18} />
            </div>
            <h2 className="modal-title">Ajouter une transaction</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">

            {/* Type toggle */}
            <div className="form-group">
              <label className="form-label">Type</label>
              <div className="type-toggle">
                <button
                  type="button"
                  className={`type-toggle-btn expense${form.type === 'expense' ? ' active' : ''}`}
                  onClick={() => set('type', 'expense')}
                >
                  <TrendingDown size={15} /> Dépense
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn income${form.type === 'income' ? ' active' : ''}`}
                  onClick={() => set('type', 'income')}
                >
                  <TrendingUp size={15} /> Revenu
                </button>
              </div>
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-date">Date</label>
              <input
                id="tx-date"
                className="form-input"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                max={today()}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-desc">Description</label>
              <input
                id="tx-desc"
                ref={descRef}
                className="form-input"
                type="text"
                placeholder="Ex : Courses Lidl, Salaire juin…"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                maxLength={120}
                required
              />
            </div>

            {/* Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-amount">
                Montant <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(€)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span className="amount-prefix">
                  {form.type === 'expense' ? '−' : '+'}
                </span>
                <input
                  id="tx-amount"
                  className="form-input"
                  type="number"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  min="0.01"
                  step="0.01"
                  style={{ paddingLeft: 36 }}
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label" htmlFor="tx-category">Catégorie</label>
              <select
                id="tx-category"
                className="form-input filter-select"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                style={{ width: '100%' }}
              >
                {CATEGORIES.map(({ name, emoji }) => (
                  <option key={name} value={name}>{emoji} {name}</option>
                ))}
                <option value="Autre">📦 Autre</option>
              </select>
            </div>

            {error && (
              <p className="form-error">{error}</p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Ajouter
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
