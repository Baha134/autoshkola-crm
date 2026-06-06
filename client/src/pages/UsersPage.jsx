import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager' })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      toast.success('Пользователь добавлен')
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'manager' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('Пользователь удалён') }
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>◉</div>
      Загрузка...
    </div>
  )

  return (
    <div style={{ maxWidth: '780px', animation: 'fadeIn 0.3s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Пользователи
            <span style={{ marginLeft: '10px', fontSize: '14px', color: 'var(--text)', fontWeight: '400', fontFamily: 'var(--mono)' }}>{users.length}</span>
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>Сотрудники и доступы</div>
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>
          + Добавить
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '22px', borderRadius: '12px', marginBottom: '16px', animation: 'slideDown 0.2s ease both', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text3)' }}>+ Новый пользователь</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="Имя" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={inputStyle} />
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required style={inputStyle} />
            <input type="password" placeholder="Пароль" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required style={inputStyle} />
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={selectStyle}>
              <option value="manager">Менеджер</option>
              <option value="admin">Администратор</option>
            </select>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px' }}>
              <button type="submit" style={btnPrimary}>Добавить</button>
              <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Список пользователей */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {users.map(u => (
          <div
            key={u.id}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {/* Аватар */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: u.role === 'admin'
                ? 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)'
                : 'linear-gradient(135deg, var(--green) 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '15px', fontWeight: '700',
            }}>
              {(u.name || 'U')[0].toUpperCase()}
            </div>

            {/* Инфо */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text3)', marginBottom: '2px' }}>{u.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
            </div>

            {/* Роль */}
            <span style={{
              padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: '600',
              background: u.role === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.12)',
              color: u.role === 'admin' ? 'var(--accent)' : 'var(--green)',
              border: `1px solid ${u.role === 'admin' ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.2)'}`,
              whiteSpace: 'nowrap',
            }}>
              {u.role === 'admin' ? '⬡ Админ' : '◈ Менеджер'}
            </span>

            {/* Удалить */}
            <button
              onClick={() => { if (confirm('Удалить пользователя?')) deleteMutation.mutate(u.id) }}
              style={{
                padding: '7px 10px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.18)'}
              onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.08)'}
            >🗑️</button>
          </div>
        ))}

        {users.length === 0 && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '48px', textAlign: 'center', color: 'var(--text)', fontSize: '14px',
          }}>
            ◉ Пользователей пока нет
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '9px 12px',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text3)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const btnPrimary = {
  padding: '9px 20px',
  background: 'var(--accent2)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600',
  boxShadow: '0 2px 8px var(--accent-glow)',
}
const btnSecondary = {
  padding: '9px 18px',
  background: 'var(--bg3)',
  color: 'var(--text2)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '13px',
}