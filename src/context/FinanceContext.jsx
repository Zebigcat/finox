import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCategoryEmoji } from '../utils/csvParser'

const FinanceContext = createContext(null)

// ─── Row shape helpers ────────────────────────────────────────────────────────
// DB columns : id | user_id | date | label | amount | type | cat | created_at
// App object : id | date | label | merchant | amount | category | emoji | balance | type

function rowToTx(row) {
  const amount = parseFloat(row.amount)
  return {
    id:       row.id,
    date:     row.date,
    label:    row.label,
    merchant: row.label,                  // no separate merchant column — use label
    amount:   row.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
    type:     row.type,
    category: row.cat,
    emoji:    getCategoryEmoji(row.cat),  // derived from category name
    balance:  null,
  }
}

function txToRow(tx, userId) {
  return {
    id:      tx.id,
    user_id: userId,
    date:    tx.date,
    label:   tx.label,
    amount:  Math.abs(tx.amount),         // store absolute value; type carries the sign
    type:    tx.amount >= 0 ? 'income' : 'expense',
    cat:     tx.category ?? 'Autre',
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FinanceProvider({ children }) {
  const [user,        setUser]        = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [txLoading,   setTxLoading]   = useState(false)
  const [apiKey,      setApiKeyState] = useState(() => localStorage.getItem('finox_api_key') || '')

  // ── Auth state ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Resolve initial session immediately so the guard doesn't flash
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) setTransactions([])
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch transactions whenever the user changes ────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchTransactions(user)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTransactions(currentUser) {
    setTxLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Erreur fetch transactions:', error.message)
      setTxLoading(false)
      return
    }

    const fetched = (data ?? []).map(rowToTx)

    // One-time migration from localStorage → Supabase
    if (fetched.length === 0) {
      const local = (() => {
        try { return JSON.parse(localStorage.getItem('finox_transactions') || '[]') } catch { return [] }
      })()
      if (local.length > 0) {
        const rows = local.map(t => txToRow(t, currentUser.id))
        const { error: upErr } = await supabase
          .from('transactions')
          .upsert(rows, { onConflict: 'id' })
        if (!upErr) {
          localStorage.removeItem('finox_transactions')
          // Re-shape migrated transactions through rowToTx for consistency
          const migrated = rows.map(r => rowToTx(r))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
          setTransactions(migrated)
          setTxLoading(false)
          return
        }
      }
    }

    setTransactions(fetched)
    setTxLoading(false)
  }

  // ── addTransactions ─────────────────────────────────────────────────────────
  const addTransactions = async (newTxs) => {
    if (!user) return

    const existingIds = new Set(transactions.map(t => t.id))
    const unique = newTxs.filter(t => !existingIds.has(t.id))
    if (!unique.length) return

    // Optimistic update
    setTransactions(prev =>
      [...prev, ...unique].sort((a, b) => new Date(b.date) - new Date(a.date))
    )

    const rows = unique.map(t => txToRow(t, user.id))
    const { error } = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'id' })

    if (error) {
      console.error('Erreur insert transactions:', error.message)
      // Rollback optimistic update
      setTransactions(prev => prev.filter(t => !unique.some(u => u.id === t.id)))
    }
  }

  // ── clearTransactions ───────────────────────────────────────────────────────
  const clearTransactions = async () => {
    if (!user) return
    setTransactions([])
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id)
    if (error) console.error('Erreur clear transactions:', error.message)
  }

  // ── API key (stays in localStorage — it's the user's own key) ──────────────
  const setApiKey = (key) => {
    setApiKeyState(key)
    localStorage.setItem('finox_api_key', key)
  }

  // ── Sign out ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut()
    setTransactions([])
  }

  const stats = computeStats(transactions)

  return (
    <FinanceContext.Provider value={{
      user,
      authLoading,
      transactions,
      txLoading,
      addTransactions,
      clearTransactions,
      apiKey,
      setApiKey,
      signOut,
      stats,
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

// ─── computeStats (unchanged) ─────────────────────────────────────────────────

function computeStats(transactions) {
  if (!transactions.length) return {
    totalIncome: 0, totalExpenses: 0, balance: 0, count: 0,
    byCategory: {}, byMonth: {}, byMerchant: {},
  }

  const totalIncome   = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome + totalExpenses

  const byCategory = {}
  const byMonth    = {}
  const byMerchant = {}

  for (const t of transactions) {
    const cat = t.category || 'Autre'
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expenses: 0, count: 0 }
    if (t.amount > 0) byCategory[cat].income += t.amount
    else byCategory[cat].expenses += Math.abs(t.amount)
    byCategory[cat].count++

    const month = t.date.slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { income: 0, expenses: 0 }
    if (t.amount > 0) byMonth[month].income += t.amount
    else byMonth[month].expenses += Math.abs(t.amount)

    const merchant = t.merchant || t.label
    if (t.amount < 0) {
      if (!byMerchant[merchant]) byMerchant[merchant] = 0
      byMerchant[merchant] += Math.abs(t.amount)
    }
  }

  return { totalIncome, totalExpenses: Math.abs(totalExpenses), balance, count: transactions.length, byCategory, byMonth, byMerchant }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider')
  return ctx
}
