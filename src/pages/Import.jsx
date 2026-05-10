import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertCircle, FileText, Trash2, Files } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import { parseSumeriaCSV, formatAmount, formatDate } from '../utils/csvParser'

export default function Import() {
  const { addTransactions, clearTransactions, transactions } = useFinance()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { success, message, errors? }
  const [preview, setPreview] = useState(null) // { fileResults, txs, dupCount }
  const fileRef = useRef()

  const handleFiles = async (files) => {
    const csvFiles = Array.from(files).filter(f => f.name.endsWith('.csv') || f.type.includes('csv'))
    if (!csvFiles.length) {
      setResult({ success: false, message: 'Veuillez sélectionner des fichiers CSV.' })
      return
    }
    setLoading(true)
    setResult(null)
    setPreview(null)

    try {
      const settled = await Promise.allSettled(
        csvFiles.map(f => parseSumeriaCSV(f).then(txs => ({ filename: f.name, txs })))
      )

      const fileResults = []
      const allTxs = []
      const errors = []

      for (const r of settled) {
        if (r.status === 'fulfilled') {
          fileResults.push({ filename: r.value.filename, count: r.value.txs.length })
          allTxs.push(...r.value.txs)
        } else {
          errors.push(r.reason.message)
        }
      }

      if (!fileResults.length) {
        setResult({ success: false, message: errors[0] || 'Aucun fichier valide.' })
        return
      }

      // Deduplicate across files by date + label + amount
      const seen = new Set()
      const dedupedTxs = allTxs.filter(t => {
        const key = `${t.date}|${t.label}|${t.amount}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const dupCount = allTxs.length - dedupedTxs.length

      setPreview({ fileResults, txs: dedupedTxs, dupCount })

      const label = fileResults.length === 1
        ? `depuis "${fileResults[0].filename}"`
        : `depuis ${fileResults.length} fichiers`
      const dupNote = dupCount > 0 ? ` · ${dupCount} doublon${dupCount > 1 ? 's' : ''} supprimé${dupCount > 1 ? 's' : ''}` : ''
      setResult({
        success: true,
        message: `${dedupedTxs.length} transactions prêtes à importer ${label}${dupNote}`,
        errors: errors.length ? errors : null,
      })
    } catch (e) {
      setResult({ success: false, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  const confirmImport = () => {
    if (!preview) return
    addTransactions(preview.txs)
    const dupNote = preview.dupCount > 0 ? ` (${preview.dupCount} doublon${preview.dupCount > 1 ? 's' : ''} ignoré${preview.dupCount > 1 ? 's' : ''})` : ''
    setResult({ success: true, message: `${preview.txs.length} transactions importées avec succès !${dupNote}` })
    setPreview(null)
  }

  const cancelImport = () => {
    setPreview(null)
    setResult(null)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Importer des fichiers CSV</h1>
        <p className="page-subtitle">Compatible avec les exports Sumeria (Orange Bank)</p>
      </div>

      <div className="page-content">
        <div className="import-layout">
          <div>
            {/* Drop zone */}
            <div
              className={`import-zone${dragging ? ' drag-over' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{ marginBottom: 16 }}
            >
              <div className="import-zone-icon">
                {loading ? <Upload size={24} /> : <Files size={24} />}
              </div>
              <div className="import-zone-title">
                {loading ? 'Analyse en cours…' : 'Glissez vos fichiers CSV ici'}
              </div>
              <div className="import-zone-sub">
                ou cliquez pour sélectionner un ou plusieurs fichiers
              </div>
              <div className="import-zone-sub" style={{ marginTop: 8 }}>
                Format accepté : CSV Sumeria / Orange Bank · Plusieurs fichiers supportés
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />

            {/* Result notice */}
            {result && (
              <div className={result.success ? 'success-notice' : 'api-key-notice'} style={{ marginBottom: 16 }}>
                {result.success ? <CheckCircle size={18} color="var(--green)" /> : <AlertCircle size={18} />}
                <div>
                  <p>{result.message}</p>
                  {result.errors?.map((err, i) => (
                    <p key={i} style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                      <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />{err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm/cancel buttons */}
            {preview && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={confirmImport}>
                  <CheckCircle size={16} /> Confirmer l'import
                </button>
                <button className="btn btn-secondary" onClick={cancelImport}>
                  Annuler
                </button>
              </div>
            )}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current data status */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Données actuelles</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                {transactions.length === 0
                  ? 'Aucune transaction importée.'
                  : `${transactions.length} transactions stockées localement.`}
              </div>
              {transactions.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,0.3)' }}
                  onClick={() => {
                    if (window.confirm('Supprimer toutes les transactions ?')) {
                      clearTransactions()
                      setResult(null); setPreview(null)
                    }
                  }}
                >
                  <Trash2 size={14} /> Effacer toutes les données
                </button>
              )}
            </div>

            {/* Format info */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Format attendu</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.7 }}>
                Le fichier CSV Sumeria doit contenir les colonnes suivantes (dans n'importe quel ordre) :
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Date', 'Date de l\'opération (JJ/MM/AAAA)'],
                  ['Libellé', 'Description de la transaction'],
                  ['Débit / Crédit', 'Montant en euros (séparés ou combinés)'],
                  ['Solde', 'Solde du compte (optionnel)'],
                ].map(([col, desc]) => (
                  <div key={col} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      background: 'var(--bg-hover)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: 'var(--accent-light)',
                      whiteSpace: 'nowrap',
                    }}>{col}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview table */}
        {preview && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <span className="card-title">
                <FileText size={14} style={{ display: 'inline', marginRight: 6 }} />
                Aperçu
                {preview.fileResults.length > 1
                  ? ` — ${preview.fileResults.length} fichiers`
                  : ` — ${preview.fileResults[0].filename}`}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {preview.txs.length} transactions
                {preview.dupCount > 0 && ` · ${preview.dupCount} doublon${preview.dupCount > 1 ? 's' : ''} supprimé${preview.dupCount > 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Per-file breakdown when multiple files */}
            {preview.fileResults.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {preview.fileResults.map(({ filename, count }) => (
                  <span key={filename} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '3px 10px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}>
                    <FileText size={11} />
                    {filename}
                    <span style={{ color: 'var(--text-muted)' }}>({count})</span>
                  </span>
                ))}
              </div>
            )}

            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {preview.txs.slice(0, 15).map((t, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDate(t.date)}</td>
                    <td style={{ fontSize: 13 }}>{t.merchant}</td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.emoji} {t.category}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={t.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                        {t.amount >= 0 ? '+' : ''}{formatAmount(t.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.txs.length > 15 && (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                … et {preview.txs.length - 15} autres transactions
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
