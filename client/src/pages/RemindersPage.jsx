import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.locale('ru')
dayjs.extend(relativeTime)

const STATUS_LABELS = {
  new: 'Новый', contacted: 'Связались', enrolled: 'Записан',
  studying: 'Учится', graduated: 'Сдал экзамен', rejected: 'Отказ',
}
const STATUS_COLORS = {
  new: '#3b82f6', contacted: '#f59e0b', enrolled: '#8b5cf6',
  studying: '#06b6d4', graduated: '#10b981', rejected: '#ef4444',
}

function isCallToday(lead) {
  if (!lead.nextCallAt) return false
  return dayjs(lead.nextCallAt).isSame(dayjs(), 'day')
}
function isCallOverdue(lead) {
  if (!lead.nextCallAt) return false
  return dayjs(lead.nextCallAt).isBefore(dayjs(), 'day')
}
function isInactive(lead) {
  // Нет активности более 3 дней: смотрим на updatedAt
  return dayjs().diff(dayjs(lead.updatedAt), 'day') >= 3
}
function inactiveDays(lead) {
  return dayjs().diff(dayjs(lead.updatedAt), 'day')
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'var(--text)'
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '600',
      background: color + '18', color, border: `1px solid ${color}30`, whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function LeadRow({ lead, highlight, onCall, onSnooze }) {
  const today = isCallToday(lead)
  const overdue = isCallOverdue(lead)
  const inactive = isInactive(lead)
  const days = inactiveDays(lead)

  let rowBg = 'transparent'
  if (overdue) rowBg = 'rgba(239,68,68,0.04)'
  else if (today) rowBg = 'rgba(245,158,11,0.04)'
  else if (inactive && highlight === 'inactive') rowBg = 'rgba(239,68,68,0.03)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '12px 16px',
      background: rowBg,
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
      onMouseLeave={e => e.currentTarget.style.background = rowBg}
    >
      {/* Иконка статуса */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
        background: overdue ? 'rgba(239,68,68,0.12)' : today ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px',
      }}>
        {overdue ? '⚠️' : today ? '🔔' : '😴'}
      </div>

      {/* Имя + телефон */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text3)', marginBottom: '2px' }}>
          {lead.name}
        </div>
        <a href={`tel:${lead.phone}`} style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--mono)', textDecoration: 'none' }}>
          {lead.phone}
        </a>
      </div>

      {/* Статус */}
      <StatusBadge status={lead.status} />

      {/* Звонок / активность */}
      <div style={{ minWidth: '130px', textAlign: 'right' }}>
        {highlight === 'call' && lead.nextCallAt && (
          <div>
            <div style={{
              fontSize: '13px', fontWeight: '700',
              color: overdue ? '#ef4444' : today ? '#f59e0b' : 'var(--text2)',
              fontFamily: 'var(--mono)',
            }}>
              {dayjs(lead.nextCallAt).format('DD.MM.YYYY')}
            </div>
            <div style={{ fontSize: '11px', color: overdue ? '#ef4444' : 'var(--text)', marginTop: '1px' }}>
              {overdue
                ? `просрочен ${dayjs(lead.nextCallAt).fromNow()}`
                : 'сегодня'}
            </div>
          </div>
        )}
        {highlight === 'inactive' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444', fontFamily: 'var(--mono)' }}>
              {days} {days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '1px' }}>без активности</div>
          </div>
        )}
      </div>

      {/* Менеджер */}
      <div style={{ minWidth: '90px', fontSize: '12px', color: 'var(--text)', textAlign: 'right' }}>
        {lead.manager?.name || <span style={{ opacity: 0.4 }}>—</span>}
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <a
          href={`tel:${lead.phone}`}
          style={{
            padding: '6px 12px', background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)', borderRadius: '7px',
            color: '#10b981', fontSize: '12px', fontWeight: '600',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          📞 Звонить
        </a>
        {lead.nextCallAt && (
          <button
            onClick={() => onSnooze(lead)}
            title="Перенести на завтра"
            style={{
              padding: '6px 10px', background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)', borderRadius: '7px',
              cursor: 'pointer', fontSize: '13px',
            }}
          >
            ⏰
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, count, color, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: 'var(--bg2)', border: `1px solid ${count > 0 ? color + '35' : 'var(--border)'}`,
      borderRadius: '12px', overflow: 'hidden', animation: 'fadeIn 0.35s ease both',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text3)', flex: 1 }}>{title}</span>
        {count > 0 ? (
          <span style={{
            padding: '3px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700',
            background: color + '18', color, border: `1px solid ${color}35`,
          }}>{count}</span>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: '600' }}>✓ Всё чисто</span>
        )}
        <span style={{ fontSize: '12px', color: 'var(--text)', marginLeft: '4px', transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${count > 0 ? color + '20' : 'var(--border)'}` }}>
          {count === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text)', fontSize: '13px', opacity: 0.6 }}>
              Нет записей
            </div>
          ) : children}
        </div>
      )}
    </div>
  )
}

export default function RemindersPage() {
  const qc = useQueryClient()

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data),
    refetchInterval: 30_000,
  })

  // Группировки
  const overdue  = leads.filter(l => isCallOverdue(l) && l.status !== 'rejected' && l.status !== 'graduated')
  const today    = leads.filter(l => isCallToday(l)   && l.status !== 'rejected' && l.status !== 'graduated')
  const inactive = leads
    .filter(l => isInactive(l) && !l.nextCallAt && l.status !== 'rejected' && l.status !== 'graduated')
    .sort((a, b) => inactiveDays(b) - inactiveDays(a))

  // Snooze — перенести звонок на завтра
  const handleSnooze = async (lead) => {
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    await api.put(`/leads/${lead.id}`, { ...lead, nextCallAt: tomorrow })
    qc.invalidateQueries(['leads'])
  }

  const totalAlerts = overdue.length + today.length + inactive.length

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>🔔</div>
      Загрузка...
    </div>
  )

  return (
    <div style={{ maxWidth: '900px', animation: 'fadeIn 0.3s ease both' }}>

      {/* Заголовок */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Напоминания
            {totalAlerts > 0 && (
              <span style={{
                marginLeft: '10px', fontSize: '13px', fontWeight: '700',
                padding: '3px 10px', borderRadius: '100px',
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>{totalAlerts}</span>
            )}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>
            {dayjs().format('dddd, D MMMM YYYY')}
          </div>
        </div>
        {totalAlerts === 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: '10px', fontSize: '13px', color: '#10b981', fontWeight: '600',
          }}>
            ✓ Всё под контролем, задач нет!
          </div>
        )}
      </div>

      {/* ── Блок: Просроченные звонки ── */}
      <div style={{ marginBottom: '12px' }}>
        <Section title="Просроченные звонки" count={overdue.length} color="#ef4444" icon="⚠️">
          {overdue.map(lead => (
            <LeadRow key={lead.id} lead={lead} highlight="call" onSnooze={handleSnooze} />
          ))}
        </Section>
      </div>

      {/* ── Блок: Звонки сегодня ── */}
      <div style={{ marginBottom: '12px' }}>
        <Section title="Звонки сегодня" count={today.length} color="#f59e0b" icon="🔔">
          {today.map(lead => (
            <LeadRow key={lead.id} lead={lead} highlight="call" onSnooze={handleSnooze} />
          ))}
        </Section>
      </div>

      {/* ── Блок: Нет активности 3+ дней ── */}
      <div style={{ marginBottom: '12px' }}>
        <Section title="Нет активности 3+ дней" count={inactive.length} color="#ef4444" icon="😴" defaultOpen={false}>
          {inactive.map(lead => (
            <LeadRow key={lead.id} lead={lead} highlight="inactive" onSnooze={handleSnooze} />
          ))}
        </Section>
      </div>

      {/* ── Пояснение ── */}
      <div style={{
        marginTop: '20px', padding: '14px 18px',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: '10px', fontSize: '12px', color: 'var(--text)', lineHeight: '1.8',
      }}>
        <strong style={{ color: 'var(--text2)' }}>Как работает:</strong>
        <span style={{ marginLeft: '8px' }}>
          ⚠️ Просроченные — дата звонка прошла. 
          🔔 Сегодня — звонить именно сегодня. 
          😴 Неактивные — нет изменений более 3 дней (устанавливай дату звонка прямо из карточки лида).
          ⏰ Кнопка переносит звонок на завтра.
        </span>
      </div>
    </div>
  )
}
