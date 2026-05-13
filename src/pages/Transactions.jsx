import { useState, useMemo } from 'react'
import { Search, Filter, Download, Plus, Pencil, Trash2, Copy } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import { formatAmount, formatDate, CATEGORY_COLORS } from '../utils/csvParser'
import AddTransactionModal from '../components/AddTransactionModal'

const PAGE_SIZE = 50

export default function Transactions() {
  const { transactions, stats, deleteTransaction, addTransactions } = useFinance()

  const duplicateTransaction = (t) => {
    const today = new Date().toISOString().slice(0, 10)
    addTransactions([{
      ...t,
      id: `dup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: today,
      balance: null,
    }])
  }
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editTx, setEditTx] = useState(null)

  const categories = useMemo(() => Object.keys(stats.byCategory), [stats.byCategory])
  const months = useMemo(() => Object.keys(stats.byMonth).sort().reverse(), [stats.byMonth])

  const filtered = useMemo(() => {
    let list = transactions

    if (search) {
      const s = search.toLowerCase()
      list = list.filter(t =>
        t.label.toLowerCase().includes(s) ||
        t.merchant.toLowerCase().includes(s) ||
        t.category.toLowerCase().includes(s)
      )
    }

    if (filterCategory !== 'all') {
      list = list.filter(t => t.category === filterCategory)
    }

    if (filterType === 'income') list = list.filter(t => t.amount > 0)
    else if (filterType === 'expense') list = list.filter(t => t.amount < 0)

    if (filterMonth !== 'all') {
      list = list.filter(t => t.date.startsWith(filterMonth))
    }

    const [field, dir] = sortBy.split('_')
    list = [...list].sort((a, b) => {
      let va, vb
      if (field === 'date') { va = new Date(a.date); vb = new Date(b.date) }
      else if (field === 'amount') { va = Math.abs(a.amount); vb = Math.abs(b.amount) }
      else { va = a.merchant; vb = b.merchant }
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [transactions, search, filterCategory, filterType, filterMonth, sortBy])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)

  const exportCSV = () => {
    const header = 'Date,Description,Marchand,Catégorie,Montant\n'
    const rows = filtered.map(t =>
      `${t.date},"${t.label}","${t.merchant}",${t.category},${t.amount}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'finox_export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setSearch(''); setFilterCategory('all'); setFilterType('all')
    setFilterMonth('all'); setPage(0)
  }

  if (!transactions.length) {
    return (
      <div>
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="page-title">Transactions</h1>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Ajouter
            </button>
          </div>
        </div>
        <div className="page-content">
          <div className="empty-state">
            <Search />
            <p>Aucune transaction. Importez un fichier CSV ou ajoutez-en une manuellement.</p>
          </div>
        </div>
        {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Transactions</h1>
            <p className="page-subtitle">
              {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== transactions.length && ` sur ${transactions.length}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Ajouter
            </button>
            <button className="btn btn-secondary" onClick={exportCSV}>
              <Download /> Exporter
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="card">
          {/* Filters */}
          <div className="filters-bar">
            <div className="search-input-wrap">
              <Search />
              <input
                className="search-input"
                placeholder="Rechercher une transaction…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
              />
            </div>

            <select className="filter-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(0) }}>
              <option value="all">Toutes catégories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select className="filter-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0) }}>
              <option value="all">Tous types</option>
              <option value="income">Revenus</option>
              <option value="expense">Dépenses</option>
            </select>

            <select className="filter-select" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(0) }}>
              <option value="all">Tous les mois</option>
              {months.map(m => {
                const [y, mo] = m.split('-')
                const label = new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                return <option key={m} value={m}>{label}</option>
              })}
            </select>

            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="date_desc">Date ↓</option>
              <option value="date_asc">Date ↑</option>
              <option value="amount_desc">Montant ↓</option>
              <option value="amount_asc">Montant ↑</option>
              <option value="merchant_asc">Marchand A→Z</option>
            </select>

            {(search || filterCategory !== 'all' || filterType !== 'all' || filterMonth !== 'all') && (
              <button className="btn btn-secondary" onClick={resetFilters} style={{ padding: '9px 12px' }}>
                <Filter size={14} /> Réinitialiser
              </button>
            )}
          </div>

          {paged.length === 0 ? (
            <div className="empty-state">
              <Search />
              <p>Aucune transaction ne correspond aux filtres.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="transactions-table tx-desktop-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Catégorie</th>
                    <th style={{ textAlign: 'right' }}>Montant</th>
                    {paged.some(t => t.balance !== null) && <th style={{ textAlign: 'right' }}>Solde</th>}
                  </tr>
                </thead>
                <tbody>
                  {paged.map(t => (
                    <tr key={t.id} className="tx-row">
                      <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 13 }}>
                        {formatDate(t.date)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{t.merchant}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.label.slice(0, 60)}</div>
                      </td>
                      <td>
                        <span className="category-badge" style={{
                          background: (CATEGORY_COLORS[t.category] || '#71717a') + '20',
                          color: CATEGORY_COLORS[t.category] || '#71717a',
                        }}>
                          {t.emoji} {t.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap', position: 'relative' }}>
                        <span className={t.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                          {t.amount >= 0 ? '+' : ''}{formatAmount(t.amount)}
                        </span>
                        <span className="tx-row-actions">
                          <button
                            className="btn-icon"
                            title="Dupliquer"
                            onClick={() => duplicateTransaction(t)}
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            className="btn-icon"
                            title="Modifier"
                            onClick={() => setEditTx(t)}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="btn-icon btn-icon-danger"
                            title="Supprimer"
                            onClick={() => { if (window.confirm('Supprimer cette transaction ?')) deleteTransaction(t.id) }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </span>
                      </td>
                      {paged.some(tx => tx.balance !== null) && (
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {t.balance !== null ? formatAmount(t.balance) : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile card list */}
              <div className="tx-card-list">
                {paged.map(t => (
                  <div key={t.id} className="tx-card">
                    <div className="tx-card-row">
                      <span className="tx-card-merchant">{t.merchant}</span>
                      <span className={t.amount >= 0 ? 'amount-positive' : 'amount-negative'} style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {t.amount >= 0 ? '+' : ''}{formatAmount(t.amount)}
                      </span>
                    </div>
                    <div className="tx-card-row" style={{ marginTop: 6 }}>
                      <span className="tx-card-date">{formatDate(t.date)}</span>
                      <span className="category-badge" style={{
                        background: (CATEGORY_COLORS[t.category] || '#71717a') + '20',
                        color: CATEGORY_COLORS[t.category] || '#71717a',
                        fontSize: 11,
                      }}>
                        {t.emoji} {t.category}
                      </span>
                    </div>
                    <div className="tx-card-row" style={{ marginTop: 8, justifyContent: 'flex-end', gap: 8 }}>
                      <button className="btn-icon" title="Dupliquer" onClick={() => duplicateTransaction(t)}>
                        <Copy size={14} />
                      </button>
                      <button className="btn-icon" title="Modifier" onClick={() => setEditTx(t)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        title="Supprimer"
                        onClick={() => { if (window.confirm('Supprimer cette transaction ?')) deleteTransaction(t.id) }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pageCount > 1 && (
                <div className="pagination">
                  <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}</span>
                  <div className="pagination-btns">
                    <button className="pagination-btn" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                      ← Préc.
                    </button>
                    <button className="pagination-btn" onClick={() => setPage(p => p + 1)} disabled={page >= pageCount - 1}>
                      Suiv. →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
      {editTx && <AddTransactionModal onClose={() => setEditTx(null)} transaction={editTx} />}
    </div>
  )
}
