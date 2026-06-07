import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import api from '../api'
import toast from 'react-hot-toast'

// Синхронизируем тему и на странице логина
function useThemeSync() {
  const [theme, setTheme] = useState(() => localStorage.getItem('crm-theme') || 'dark')
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'light') html.classList.add('theme-light')
    else html.classList.remove('theme-light')
    localStorage.setItem('crm-theme', theme)
  }, [theme])
  return { theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }
}

export default function LoginPage() {
  const [email, setEmail]       = useState('admin@autoshkola.kz')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading]   = useState(false)
  const setAuth  = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useThemeSync()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setAuth(data.token, data.user)
      navigate('/leads')
    } catch {
      toast.error('Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '20px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Декоративные круги */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '8%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Кнопка темы — верхний правый угол */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        style={{
          position: 'fixed', top: '16px', right: '16px',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '50%', width: '40px', height: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '18px', zIndex: 10,
          boxShadow: 'var(--shadow)', transition: 'all 0.15s',
        }}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>

      {/* Карточка логина */}
      <div style={{
        width: '100%', maxWidth: '400px',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '40px',
        boxShadow: '0 8px 48px rgba(0,0,0,0.25)',
        position: 'relative', animation: 'fadeIn 0.4s ease both',
      }}>
        {/* Лого */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px',
            background: 'linear-gradient(135deg, var(--accent) 0%, #1d4ed8 100%)',
            borderRadius: '14px', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', boxShadow: '0 0 32px var(--accent-glow)',
          }}>🚗</div>
          <h1 style={{ color: 'var(--text3)', fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>
            Автошкола CRM
          </h1>
          <p style={{ color: 'var(--text)', fontSize: '13px', margin: 0 }}>
            Ассоциация автошкол Казахстана
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: '28px' }}>
            <label style={labelStyle}>Пароль</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? 'var(--bg4)' : 'linear-gradient(135deg, var(--accent) 0%, #1d4ed8 100%)',
              color: loading ? 'var(--text)' : 'white',
              border: 'none', borderRadius: 'var(--radius)',
              fontSize: '14px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em', transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 16px var(--accent-glow)',
              fontFamily: 'var(--font)',
            }}
          >
            {loading ? 'Вход...' : 'Войти в систему'}
          </button>
        </form>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', marginBottom: '6px',
  fontSize: '12px', color: 'var(--text)',
  fontWeight: '500', letterSpacing: '0.05em',
  textTransform: 'uppercase',
}
const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text3)',
  fontSize: '14px', outline: 'none',
  transition: 'border-color 0.15s', boxSizing: 'border-box',
  fontFamily: 'var(--font)',
}