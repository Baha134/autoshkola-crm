import { Outlet, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/auth.store'
import { useQuery } from '@tanstack/react-query'
import api from '../api'
import dayjs from 'dayjs'

// ─── Тема ───────────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('crm-theme') || 'dark'
  })

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'light') {
      html.classList.add('theme-light')
    } else {
      html.classList.remove('theme-light')
    }
    localStorage.setItem('crm-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isCallToday(lead) {
  if (!lead.nextCallAt) return false
  return dayjs(lead.nextCallAt).isSame(dayjs(), 'day')
}
function isCallOverdue(lead) {
  if (!lead.nextCallAt) return false
  return dayjs(lead.nextCallAt).isBefore(dayjs(), 'day')
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function Layout() {
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()

  // Закрывать sidebar при resize до desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Запрещать скролл body когда sidebar открыт
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

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
    { to: '/',          icon: '◈', label: 'Дашборд'    },
    { to: '/leads',     icon: '◉', label: 'Лиды'       },
    { to: '/reminders', icon: '🔔', label: 'Напоминания', badge: alertCount },
    { to: '/schedule',  icon: '📅', label: 'Расписание' },
    { to: '/payments',  icon: '◷', label: 'Платежи'    },
    ...(user?.role === 'admin' ? [{ to: '/users', icon: '◎', label: 'Сотрудники' }] : []),
  ]

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="layout-root">

      {/* Оверлей мобильного сайдбара */}
      <div
        className={`mobile-overlay${sidebarOpen ? ' overlay-visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* ─── Сайдбар ─────────────────────────────────────────────────────── */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        {/* Кнопка закрыть (только мобиль) */}
        <button className="sidebar-close" onClick={closeSidebar}>✕</button>

        {/* Лого */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 4px', marginBottom: '20px',
        }}>
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

        {/* Навигация */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={closeSidebar}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', borderRadius: '9px',
                textDecoration: 'none', fontSize: '13px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? 'var(--text3)' : 'var(--text)',
                background: isActive ? 'var(--bg4)' : 'transparent',
                transition: 'all 0.15s',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.style.background?.includes('bg4'))
                  e.currentTarget.style.background = 'var(--bg3)'
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.style.background?.includes('bg4'))
                  e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
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

        {/* Профиль + кнопки */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
          {/* Пользователь */}
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
              <div style={{
                fontSize: '12px', fontWeight: '600', color: 'var(--text3)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text)', marginTop: '1px' }}>
                {user?.role === 'admin' ? 'Администратор' : 'Менеджер'}
              </div>
            </div>
          </div>

          {/* Переключатель темы */}
          <button className="theme-btn" onClick={toggleTheme}>
            <span className="theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>
          </button>

          {/* Выйти */}
          <button
            onClick={logout}
            style={{
              width: '100%', padding: '8px',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '8px', cursor: 'pointer', fontSize: '12px',
              color: 'var(--text)', transition: 'all 0.15s', fontFamily: 'var(--font)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--red)'
              e.currentTarget.style.color = 'var(--red)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text)'
            }}
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* ─── Основной контент ─────────────────────────────────────────────── */}
      <div className="layout-body">

        {/* Мобильная шапка */}
        <header className="mobile-header">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '22px', color: 'var(--text3)', padding: '4px', lineHeight: 1,
            }}
          >
            ☰
          </button>

          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text3)' }}>
            🚗 AutoCRM
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Мини-переключатель темы */}
            <button
              onClick={toggleTheme}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '18px', padding: '4px', lineHeight: 1,
              }}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {alertCount > 0 && (
              <div style={{
                padding: '4px 10px', borderRadius: '100px',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
                fontSize: '11px', color: '#ef4444', fontWeight: '700',
              }}>
                🔔 {alertCount}
              </div>
            )}
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}