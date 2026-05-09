import { useMemo } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Line, Radar } from 'react-chartjs-2'
import { useFinance } from '../context/FinanceContext'
import { formatAmount, CATEGORY_COLORS } from '../utils/csvParser'
import { BarChart2 } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const CHART_BASE = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#9090a8', font: { family: 'Inter', size: 12 }, boxWidth: 12 } } },
  scales: {
    x: { ticks: { color: '#5a5a72', font: { size: 11 } }, grid: { color: 'rgba(42,42,58,0.8)' } },
    y: { ticks: { color: '#5a5a72', font: { size: 11 } }, grid: { color: 'rgba(42,42,58,0.8)' } },
  },
}

export default function Analysis() {
  const { transactions, stats } = useFinance()

  const topMerchants = useMemo(() =>
    Object.entries(stats.byMerchant)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    [stats.byMerchant]
  )

  const maxMerchant = topMerchants[0]?.[1] || 1

  const monthlyTrend = useMemo(() => {
    const months = Object.keys(stats.byMonth).sort().slice(-12)
    return {
      labels: months.map(m => {
        const [y, mo] = m.split('-')
        return new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'short' })
      }),
      datasets: [
        {
          label: 'Revenus',
          data: months.map(m => stats.byMonth[m]?.income || 0),
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74,222,128,0.08)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
        },
        {
          label: 'Dépenses',
          data: months.map(m => stats.byMonth[m]?.expenses || 0),
          borderColor: '#f87171',
          backgroundColor: 'rgba(248,113,113,0.08)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
        },
      ],
    }
  }, [stats.byMonth])

  const categoryBar = useMemo(() => {
    const cats = Object.entries(stats.byCategory)
      .filter(([, v]) => v.expenses > 0)
      .sort((a, b) => b[1].expenses - a[1].expenses)
      .slice(0, 8)
    return {
      labels: cats.map(([k]) => k),
      datasets: [{
        label: 'Dépenses',
        data: cats.map(([, v]) => v.expenses.toFixed(2)),
        backgroundColor: cats.map(([k]) => (CATEGORY_COLORS[k] || '#71717a') + 'cc'),
        borderRadius: 6,
        borderWidth: 0,
      }],
    }
  }, [stats.byCategory])

  // Savings over months
  const savingsData = useMemo(() => {
    const months = Object.keys(stats.byMonth).sort().slice(-6)
    return {
      labels: months.map(m => {
        const [y, mo] = m.split('-')
        return new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      }),
      datasets: [{
        label: 'Économies nettes',
        data: months.map(m => {
          const { income = 0, expenses = 0 } = stats.byMonth[m] || {}
          return (income - expenses).toFixed(2)
        }),
        backgroundColor: months.map(m => {
          const { income = 0, expenses = 0 } = stats.byMonth[m] || {}
          return income - expenses >= 0 ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)'
        }),
        borderRadius: 6,
        borderWidth: 0,
      }],
    }
  }, [stats.byMonth])

  if (!transactions.length) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Analyse</h1>
        </div>
        <div className="page-content">
          <div className="empty-state">
            <BarChart2 />
            <p>Aucune donnée à analyser. Importez un CSV pour commencer.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analyse</h1>
        <p className="page-subtitle">Analyse détaillée de vos finances</p>
      </div>

      <div className="page-content">
        {/* Tendance mensuelle */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Tendance mensuelle</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>12 derniers mois</span>
          </div>
          <div className="chart-container" style={{ height: 260 }}>
            <Line data={monthlyTrend} options={CHART_BASE} />
          </div>
        </div>

        <div className="analysis-grid">
          {/* Dépenses par catégorie */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Dépenses par catégorie</span>
            </div>
            <div className="chart-container" style={{ height: 240 }}>
              <Bar data={categoryBar} options={{ ...CHART_BASE, plugins: { legend: { display: false } }, indexAxis: 'y' }} />
            </div>
          </div>

          {/* Économies nettes */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Économies nettes / mois</span>
            </div>
            <div className="chart-container" style={{ height: 240 }}>
              <Bar data={savingsData} options={{
                ...CHART_BASE,
                plugins: { legend: { display: false } },
              }} />
            </div>
          </div>
        </div>

        <div className="analysis-grid">
          {/* Top marchands */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Top 10 marchands</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>par montant dépensé</span>
            </div>
            {topMerchants.map(([name, amount]) => (
              <div key={name} className="merchant-row">
                <span className="merchant-name" title={name}>{name}</span>
                <div className="merchant-bar-wrap">
                  <div className="merchant-bar" style={{ width: `${(amount / maxMerchant * 100).toFixed(1)}%` }} />
                </div>
                <span className="merchant-amount">{formatAmount(amount)}</span>
              </div>
            ))}
          </div>

          {/* Catégorie stats */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Stats par catégorie</span>
            </div>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Dépenses</th>
                  <th style={{ textAlign: 'right' }}>Opérations</th>
                  <th style={{ textAlign: 'right' }}>Moy.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byCategory)
                  .filter(([, v]) => v.expenses > 0)
                  .sort((a, b) => b[1].expenses - a[1].expenses)
                  .slice(0, 8)
                  .map(([cat, data]) => (
                    <tr key={cat}>
                      <td>
                        <span className="category-badge" style={{
                          background: (CATEGORY_COLORS[cat] || '#71717a') + '20',
                          color: CATEGORY_COLORS[cat] || '#71717a',
                        }}>{cat}</span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--red)', fontWeight: 600, fontSize: 13 }}>
                        {formatAmount(data.expenses)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13 }}>
                        {data.count}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13 }}>
                        {formatAmount(data.expenses / data.count)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
