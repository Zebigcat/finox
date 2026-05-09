import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, List, BarChart2, Upload, Bot, Settings } from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: List },
  { to: '/analyse', label: 'Analyse', icon: BarChart2 },
  { to: '/agent', label: 'Agent IA', icon: Bot },
]

const secondaryItems = [
  { to: '/import', label: 'Importer CSV', icon: Upload },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
]

// 5-item bottom nav for mobile
const mobileItems = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/transactions', label: 'Comptes', icon: List },
  { to: '/agent', label: 'Agent IA', icon: Bot },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/parametres', label: 'Réglages', icon: Settings },
]

export default function Layout() {
  return (
    <div className="app-layout">
      {/* Sidebar — desktop */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
            <div className="sidebar-logo-icon">Fx</div>
            <span className="sidebar-logo-text">Finox</span>
          </NavLink>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Principal</div>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="nav-section-title">Gestion</div>
          {secondaryItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          Finox v1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="mobile-bottom-nav">
        {mobileItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
