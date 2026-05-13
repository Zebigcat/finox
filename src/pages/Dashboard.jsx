import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { TrendingUp, TrendingDown, Wallet, CreditCard, ArrowUpRight, Plus } from 'lucide-react'
import { useFinance } from '../context/FinanceContext'
import { formatAmount, formatDate, CATEGORY_COLORS } from '../utils/csvParser'
import { Link } from 'react-router-dom'
import AddTransactionModal from '../components/AddTransactionModal'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const CHART_DEFAULTS = {
  plugins: { legend: { labels: { color: '#9090a8', font: { family: 'Inter', size: 12 }, boxWidth: 12 } } },
  scales: {
    x: { ticks: { color: '#5a5a72', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(42,42,58,0.8)' } },
    y: { ticks: { color: '#5a5a72', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(42,42,58,0.8)' } },
  },
  responsive: true,
  maintainAspectRatio: false,
}

export default function Dashboard() {
  const { transactions, stats, realBalance, referenceBalance } = useFinance()
  const [showModal, setShowModal] = useState(false)

  const monthlyChartData = useMemo(() => {
    const months = Object.keys(stats.byMonth).sort().slice(-6)
    return {
      labels: months.map(m => {
        const [y, mo] = m.split('-')
        return new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      }),
      datasets: [
        {
          label: 'Revenus',
          data: months.map(m => stats.byMonth[m]?.income || 0),
          backgroundColor: 'rgba(74, 222, 128, 0.7)',
          borderRadius: 6,
        },
        {
          label: 'Dépenses',
          data: months.map(m => stats.byMonth[m]?.expenses || 0),
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
          borderRadius: 6,
        },
      ],
    }
  }, [stats.byMonth])

  const categoryChartData = useMemo(() => {
    const cats = Object.entries(stats.byCategory)
      .filter(([, v]) => v.expenses > 0)
      .sort((a, b) => b[1].expenses - a[1].expenses)
      .slice(0, 7)
    return {
      labels: cats.map(([k]) => k),
      datasets: [{
        data: cats.map(([, v]) => v.expenses.toFixed(2)),
        backgroundColor: cats.map(([k]) => CATEGORY_COLORS[k] || '#71717a'),
        borderWidth: 0,
        hoverOffset: 4,
      }],
    }
  }, [stats.byCategory])

  const balanceLineData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-30)
    let running = 0
    return {
      labels: sorted.map(t => formatDate(t.date)),
      datasets: [{
        label: 'Solde cumulé',
        data: sorted.map(t => {
          running += t.amount
          return running.toFixed(2)
        }),
        borderColor: '#7c6fcd',
        backgroundColor: 'rgba(124, 111, 205, 0.08)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
      }],
    }
  }, [transactions])

  const recentTx = transactions.slice(0, 8)
  const isEmpty = !transactions.length

  if (isEmpty) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Bienvenue sur Finox — votre gestionnaire de finances personnelles</p>
        </div>
        <div className="page-content">
          <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 20, marginBottom: 8 }}>Aucune donnée</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
              Importez un fichier CSV Sumeria ou ajoutez une transaction manuellement.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/import" className="btn btn-secondary">
                Importer un CSV
              </Link>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Ajouter une transaction
              </button>
            </div>
          </div>
        </div>
        {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
      </div>
    )
  }

  const savingsRate = stats.totalIncome > 0 ? ((stats.totalIncome - stats.totalExpenses) / stats.totalIncome * 100) : 0

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 className="page-title">Tableau de bord</h1>
            <p className="page-subtitle">{stats.count} transactions · {Object.keys(stats.byMonth).length} mois</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ flexShrink: 0 }}>
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Stat cards */}
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--green-bg)' }}>
              <TrendingUp size={20} color="var(--green)" />
            </div>
            <div className="stat-card-label">Revenus totaux</div>
            <div className="stat-card-value">{formatAmount(stats.totalIncome)}</div>
            <div className="stat-card-change positive">
              <TrendingUp size={12} /> Entrées
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--red-bg)' }}>
              <TrendingDown size={20} color="var(--red)" />
            </div>
            <div className="stat-card-label">Dépenses totales</div>
            <div className="stat-card-value">{formatAmount(stats.totalExpenses)}</div>
            <div className="stat-card-change negative">
              <TrendingDown size={12} /> Sorties
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--blue-bg)' }}>
              <Wallet size={20} color="var(--blue)" />
            </div>
            <div className="stat-card-label">Solde actuel</div>
            <div className="stat-card-value" style={{ color: realBalance >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {formatAmount(realBalance)}
            </div>
            <div className="stat-card-change" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Depuis le {new Date(referenceBalance.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--accent-glow)' }}>
              <CreditCard size={20} color="var(--accent-light)" />
            </div>
            <div className="stat-card-label">Taux d'épargne</div>
            <div className="stat-card-value">{savingsRate.toFixed(1)}%</div>
            <div className="stat-card-change" style={{ color: 'var(--text-muted)' }}>
              <span>{stats.count} opérations</span>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Revenus vs Dépenses</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>6 derniers mois</span>
            </div>
            <div className="chart-container">
              <Bar data={monthlyChartData} options={CHART_DEFAULTS} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Répartition dépenses</span>
            </div>
            <div className="chart-container" style={{ height: 260 }}>
              <Doughnut
                data={categoryChartData}
                options={{
                  ...CHART_DEFAULTS,
                  scales: undefined,
                  cutout: '62%',
                  plugins: { legend: { position: 'right', labels: { color: '#9090a8', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 10 } } },
                }}
              />
            </div>
          </div>
        </div>

        {/* Balance trend */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Évolution du solde</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>30 dernières opérations</span>
          </div>
          <div className="chart-container">
            <Line data={balanceLineData} options={CHART_DEFAULTS} />
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Transactions récentes</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ padding: '6px 12px', fontSize: 13 }}>
                <Plus size={14} /> Ajouter
              </button>
              <Link to="/transactions" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }}>
                Voir tout <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
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
              {recentTx.map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.merchant}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.label.slice(0, 50)}</div>
                  </td>
                  <td>
                    <span className="category-badge" style={{
                      background: (CATEGORY_COLORS[t.category] || '#71717a') + '20',
                      color: CATEGORY_COLORS[t.category] || '#71717a',
                    }}>
                      {t.emoji} {t.category}
                    </span>
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
        </div>
      </div>
      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
