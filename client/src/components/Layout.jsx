import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <aside style={{ width: '220px', background: '#1e293b', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: 'white', fontSize: '16px', marginBottom: '32px', textAlign: 'center' }}>🚗 Автошкола CRM</h2>
        <nav style={{ flex: 1 }}>
          <NavLink to="/leads" style={navStyle}>📋 Лиды</NavLink>
          <NavLink to="/payments" style={navStyle}>💰 Платежи</NavLink>
          {user?.role === 'admin' && <NavLink to="/users" style={navStyle}>👥 Пользователи</NavLink>}
        </nav>
        <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>{user?.name}</div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '8px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            Выйти
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '32px' }}>
        <Outlet />
      </main>
    </div>
  )
}