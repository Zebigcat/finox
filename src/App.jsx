import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FinanceProvider } from './context/FinanceContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Analysis from './pages/Analysis'
import Import from './pages/Import'
import Agent from './pages/Agent'
import Settings from './pages/Settings'

export default function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing outside the app shell */}
          <Route path="/" element={<Landing />} />

          {/* App shell with sidebar */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analyse" element={<Analysis />} />
            <Route path="/import" element={<Import />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/parametres" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FinanceProvider>
  )
}
