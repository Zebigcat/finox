import { createContext, useContext, useState, useEffect } from 'react'

const FinanceContext = createContext(null)

export function FinanceProvider({ children }) {
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('finox_transactions')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('finox_api_key') || ''
  })

  useEffect(() => {
    localStorage.setItem('finox_transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    if (apiKey) localStorage.setItem('finox_api_key', apiKey)
  }, [apiKey])

  const addTransactions = (newTxs) => {
    setTransactions(prev => {
      // Deduplicate by id
      const existingIds = new Set(prev.map(t => t.id))
      const unique = newTxs.filter(t => !existingIds.has(t.id))
      return [...prev, ...unique].sort((a, b) => new Date(b.date) - new Date(a.date))
    })
  }

  const clearTransactions = () => {
    setTransactions([])
    localStorage.removeItem('finox_transactions')
  }

  // Computed stats
  const stats = computeStats(transactions)

  return (
    <FinanceContext.Provider value={{
      transactions,
      addTransactions,
      clearTransactions,
      apiKey,
      setApiKey,
      stats,
    }}>
      {children}
    </FinanceContext.Provider>
  )
}

function computeStats(transactions) {
  if (!transactions.length) return {
    totalIncome: 0, totalExpenses: 0, balance: 0, count: 0,
    byCategory: {}, byMonth: {}, byMerchant: {},
  }

  const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome + totalExpenses

  const byCategory = {}
  const byMonth = {}
  const byMerchant = {}

  for (const t of transactions) {
    // By category
    const cat = t.category || 'Autre'
    if (!byCategory[cat]) byCategory[cat] = { income: 0, expenses: 0, count: 0 }
    if (t.amount > 0) byCategory[cat].income += t.amount
    else byCategory[cat].expenses += Math.abs(t.amount)
    byCategory[cat].count++

    // By month
    const month = t.date.slice(0, 7) // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { income: 0, expenses: 0 }
    if (t.amount > 0) byMonth[month].income += t.amount
    else byMonth[month].expenses += Math.abs(t.amount)

    // By merchant
    const merchant = t.merchant || t.label
    if (t.amount < 0) {
      if (!byMerchant[merchant]) byMerchant[merchant] = 0
      byMerchant[merchant] += Math.abs(t.amount)
    }
  }

  return { totalIncome, totalExpenses: Math.abs(totalExpenses), balance, count: transactions.length, byCategory, byMonth, byMerchant }
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be inside FinanceProvider')
  return ctx
}
