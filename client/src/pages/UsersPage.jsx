import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/auth.store'

const STATUS_LABELS = {
  new: 'Новый',
  in_progress: 'В работе',
  done: 'Сдал',
  rejected: 'Отказ',
}
const STATUS_COLORS = {
  new: '#3b82f6',
  in_progress: '#f59e0b',
  done: '#10b981',
  rejected: '#ef4444',
}

// ─── Маленькая мини-диаграмма статусов ───────────────────────────────────────
function StatusMini({ byStatus, total }) {
  if (!total) return <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.5 }}>Нет лидов</span>
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {byStatus.filter(s => s.count > 0).map(s => (
        <span key={s.status} style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', padding: '2px 8px', borderRadius: '100px',
          background: STATUS_COLORS[s.status] + '18',
          color: STATUS_COLORS[s.status],
          border: `1px solid ${STATUS_COLORS[s.status]}30`,
          fontWeight: '600',
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: STATUS_COLORS[s.status], display: 'inline-block' }} />
          {STATUS_LABELS[s.status]}: {s.count}
        </span>
      ))}
    </div>
  )
}

// ─── Карточка менеджера с прогрессом ─────────────────────────────────────────
function ManagerCard({ m, rank, onDelete, isMe }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${isMe ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
      borderRadius: '14px',
      overflow: 'hidden',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxShadow: isMe ? '0 0 0 1px rgba(59,130,246,0.12)' : 'none',
      animation: 'fadeIn 0.3s ease both',
    }}>
      {/* Верхняя часть: аватар + имя + метрики */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>

        {/* Ранг + аватар */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: m.role === 'admin'
              ? 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)'
              : 'linear-gradient(135deg, var(--green) 0%, #059669 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '17px', fontWeight: '700',
          }}>
            {(m.name || 'U')[0].toUpperCase()}
          </div>
          {rank <= 3 && m.total > 0 && (
            <div style={{
              position: 'absolute', top: '-4px', right: '-4px',
              fontSize: '13px', lineHeight: 1,
            }}>
              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
            </div>
          )}
        </div>

        {/* Имя + email + роль */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text3)' }}>{m.name}</span>
            {isMe && (
              <span style={{
                fontSize: '10px', padding: '1px 7px', borderRadius: '100px',
                background: 'rgba(59,130,246,0.15)', color: 'var(--accent)',
                border: '1px solid rgba(59,130,246,0.25)', fontWeight: '600',
              }}>Это вы</span>
            )}
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '100px', fontWeight: '600',
              background: m.role === 'admin' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.1)',
              color: m.role === 'admin' ? 'var(--accent)' : 'var(--green)',
              border: `1px solid ${m.role === 'admin' ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.18)'}`,
            }}>
              {m.role === 'admin' ? '⬡ Админ' : '◈ Менеджер'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.email}
          </div>
        </div>

        {/* Три ключевые метрики */}
        <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
          <MetricPill label="Лидов" value={m.total} color="var(--accent)" />
          <MetricPill label="Конверсия" value={`${m.conversion}%`} color={m.conversion >= 50 ? 'var(--green)' : m.conversion >= 20 ? 'var(--amber)' : 'var(--red)'} />
          <MetricPill label="Месяц" value={m.monthRevenue > 0 ? m.monthRevenue.toLocaleString() + ' ₸' : '—'} color="var(--purple)" />
        </div>

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              padding: '6px 10px',
              background: expanded ? 'rgba(59,130,246,0.15)' : 'var(--bg3)',
              border: `1px solid ${expanded ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
              borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              color: expanded ? 'var(--accent)' : 'var(--text)',
              transition: 'all 0.15s',
            }}
            title="Подробнее"
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            onClick={() => { if (confirm(`Удалить ${m.name}?`)) onDelete(m.id) }}
            style={{
              padding: '6px 9px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          >🗑️</button>
        </div>
      </div>

      {/* Прогресс-бар конверсии */}
      {m.total > 0 && (
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text)', marginBottom: '4px' }}>
            <span>Конверсия: {m.done} из {m.total} завершено</span>
            <span style={{ color: m.conversion >= 50 ? 'var(--green)' : m.conversion >= 20 ? 'var(--amber)' : 'var(--red)', fontWeight: '700' }}>
              {m.conversion}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${m.conversion}%`,
              background: m.conversion >= 50 ? 'var(--green)' : m.conversion >= 20 ? 'var(--amber)' : 'var(--red)',
              borderRadius: '2px',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Развёрнутая статистика */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '16px 20px',
          background: 'var(--bg3)',
          animation: 'slideDown 0.2s ease both',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
            <ExpandedStat icon="◈" label="Всего лидов" value={m.total} color="var(--accent)" />
            <ExpandedStat icon="✓" label="Завершено" value={m.done} color="var(--green)" />
            <ExpandedStat icon="📅" label="Сегодня" value={m.newToday} color="#06b6d4" />
            <ExpandedStat icon="📆" label="За неделю" value={m.newWeek} color="var(--purple)" />
            <ExpandedStat icon="💰" label="Выручка всего" value={m.revenue > 0 ? m.revenue.toLocaleString() + ' ₸' : '—'} color="var(--green)" />
            <ExpandedStat icon="📊" label="Выручка месяц" value={m.monthRevenue > 0 ? m.monthRevenue.toLocaleString() + ' ₸' : '—'} color="var(--purple)" />
            {m.totalDebt > 0 && (
              <ExpandedStat icon="⚠️" label="Долги учеников" value={m.totalDebt.toLocaleString() + ' ₸'} color="var(--red)" />
            )}
          </div>

          {/* Статусы */}
          {m.total > 0 && (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px', fontWeight: '600' }}>
                Распределение по статусам
              </div>
              <StatusMini byStatus={m.byStatus} total={m.total} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricPill({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '60px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: '700', color, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )
}

function ExpandedStat({ icon, label, value, color }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
    }}>
      <div style={{ fontSize: '16px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '10px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: '700', color, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )
}

// ─── Сводная таблица-рейтинг ──────────────────────────────────────────────────
function Leaderboard({ stats }) {
  if (!stats || stats.every(m => m.total === 0)) return null
  const sorted = [...stats].filter(m => m.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '18px 20px',
      marginBottom: '16px',
      animation: 'fadeIn 0.3s ease both',
    }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text3)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🏆 Рейтинг менеджеров
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.map((m, i) => {
          const maxTotal = sorted[0].total
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '20px', fontSize: '13px', textAlign: 'center', flexShrink: 0 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </div>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '11px', fontWeight: '700',
              }}>
                {(m.name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text3)' }}>{m.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {m.total} лидов · {m.conversion}%
                  </span>
                </div>
                <div style={{ height: '3px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(m.total / maxTotal) * 100}%`,
                    background: i === 0 ? 'var(--green)' : i === 1 ? 'var(--accent)' : 'var(--purple)',
                    borderRadius: '2px',
                    transition: 'width 0.7s ease',
                  }} />
                </div>
              </div>
              <div style={{
                fontSize: '12px', fontWeight: '700', color: 'var(--green)',
                fontFamily: 'var(--mono)', whiteSpace: 'nowrap', minWidth: '80px', textAlign: 'right',
              }}>
                {m.monthRevenue > 0 ? m.monthRevenue.toLocaleString() + ' ₸' : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────
export default function UsersPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const isAdmin = currentUser?.role === 'admin'
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager' })

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data)
  })

  const { data: statsData } = useQuery({
    queryKey: ['users-stats'],
    queryFn: () => api.get('/users/stats').then(r => r.data),
    enabled: isAdmin,
  })

  const stats = statsData?.stats || []
  const noManagerCount = statsData?.noManagerCount || 0

  // Объединяем users с их статистикой
  const enriched = users.map(u => {
    const s = stats.find(m => m.id === u.id) || {}
    return {
      ...u,
      total: s.total || 0,
      done: s.done || 0,
      conversion: s.conversion || 0,
      revenue: s.revenue || 0,
      monthRevenue: s.monthRevenue || 0,
      totalDebt: s.totalDebt || 0,
      newToday: s.newToday || 0,
      newWeek: s.newWeek || 0,
      byStatus: s.byStatus || [],
    }
  }).sort((a, b) => b.total - a.total)

  const createMutation = useMutation({
    mutationFn: data => api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      qc.invalidateQueries(['users-stats'])
      toast.success('✓ Пользователь добавлен')
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'manager' })
    },
    onError: e => toast.error(e.response?.data?.error || 'Ошибка')
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      qc.invalidateQueries(['users-stats'])
      toast.success('Удалён')
    }
  })

  const handleSubmit = (e) => { e.preventDefault(); createMutation.mutate(form) }

  if (usersLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>◉</div>
      Загрузка...
    </div>
  )

  return (
    <div style={{ maxWidth: '900px', animation: 'fadeIn 0.3s ease both' }}>

      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Менеджеры
            <span style={{ marginLeft: '10px', fontSize: '14px', color: 'var(--text)', fontWeight: '400', fontFamily: 'var(--mono)' }}>{users.length}</span>
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>
            Сотрудники, доступы и статистика
            {noManagerCount > 0 && (
              <span style={{
                marginLeft: '10px', padding: '2px 9px', borderRadius: '100px',
                background: 'rgba(239,68,68,0.12)', color: 'var(--red)',
                border: '1px solid rgba(239,68,68,0.22)', fontSize: '12px', fontWeight: '600',
              }}>
                ⚠ {noManagerCount} лидов без менеджера
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} style={btnPrimary}>
            + Добавить
          </button>
        )}
      </div>

      {/* Форма добавления */}
      {showForm && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          padding: '22px', borderRadius: '14px', marginBottom: '16px',
          animation: 'slideDown 0.2s ease both', boxShadow: 'var(--shadow)',
        }}>
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
              <button type="submit" disabled={createMutation.isPending} style={btnPrimary}>
                {createMutation.isPending ? '...' : 'Добавить'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Рейтинг — только для admin и если есть данные */}
      {isAdmin && <Leaderboard stats={enriched} />}

      {/* Список менеджеров */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {enriched.map((u, i) => (
          isAdmin
            ? <ManagerCard
                key={u.id}
                m={u}
                rank={i + 1}
                onDelete={id => deleteMutation.mutate(id)}
                isMe={u.id === currentUser?.id}
              />
            : <SimpleUserCard key={u.id} u={u} isMe={u.id === currentUser?.id} />
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

// Простая карточка для неадминов (видят только себя и коллег)
function SimpleUserCard({ u, isMe }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${isMe ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
      borderRadius: '12px', padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text3)' }}>{u.name}</span>
          {isMe && <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '100px', background: 'rgba(59,130,246,0.15)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.25)', fontWeight: '600' }}>Это вы</span>}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{u.email}</div>
      </div>
      <span style={{
        padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: '600',
        background: u.role === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.12)',
        color: u.role === 'admin' ? 'var(--accent)' : 'var(--green)',
        border: `1px solid ${u.role === 'admin' ? 'rgba(59,130,246,0.25)' : 'rgba(16,185,129,0.2)'}`,
      }}>
        {u.role === 'admin' ? '⬡ Админ' : '◈ Менеджер'}
      </span>
    </div>
  )
}

const inputStyle = {
  padding: '9px 12px', background: 'var(--bg3)',
  border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text3)', fontSize: '13px', outline: 'none',
  boxSizing: 'border-box', width: '100%',
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const btnPrimary = {
  padding: '9px 20px', background: 'var(--accent2)',
  color: 'white', border: 'none', borderRadius: '8px',
  cursor: 'pointer', fontSize: '13px', fontWeight: '600',
  boxShadow: '0 2px 8px var(--accent-glow)',
}
const btnSecondary = {
  padding: '9px 18px', background: 'var(--bg3)',
  color: 'var(--text2)', border: '1px solid var(--border)',
  borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
}
