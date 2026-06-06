import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

const NAV_ITEMS = [
  { to: '/', end: true,     icon: '⊞', label: 'Дашборд' },
  { to: '/leads',           icon: '◈', label: 'Лиды' },
  { to: '/payments',        icon: '◎', label: 'Платежи' },
]
const ADMIN_ITEMS = [
  { to: '/users',           icon: '◉', label: 'Пользователи' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const closeMenu = () => setMenuOpen(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Оверлей мобильный */}
      {menuOpen && (
        <div
          onClick={closeMenu}
          className="mobile-overlay"
          style={{
            display: 'none',
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Боковая панель */}
      <aside
        className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}
        style={{
          width: '224px',
          background: 'var(--bg2)',
          borderRight: '1px solid var(--border)',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Лого */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, var(--accent) 0%, #1d4ed8 100%)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0,
              boxShadow: '0 0 16px var(--accent-glow)',
            }}>🚗</div>
            <div>
              <div style={{ color: 'var(--text3)', fontSize: '13px', fontWeight: '700', letterSpacing: '0.02em', lineHeight: 1.1 }}>Автошкола</div>
              <div style={{ color: 'var(--text)', fontSize: '11px', letterSpacing: '0.05em' }}>CRM · Казахстан</div>
            </div>
          </div>
          <button
            onClick={closeMenu}
            className="sidebar-close"
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text)', fontSize: '18px', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
          >✕</button>
        </div>

        {/* Навигация */}
        <nav style={{ flex: 1, padding: '12px 10px', overflow: 'auto' }} onClick={closeMenu}>
          <div style={{ fontSize: '10px', color: 'var(--text)', letterSpacing: '0.1em', fontWeight: '600', padding: '4px 10px 8px', textTransform: 'uppercase' }}>
            Навигация
          </div>
          {NAV_ITEMS.map(item => (
            <SidebarLink key={item.to} {...item} />
          ))}
          {user?.role === 'admin' && (
            <>
              <div style={{ fontSize: '10px', color: 'var(--text)', letterSpacing: '0.1em', fontWeight: '600', padding: '16px 10px 8px', textTransform: 'uppercase' }}>
                Управление
              </div>
              {ADMIN_ITEMS.map(item => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </>
          )}
        </nav>

        {/* Пользователь */}
        <div style={{
          padding: '12px 10px',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px',
            borderRadius: 'var(--radius)',
            background: 'var(--bg3)',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '12px', fontWeight: '700', flexShrink: 0,
            }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text)' }}>{user?.role === 'admin' ? 'Администратор' : 'Менеджер'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px 12px',
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer', fontSize: '12px',
              transition: 'all 0.15s',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { e.target.style.background = 'var(--red-bg)'; e.target.style.borderColor = 'var(--red)'; e.target.style.color = 'var(--red)' }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text)' }}
          >
            Выйти из системы
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Мобильная шапка */}
        <header
          className="mobile-header"
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'var(--bg2)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <button
            onClick={() => setMenuOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
          >
            ☰
          </button>
          <span style={{ color: 'var(--text3)', fontSize: '15px', fontWeight: '600' }}>🚗 Автошкола CRM</span>
        </header>

        <main style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }} className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarLink({ to, end, icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 10px',
        borderRadius: 'var(--radius)',
        textDecoration: 'none',
        color: isActive ? 'white' : 'var(--text)',
        background: isActive ? 'var(--accent2)' : 'transparent',
        marginBottom: '2px',
        fontSize: '13.5px',
        fontWeight: isActive ? '600' : '400',
        transition: 'all 0.15s',
        letterSpacing: '0.01em',
        boxShadow: isActive ? '0 0 16px var(--accent-glow)' : 'none',
      })}
      onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text3)' } }}
      onMouseLeave={e => { if (!e.currentTarget.getAttribute('aria-current')) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '' } }}
    >
      <span style={{ fontSize: '16px', opacity: 0.9 }}>{icon}</span>
      {label}
    </NavLink>
  )
}