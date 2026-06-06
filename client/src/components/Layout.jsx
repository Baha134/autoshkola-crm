import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navStyle = ({ isActive }) => ({
    display: 'block',
    padding: '10px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: isActive ? 'white' : '#94a3b8',
    background: isActive ? '#2563eb' : 'transparent',
    marginBottom: '4px',
    fontSize: '14px'
  })

  const closeMenu = () => setMenuOpen(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>

      {menuOpen && (
        <div
          onClick={closeMenu}
          className="mobile-overlay"
          style={{
            display: 'none',
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}
        style={{
          width: '220px',
          background: '#1e293b',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h2 style={{ color: 'white', fontSize: '16px', margin: 0, flex: 1, textAlign: 'center' }}>🚗 Автошкола CRM</h2>
          <button
            onClick={closeMenu}
            className="sidebar-close"
            style={{ display: 'none', background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
          >✕</button>
        </div>

        <nav style={{ flex: 1 }} onClick={closeMenu}>
          <NavLink to="/" end style={navStyle}>📊 Дашборд</NavLink>
          <NavLink to="/leads" style={navStyle}>📋 Лиды</NavLink>
          <NavLink to="/payments" style={navStyle}>💰 Платежи</NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/users" style={navStyle}>👥 Пользователи</NavLink>
          )}
        </nav>

        <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>{user?.name}</div>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '8px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            Выйти
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          className="mobile-header"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: '#1e293b',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <button
            onClick={() => setMenuOpen(true)}
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
          >
            ☰
          </button>
          <span style={{ color: 'white', fontSize: '15px', fontWeight: '500' }}>🚗 Автошкола CRM</span>
        </header>

        <main style={{ flex: 1, padding: '32px' }} className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}