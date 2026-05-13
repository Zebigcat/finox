import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCategoryEmoji, CATEGORIES } from '../utils/csvParser'

const TRANSFER_KEYWORDS = ['reserve', "arrondi à l'euro", 'arrondi euro', 'transfert interne', 'virement interne', 'epargne automatique']

function isTransfer(label) {
  const lower = (label || '').toLowerCase()
  return TRANSFER_KEYWORDS.some(kw => lower.includes(kw))
}

const FinanceContext = createContext(null)

// ─── Row shape helpers ────────────────────────────────────────────────────────
// DB columns : id | user_id | date | label | amount | type | cat | created_at
// App object : id | date | label | merchant | amount | category | emoji | balance | type

function getEmojiFromAll(cat, customCats) {
  const builtin = getCategoryEmoji(cat)
  if (builtin !== '📦') return builtin
  return customCats.find(c => c.name === cat)?.emoji || '📦'
}

function makeRowToTx(customCats) {
  return function rowToTx(row) {
    const amount = parseFloat(row.amount)
    return {
      id:       row.id,
      date:     row.date,
      label:    row.label,
      merchant: row.label,
      amount:   row.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      type:     row.type,
      category: row.cat,
      emoji:    getEmojiFromAll(row.cat, customCats),
      balance:  null,
    }
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
  const [referenceBalance, setReferenceBalanceState] = useState(() => {
    try {
      const stored = localStorage.getItem('finox_ref_balance')
      return stored ? JSON.parse(stored) : { amount: 0.03, date: '2026-05-11' }
    } catch { return { amount: 2.00, date: '2025-01-31' } }
  })
  const [customCategories, setCustomCategoriesState] = useState(() => {
    try {
      const stored = localStorage.getItem('finox-custom-categories')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

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
    fetchTransactions(user, customCategories)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTransactions(currentUser, customCats) {
    setTxLoading(true)
    const rowToTx = makeRowToTx(customCats)
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
          const migrated = rows.map(r => rowToTx(r))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
          setTransactions(migrated)
          setTxLoading(false)
          return
        }
      }
    }

    // Recategorize existing transfer transactions that weren't caught before
    const toFix = fetched.filter(t => t.category !== 'Transfert interne' && isTransfer(t.label))
    if (toFix.length > 0) {
      const ids = toFix.map(t => t.id)
      await supabase
        .from('transactions')
        .update({ cat: 'Transfert interne' })
        .in('id', ids)
        .eq('user_id', currentUser.id)

      const fixedSet = new Set(ids)
      fetched.forEach(t => {
        if (fixedSet.has(t.id)) {
          t.category = 'Transfert interne'
          t.emoji = '🔁'
        }
      })
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

  // ── updateTransaction ───────────────────────────────────────────────────────
  const updateTransaction = async (tx) => {
    if (!user) return

    setTransactions(prev =>
      prev.map(t => t.id === tx.id ? tx : t)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    )

    const row = txToRow(tx, user.id)
    const { error } = await supabase
      .from('transactions')
      .update({ date: row.date, label: row.label, amount: row.amount, type: row.type, cat: row.cat })
      .eq('id', tx.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erreur update transaction:', error.message)
      fetchTransactions(user)
    }
  }

  // ── deleteTransaction ───────────────────────────────────────────────────────
  const deleteTransaction = async (id) => {
    if (!user) return

    setTransactions(prev => prev.filter(t => t.id !== id))

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Erreur delete transaction:', error.message)
      fetchTransactions(user)
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

  // ── Reference balance ───────────────────────────────────────────────────────
  const setReferenceBalance = (ref) => {
    setReferenceBalanceState(ref)
    localStorage.setItem('finox_ref_balance', JSON.stringify(ref))
  }

  // ── API key (stays in localStorage — it's the user's own key) ──────────────
  const setApiKey = (key) => {
    setApiKeyState(key)
    localStorage.setItem('finox_api_key', key)
  }

  // ── Custom categories ───────────────────────────────────────────────────────
  const addCategory = ({ name, emoji }) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCustomCategoriesState(prev => {
      if (prev.some(c => c.name === trimmed)) return prev
      const updated = [...prev, { name: trimmed, emoji: emoji?.trim() || '📦' }]
      localStorage.setItem('finox-custom-categories', JSON.stringify(updated))
      return updated
    })
  }

  const deleteCategory = (name) => {
    setCustomCategoriesState(prev => {
      const updated = prev.filter(c => c.name !== name)
      localStorage.setItem('finox-custom-categories', JSON.stringify(updated))
      return updated
    })
  }

  const allCategories = [
    ...CATEGORIES,
    { name: 'Autre', emoji: '📦' },
    ...customCategories,
  ]

  // ── Sign out ────────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut()
    setTransactions([])
  }

  const stats = computeStats(transactions)

  // Real balance = reference amount + all transactions strictly after the reference date
  const realBalance = (() => {
    const refDate = referenceBalance.date  // 'YYYY-MM-DD'
    const delta = transactions
      .filter(t => t.date > refDate)
      .reduce((s, t) => s + t.amount, 0)
    return referenceBalance.amount + delta
  })()

  return (
    <FinanceContext.Provider value={{
      user,
      authLoading,
      transactions,
      txLoading,
      addTransactions,
      updateTransaction,
      deleteTransaction,
      clearTransactions,
      apiKey,
      setApiKey,
      signOut,
      stats,
      referenceBalance,
      setReferenceBalance,
      realBalance,
      customCategories,
      allCategories,
      addCategory,
      deleteCategory,
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

  // Transfers are real money movements but not income/expenses — exclude from financial stats
  const ops = transactions.filter(t => t.category !== 'Transfert interne')

  const totalIncome   = ops.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpenses = ops.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome + totalExpenses

  const byCategory = {}
  const byMonth    = {}
  const byMerchant = {}

  for (const t of ops) {
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

  return { totalIncome, totalExpenses: Math.abs(totalExpenses), balance, count: ops.length, byCategory, byMonth, byMerchant }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider')
  return ctx
}
