import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { FinanceProvider, useFinance } from './context/FinanceContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Analysis from './pages/Analysis'
import Import from './pages/Import'
import Agent from './pages/Agent'
import Settings from './pages/Settings'

// Spinner shown while Supabase resolves the initial session
function AppLoader() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      gap: 12,
      flexDirection: 'column',
    }}>
      <div style={{
        width: 44, height: 44,
        background: 'linear-gradient(135deg, var(--accent), #5b4fc7)',
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 800, color: 'white',
        animation: 'pulse-loader 1.4s ease-in-out infinite',
      }}>Fx</div>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</span>
    </div>
  )
}

// Blocks unauthenticated access to app routes
function AuthGuard() {
  const { user, authLoading } = useFinance()
  if (authLoading) return <AppLoader />
  if (!user) return <Navigate to="/auth" replace />
  return <Outlet />
}

// Redirects logged-in users away from /auth
function GuestGuard() {
  const { user, authLoading } = useFinance()
  if (authLoading) return <AppLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />

          {/* Guest-only */}
          <Route element={<GuestGuard />}>
            <Route path="/auth" element={<Auth />} />
          </Route>

          {/* Protected app */}
          <Route element={<AuthGuard />}>
            <Route element={<Layout />}>
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/analyse"      element={<Analysis />} />
              <Route path="/import"       element={<Import />} />
              <Route path="/agent"        element={<Agent />} />
              <Route path="/parametres"   element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </FinanceProvider>
  )
}
