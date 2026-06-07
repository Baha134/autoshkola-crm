// ПОЛНЫЙ ФАЙЛ: client/src/components/Layout.jsx
// Изменения vs этап 3: добавлен пункт "Расписание" в меню

import { Outlet, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../store/auth.store'
import { useQuery } from '@tanstack/react-query'
import api from '../api'
import dayjs from 'dayjs'

function isCallToday(lead) {
  if (!lead.nextCallAt) return false
  return dayjs(lead.nextCallAt).isSame(dayjs(), 'day')
}
function isCallOverdue(lead) {
  if (!lead.nextCallAt) return false
  return dayjs(lead.nextCallAt).isBefore(dayjs(), 'day')
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data),
    refetchInterval: 60_000,
  })

  const alertCount = leads.filter(l =>
    (isCallToday(l) || isCallOverdue(l)) &&
    l.status !== 'rejected' && l.status !== 'graduated'
  ).length

  const navItems = [
    { to: '/',           icon: '◈', label: 'Дашборд'     },
    { to: '/leads',      icon: '◉', label: 'Лиды'        },
    { to: '/reminders',  icon: '🔔', label: 'Напоминания', badge: alertCount },
    { to: '/schedule',   icon: '📅', label: 'Расписание'  },
    { to: '/payments',   icon: '◷', label: 'Платежи'     },
    ...(user?.role === 'admin' ? [{ to: '/users', icon: '◎', label: 'Сотрудники' }] : []),
  ]

  const linkStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '9px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? 'var(--text3)' : 'var(--text)',
    background: isActive ? 'var(--bg4)' : 'transparent',
    transition: 'all 0.15s',
    position: 'relative',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100svh', background: 'var(--bg)' }}>

      <div
        className="mobile-overlay"
        onClick={() => setSidebarOpen(false)}
        style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
      />

      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`} style={{
        width: '220px', flexShrink: 0,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '16px 12px', zIndex: 50,
      }}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} style={{
          display: 'none', alignSelf: 'flex-end', marginBottom: '8px',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '20px', padding: '4px',
        }}>✕</button>

        {/* Лого */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px', marginBottom: '20px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent) 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '17px', boxShadow: '0 0 16px var(--accent-glow)',
          }}>🚗</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text3)', lineHeight: 1.2 }}>AutoCRM</div>
            <div style={{ fontSize: '10px', color: 'var(--text)', marginTop: '1px' }}>Автошкола</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => linkStyle(isActive)}
              onMouseEnter={e => { if (!e.currentTarget.style.background.includes('bg4')) e.currentTarget.style.background = 'var(--bg3)' }}
              onMouseLeave={e => { if (!e.currentTarget.style.background.includes('bg4')) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  minWidth: '18px', height: '18px', borderRadius: '9px',
                  background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Профиль */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              background: user?.role === 'admin'
                ? 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)'
                : 'linear-gradient(135deg, var(--green) 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '13px', fontWeight: '700',
            }}>
              {(user?.name || 'U')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text)', marginTop: '1px' }}>{user?.role === 'admin' ? 'Администратор' : 'Менеджер'}</div>
            </div>
          </div>
          <button onClick={logout} style={{
            width: '100%', padding: '8px', background: 'var(--bg3)',
            border: '1px solid var(--border)', borderRadius: '8px',
            cursor: 'pointer', fontSize: '12px', color: 'var(--text)', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--red)'; e.target.style.color = 'var(--red)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text)' }}
          >
            Выйти
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="mobile-header" style={{
          display: 'none', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text3)', padding: '4px' }}>☰</button>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text3)' }}>🚗 AutoCRM</div>
          {alertCount > 0 && (
            <div style={{ padding: '4px 10px', borderRadius: '100px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '11px', color: '#ef4444', fontWeight: '700' }}>
              🔔 {alertCount}
            </div>
          )}
        </header>

        <main className="main-content" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
