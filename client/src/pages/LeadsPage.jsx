import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

// ─── Константы ──────────────────────────────────────────────────────────────

const STATUSES = ['new', 'contacted', 'enrolled', 'studying', 'graduated', 'rejected']
const STATUS_LABELS = {
  new: 'Новый', contacted: 'Связались', enrolled: 'Записан',
  studying: 'Учится', graduated: 'Сдал экзамен', rejected: 'Отказ',
}
const STATUS_COLORS = {
  new: '#3b82f6', contacted: '#f59e0b', enrolled: '#8b5cf6',
  studying: '#06b6d4', graduated: '#10b981', rejected: '#ef4444',
}
const SOURCES = ['manual', 'whatsapp', 'instagram', 'website']
const SOURCE_LABELS = { manual: 'Вручную', whatsapp: 'WhatsApp', instagram: 'Instagram', website: 'Сайт' }
const EVENT_TYPES = ['comment', 'call', 'status_change']
const EVENT_LABELS = { comment: '💬 Комментарий', call: '📞 Звонок', status_change: '🔄 Изменение' }
const EVENT_ICONS = { comment: '💬', call: '📞', status_change: '🔄' }
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// ─── Утилиты ────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('ru-RU') + ' ₸'
}

function isCallToday(lead) {
  if (!lead.nextCallAt) return false
  return dayjs(lead.nextCallAt).isSame(dayjs(), 'day')
}

function isCallOverdue(lead) {
  if (!lead.nextCallAt) return false
  return dayjs(lead.nextCallAt).isBefore(dayjs(), 'day')
}

// ─── Компонент: Финансовый блок ──────────────────────────────────────────────

function FinanceBlock({ lead, onUpdate }) {
  const [courseAmount, setCourseAmount] = useState(lead.courseAmount ?? 0)
  const [saving, setSaving] = useState(false)

  const paid = lead.paid ?? 0
  const debt = Math.max(0, courseAmount - paid)
  const paidPct = courseAmount > 0 ? Math.min(100, Math.round((paid / courseAmount) * 100)) : 0

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({ courseAmount: Number(courseAmount) })
    setSaving(false)
    toast.success('Стоимость курса сохранена')
  }

  return (
    <div style={{ marginTop: '0', padding: '16px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <div style={sectionTitle}>💰 Финансы</div>

      {/* Прогресс оплаты */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Оплачено {paidPct}%
          </span>
          <span style={{ fontSize: '11px', color: paidPct === 100 ? '#10b981' : 'var(--text)', fontWeight: '600' }}>
            {fmt(paid)} / {fmt(courseAmount)}
          </span>
        </div>
        <div style={{ height: '6px', background: 'var(--bg4)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${paidPct}%`,
            background: paidPct === 100 ? '#10b981' : paidPct > 50 ? '#f59e0b' : '#3b82f6',
            borderRadius: '99px',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Три карточки */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
        {[
          { label: 'Стоимость', value: fmt(courseAmount), color: 'var(--text3)' },
          { label: 'Оплачено', value: fmt(paid), color: '#10b981' },
          { label: 'Долг', value: debt > 0 ? fmt(debt) : '—', color: debt > 0 ? '#ef4444' : '#10b981' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--text)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {label}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Редактировать стоимость курса */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="number"
            value={courseAmount}
            onChange={e => setCourseAmount(e.target.value)}
            placeholder="Стоимость курса"
            style={{ ...inputStyle, paddingRight: '30px' }}
          />
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text)' }}>₸</span>
        </div>
        <button onClick={handleSave} disabled={saving} style={btnPrimary}>
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}

// ─── Компонент: Напоминание о звонке ─────────────────────────────────────────

function NextCallBlock({ lead, onUpdate }) {
  const [date, setDate] = useState(
    lead.nextCallAt ? dayjs(lead.nextCallAt).format('YYYY-MM-DD') : ''
  )
  const [saving, setSaving] = useState(false)

  const today = isCallToday(lead)
  const overdue = isCallOverdue(lead)

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({ nextCallAt: date ? date : null })
    setSaving(false)
    toast.success(date ? 'Напоминание установлено' : 'Напоминание убрано')
  }

  const handleClear = async () => {
    setDate('')
    setSaving(true)
    await onUpdate({ nextCallAt: null })
    setSaving(false)
    toast.success('Напоминание убрано')
  }

  return (
    <div style={{
      padding: '16px', background: 'var(--bg3)', borderRadius: '10px',
      border: `1px solid ${overdue ? '#ef444440' : today ? '#f59e0b40' : 'var(--border)'}`,
      marginTop: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={sectionTitle}>📞 Следующий звонок</span>
        {today && (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#f59e0b20', color: '#f59e0b', fontWeight: '700', border: '1px solid #f59e0b40' }}>
            СЕГОДНЯ
          </span>
        )}
        {overdue && (
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: '#ef444420', color: '#ef4444', fontWeight: '700', border: '1px solid #ef444440' }}>
            ПРОСРОЧЕН
          </span>
        )}
      </div>

      {lead.nextCallAt && (
        <div style={{ fontSize: '14px', fontWeight: '600', color: overdue ? '#ef4444' : today ? '#f59e0b' : 'var(--text3)', marginBottom: '10px' }}>
          {dayjs(lead.nextCallAt).format('DD MMMM YYYY')}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="date"
          value={date}
          min={dayjs().format('YYYY-MM-DD')}
          onChange={e => setDate(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={handleSave} disabled={saving} style={btnPrimary}>
          {saving ? '...' : 'Сохранить'}
        </button>
        {date && (
          <button onClick={handleClear} disabled={saving} style={btnSecondary}>✕</button>
        )}
      </div>
    </div>
  )
}

// ─── Компонент: Расписание занятий ───────────────────────────────────────────

function LeadSchedule({ lead, onUpdate }) {
  const [days, setDays] = useState(lead.scheduleDays ? JSON.parse(lead.scheduleDays) : [])
  const [time, setTime] = useState(lead.scheduleTime || '')
  const [saving, setSaving] = useState(false)

  const toggleDay = (day) =>
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({ scheduleDays: JSON.stringify(days), scheduleTime: time })
    setSaving(false)
    toast.success('Расписание сохранено')
  }

  return (
    <div style={{ marginTop: '10px', padding: '16px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <div style={sectionTitle}>📅 Расписание занятий</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {DAYS.map(day => (
          <button key={day} onClick={() => toggleDay(day)} style={{
            padding: '6px 14px', borderRadius: '8px',
            border: '1px solid ' + (days.includes(day) ? 'var(--accent2)' : 'var(--border)'),
            background: days.includes(day) ? 'var(--accent2)' : 'var(--bg2)',
            color: days.includes(day) ? 'white' : 'var(--text)',
            cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s',
          }}>{day}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
        <button onClick={handleSave} disabled={saving} style={btnPrimary}>{saving ? 'Сохраняю...' : 'Сохранить'}</button>
      </div>
    </div>
  )
}

// ─── Компонент: История лида ─────────────────────────────────────────────────

function LeadHistory({ leadId }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [type, setType] = useState('comment')

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', leadId],
    queryFn: () => api.get(`/events/lead/${leadId}`).then(r => r.data),
  })

  const addMutation = useMutation({
    mutationFn: data => api.post('/events', data),
    onSuccess: () => { qc.invalidateQueries(['events', leadId]); setText(''); toast.success('Добавлено') },
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries(['events', leadId]),
  })

  const handleAdd = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addMutation.mutate({ leadId, type, text })
  }

  return (
    <div>
      <div style={sectionTitle}>История лида</div>
      {isLoading ? (
        <div style={{ color: 'var(--text)', fontSize: '13px' }}>Загрузка...</div>
      ) : events.length === 0 ? (
        <div style={{ color: 'var(--text)', fontSize: '13px', marginBottom: '12px' }}>Событий пока нет</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', maxHeight: '220px', overflowY: 'auto' }}>
          {events.map(ev => (
            <div key={ev.id} style={{
              display: 'flex', gap: '10px', alignItems: 'flex-start',
              padding: '8px 10px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: '15px', marginTop: '1px' }}>{EVENT_ICONS[ev.type] || '📝'}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>{ev.text}</span>
                <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '3px', fontFamily: 'var(--mono)' }}>
                  {ev.user?.name || 'Система'} · {dayjs(ev.createdAt).format('DD.MM.YYYY HH:mm')}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(ev.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border2)', fontSize: '13px', padding: '0 2px' }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
        <select value={type} onChange={e => setType(e.target.value)} style={selectStyle}>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
        </select>
        <input
          value={text} onChange={e => setText(e.target.value)}
          placeholder="Добавить запись..." style={{ ...inputStyle, flex: 1 }}
        />
        <button type="submit" disabled={!text.trim()} style={{
          padding: '8px 16px',
          background: text.trim() ? 'var(--accent2)' : 'var(--bg4)',
          color: text.trim() ? 'white' : 'var(--text)',
          border: 'none', borderRadius: '8px', cursor: text.trim() ? 'pointer' : 'not-allowed',
          fontSize: '13px', fontWeight: '500', transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}>Добавить</button>
      </form>
    </div>
  )
}

// ─── Компонент: Модалка карточки лида ────────────────────────────────────────

function LeadModal({ lead, users, onClose, onEdit, onDelete, onUpdate }) {
  const color = STATUS_COLORS[lead.status]
  const today = isCallToday(lead)
  const overdue = isCallOverdue(lead)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px',
          width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Шапка ── */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          background: 'var(--bg3)', borderRadius: '16px 16px 0 0',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text3)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
              {lead.name}
            </div>
            <a
              href={`tel:${lead.phone}`}
              style={{ fontSize: '15px', color: 'var(--accent2)', fontFamily: 'var(--mono)', marginBottom: '10px', display: 'block', textDecoration: 'none' }}
            >
              📞 {lead.phone}
            </a>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '700',
                background: color + '18', color, border: `1px solid ${color}30`,
              }}>
                {STATUS_LABELS[lead.status]}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text)', background: 'var(--bg4)', padding: '4px 10px', borderRadius: '99px', border: '1px solid var(--border)' }}>
                {SOURCE_LABELS[lead.source]}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                #{lead.id} · {dayjs(lead.createdAt).format('DD.MM.YYYY')}
              </span>
              {(today || overdue) && (
                <span style={{
                  fontSize: '11px', padding: '4px 10px', borderRadius: '99px', fontWeight: '700',
                  background: overdue ? '#ef444420' : '#f59e0b20',
                  color: overdue ? '#ef4444' : '#f59e0b',
                  border: `1px solid ${overdue ? '#ef444440' : '#f59e0b40'}`,
                }}>
                  {overdue ? '⚠️ Звонок просрочен' : '🔔 Звонок сегодня'}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button onClick={() => { onEdit(lead); onClose() }} style={iconBtn('#3b82f6')}>✏️</button>
            <button onClick={() => { if (confirm('Удалить лид?')) { onDelete(lead.id); onClose() } }} style={iconBtn('#ef4444')}>🗑️</button>
            <button onClick={onClose} style={{ ...iconBtn('#888'), fontSize: '16px' }}>✕</button>
          </div>
        </div>

        {/* ── Ответственный менеджер ── */}
        {lead.manager && (
          <div style={{
            padding: '12px 24px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0,
            }}>
              {lead.manager.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: '500' }}>Ответственный менеджер</div>
              <div style={{ fontSize: '14px', color: 'var(--text3)', fontWeight: '600' }}>{lead.manager.name}</div>
            </div>
          </div>
        )}

        {/* ── Комментарий ── */}
        {lead.comment && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', fontSize: '13px', color: 'var(--text2)' }}>
            💬 {lead.comment}
          </div>
        )}

        {/* ── Финансы ── */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <FinanceBlock lead={lead} onUpdate={onUpdate} />
          <NextCallBlock lead={lead} onUpdate={onUpdate} />
        </div>

        {/* ── История ── */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <LeadHistory leadId={lead.id} />
        </div>

        {/* ── Расписание если учится ── */}
        {lead.status === 'studying' && (
          <div style={{ padding: '20px 24px' }}>
            <LeadSchedule lead={lead} onUpdate={onUpdate} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Компонент: Карточка канбан ──────────────────────────────────────────────

function LeadCard({ lead, onEdit, onDelete, onDragStart, onClick }) {
  const color = STATUS_COLORS[lead.status]
  const today = isCallToday(lead)
  const overdue = isCallOverdue(lead)
  const debt = lead.debt ?? 0

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(lead) }}
      onClick={onClick}
      style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px',
        padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s', marginBottom: '8px',
        borderLeft: `3px solid ${overdue ? '#ef4444' : today ? '#f59e0b' : color}`,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text3)', marginBottom: '4px' }}>{lead.name}</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--mono)', marginBottom: '4px' }}>{lead.phone}</div>

      {/* Финансы на карточке */}
      {lead.courseAmount > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
          {debt > 0 ? (
            <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '99px', background: '#ef444420', color: '#ef4444', fontWeight: '600', border: '1px solid #ef444440' }}>
              Долг: {fmt(debt)}
            </span>
          ) : (
            <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '99px', background: '#10b98120', color: '#10b981', fontWeight: '600', border: '1px solid #10b98140' }}>
              ✓ Оплачено
            </span>
          )}
        </div>
      )}

      {/* Звонок */}
      {lead.nextCallAt && (
        <div style={{ fontSize: '11px', color: overdue ? '#ef4444' : today ? '#f59e0b' : 'var(--text)', marginBottom: '4px', fontWeight: overdue || today ? '600' : '400' }}>
          {overdue ? '⚠️' : today ? '🔔' : '📅'} {dayjs(lead.nextCallAt).format('DD.MM.YYYY')}
        </div>
      )}

      {lead.comment && (
        <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '6px', opacity: 0.8, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {lead.comment}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{SOURCE_LABELS[lead.source]}</span>
          {lead.manager && (
            <span style={{
              fontSize: '11px', padding: '2px 7px', borderRadius: '99px',
              background: 'var(--accent2)18', color: 'var(--accent2)',
              border: '1px solid var(--accent2)30', fontWeight: '500',
            }}>
              {lead.manager.name.split(' ')[0]}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(lead)} style={iconBtn('#3b82f6')}>✏️</button>
          <button onClick={() => { if (confirm('Удалить лид?')) onDelete(lead.id) }} style={iconBtn('#ef4444')}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

// ─── Компонент: Канбан-доска ─────────────────────────────────────────────────

function KanbanBoard({ leads, onEdit, onDelete, onStatusChange, onCardClick }) {
  const dragLead = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  const handleDrop = (status) => {
    if (dragLead.current && dragLead.current.status !== status) {
      onStatusChange(dragLead.current, status)
    }
    setDragOver(null)
    dragLead.current = null
  }

  return (
    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px' }}>
      {STATUSES.map(status => {
        const col = leads.filter(l => l.status === status)
        const color = STATUS_COLORS[status]
        const isOver = dragOver === status
        const totalDebt = col.reduce((s, l) => s + (l.debt ?? 0), 0)

        return (
          <div
            key={status}
            onDragOver={e => { e.preventDefault(); setDragOver(status) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(status)}
            style={{
              minWidth: '230px', flex: '1',
              background: isOver ? 'var(--bg3)' : 'var(--bg2)',
              border: `1px solid ${isOver ? color : 'var(--border)'}`,
              borderRadius: '12px', padding: '12px',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                {STATUS_LABELS[status]}
              </span>
              <span style={{ fontSize: '11px', background: color + '22', color, padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>
                {col.length}
              </span>
            </div>
            {/* Суммарный долг по колонке */}
            {totalDebt > 0 && (
              <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '8px', fontWeight: '600' }}>
                Общий долг: {fmt(totalDebt)}
              </div>
            )}
            <div style={{ minHeight: '60px' }}>
              {col.map(lead => (
                <LeadCard
                  key={lead.id} lead={lead}
                  onEdit={onEdit} onDelete={onDelete}
                  onDragStart={l => { dragLead.current = l }}
                  onClick={() => onCardClick(lead)}
                />
              ))}
              {col.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text)', fontSize: '12px', padding: '20px 0', opacity: 0.5 }}>Пусто</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Главная страница лидов ──────────────────────────────────────────────────

export default function LeadsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [form, setForm] = useState({
    name: '', phone: '', source: 'manual', status: 'new',
    comment: '', managerId: '', courseAmount: '', nextCallAt: '',
  })
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [modalLead, setModalLead] = useState(null)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  // При открытии модалки — берём актуальные данные из кэша
  const activeLead = useMemo(() => {
    if (!modalLead) return null
    return leads.find(l => l.id === modalLead.id) || modalLead
  }, [modalLead, leads])

  const createMutation = useMutation({
    mutationFn: data => api.post('/leads', data),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Лид добавлен'); resetForm() },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/leads/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Лид обновлён'); resetForm() },
  })
  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/leads/${id}`),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Лид удалён') },
  })

  const resetForm = () => {
    setForm({ name: '', phone: '', source: 'manual', status: 'new', comment: '', managerId: '', courseAmount: '', nextCallAt: '' })
    setShowForm(false)
    setEditLead(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      managerId: form.managerId || null,
      courseAmount: form.courseAmount ? Number(form.courseAmount) : 0,
      nextCallAt: form.nextCallAt || null,
    }
    if (editLead) updateMutation.mutate({ id: editLead.id, ...data })
    else createMutation.mutate(data)
  }

  const handleEdit = (lead) => {
    setEditLead(lead)
    setForm({
      name: lead.name,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      comment: lead.comment || '',
      managerId: lead.managerId || '',
      courseAmount: lead.courseAmount || '',
      nextCallAt: lead.nextCallAt ? dayjs(lead.nextCallAt).format('YYYY-MM-DD') : '',
    })
    setShowForm(true)
  }

  // Обновление отдельных полей из модалки (финансы, звонок, расписание)
  const handleModalUpdate = async (data) => {
    if (!activeLead) return
    await api.put(`/leads/${activeLead.id}`, { ...activeLead, ...data })
    qc.invalidateQueries(['leads'])
  }

  const handleStatusChange = (lead, newStatus) => {
    api.put(`/leads/${lead.id}`, { ...lead, status: newStatus })
      .then(() => { qc.invalidateQueries(['leads']); toast.success(`Перемещён в "${STATUS_LABELS[newStatus]}"`) })
  }

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        lead.name.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        (lead.comment || '').toLowerCase().includes(q)
      const matchStatus = !filterStatus || lead.status === filterStatus
      const matchSource = !filterSource || lead.source === filterSource
      return matchSearch && matchStatus && matchSource
    })
  }, [leads, search, filterStatus, filterSource])

  // Лиды с звонком сегодня
  const callsToday = leads.filter(isCallToday)
  const callsOverdue = leads.filter(isCallOverdue)

  const hasFilters = search || filterStatus || filterSource

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>◈</div>
      Загрузка...
    </div>
  )

  return (
    <div style={{ maxWidth: viewMode === 'kanban' ? '100%' : '1100px', animation: 'fadeIn 0.3s ease both' }}>

      {/* ── Модалка карточки лида ── */}
      {activeLead && (
        <LeadModal
          lead={activeLead}
          users={users}
          onClose={() => setModalLead(null)}
          onEdit={handleEdit}
          onDelete={id => deleteMutation.mutate(id)}
          onUpdate={handleModalUpdate}
        />
      )}

      {/* ── Заголовок ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Лиды
            <span style={{ marginLeft: '10px', fontSize: '14px', color: 'var(--text)', fontWeight: '400', fontFamily: 'var(--mono)' }}>
              {filteredLeads.length}/{leads.length}
            </span>
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>Управление заявками и учениками</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            <button onClick={() => setViewMode('table')} style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              background: viewMode === 'table' ? 'var(--accent2)' : 'transparent',
              color: viewMode === 'table' ? 'white' : 'var(--text)', transition: 'all 0.15s',
            }}>☰ Таблица</button>
            <button onClick={() => setViewMode('kanban')} style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              background: viewMode === 'kanban' ? 'var(--accent2)' : 'transparent',
              color: viewMode === 'kanban' ? 'white' : 'var(--text)', transition: 'all 0.15s',
            }}>⬛ Канбан</button>
          </div>
          <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Добавить лид</button>
        </div>
      </div>

      {/* ── Баннеры напоминаний ── */}
      {callsOverdue.length > 0 && (
        <div style={{
          marginBottom: '12px', padding: '12px 16px', borderRadius: '10px',
          background: '#ef444410', border: '1px solid #ef444430',
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
            Просроченных звонков: {callsOverdue.length}
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {callsOverdue.slice(0, 4).map(l => (
              <button key={l.id} onClick={() => setModalLead(l)} style={{
                fontSize: '12px', padding: '3px 10px', borderRadius: '99px',
                background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440',
                cursor: 'pointer', fontWeight: '500',
              }}>
                {l.name}
              </button>
            ))}
            {callsOverdue.length > 4 && <span style={{ fontSize: '12px', color: '#ef4444' }}>+{callsOverdue.length - 4}</span>}
          </div>
        </div>
      )}

      {callsToday.length > 0 && (
        <div style={{
          marginBottom: '12px', padding: '12px 16px', borderRadius: '10px',
          background: '#f59e0b10', border: '1px solid #f59e0b30',
          display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '14px' }}>🔔</span>
          <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600' }}>
            Звонков сегодня: {callsToday.length}
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {callsToday.slice(0, 4).map(l => (
              <button key={l.id} onClick={() => setModalLead(l)} style={{
                fontSize: '12px', padding: '3px 10px', borderRadius: '99px',
                background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40',
                cursor: 'pointer', fontWeight: '500',
              }}>
                {l.name}
              </button>
            ))}
            {callsToday.length > 4 && <span style={{ fontSize: '12px', color: '#f59e0b' }}>+{callsToday.length - 4}</span>}
          </div>
        </div>
      )}

      {/* ── Поиск и фильтры ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          placeholder="🔍 Поиск по имени, телефону, комментарию..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: '1', minWidth: '240px' }}
        />
        {viewMode === 'table' && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="">Все статусы</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        )}
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={selectStyle}>
          <option value="">Все источники</option>
          {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterSource('') }}
            style={{ padding: '9px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text)' }}
          >✕ Сбросить</button>
        )}
      </div>

      {/* ── Форма добавления/редактирования ── */}
      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '24px', borderRadius: '12px', marginBottom: '16px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: '18px', fontSize: '16px', color: 'var(--text3)', fontWeight: '700' }}>
            {editLead ? '✏️ Редактировать лид' : '+ Новый лид'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="Имя *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
            <input placeholder="Телефон *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required style={inputStyle} />
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={selectStyle}>
              {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={selectStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>

            {/* Стоимость курса */}
            <div style={{ position: 'relative' }}>
              <input
                type="number" placeholder="Стоимость курса (₸)" value={form.courseAmount}
                onChange={e => setForm({ ...form, courseAmount: e.target.value })}
                style={{ ...inputStyle, paddingRight: '28px' }}
              />
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text)' }}>₸</span>
            </div>

            {/* Следующий звонок */}
            <div style={{ position: 'relative' }}>
              <input
                type="date" value={form.nextCallAt}
                min={dayjs().format('YYYY-MM-DD')}
                onChange={e => setForm({ ...form, nextCallAt: e.target.value })}
                style={inputStyle}
                placeholder="Дата следующего звонка"
              />
            </div>

            {/* Менеджер */}
            <select value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })} style={selectStyle}>
              <option value="">Без менеджера</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>

            <input
              placeholder="Комментарий"
              value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })}
              style={inputStyle}
            />

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px' }}>
              <button type="submit" style={btnPrimary}>{editLead ? 'Сохранить' : 'Добавить'}</button>
              <button type="button" onClick={resetForm} style={btnSecondary}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Канбан ── */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          leads={filteredLeads}
          onEdit={handleEdit}
          onDelete={id => deleteMutation.mutate(id)}
          onStatusChange={handleStatusChange}
          onCardClick={lead => setModalLead(lead)}
        />
      )}

      {/* ── Таблица ── */}
      {viewMode === 'table' && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}></th>
                  {['Имя', 'Телефон', 'Источник', 'Статус', 'Курс / Оплата', 'Звонок', 'Менеджер', 'Дата', 'Действия'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const today = isCallToday(lead)
                  const overdue = isCallOverdue(lead)
                  const debt = lead.debt ?? 0

                  return (
                    <>
                      <tr
                        key={lead.id}
                        style={{
                          borderTop: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s',
                          background: overdue ? '#ef444406' : today ? '#f59e0b06' : '',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                        onMouseLeave={e => e.currentTarget.style.background = overdue ? '#ef444406' : today ? '#f59e0b06' : ''}
                        onClick={() => setExpandedId(prev => prev === lead.id ? null : lead.id)}
                      >
                        <td style={{ padding: '12px 8px 12px 16px', color: 'var(--text)', fontSize: '12px', userSelect: 'none' }}>
                          <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: expandedId === lead.id ? 'rotate(90deg)' : 'none' }}>▶</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '600', color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                          {lead.name}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text2)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                          {lead.phone}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text)' }}>
                          {SOURCE_LABELS[lead.source] || lead.source}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <StatusBadge status={lead.status} />
                        </td>
                        {/* Финансы */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {lead.courseAmount > 0 ? (
                            <div>
                              <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '600', fontFamily: 'var(--mono)' }}>
                                {fmt(lead.paid)} / {fmt(lead.courseAmount)}
                              </div>
                              {debt > 0 ? (
                                <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>Долг: {fmt(debt)}</div>
                              ) : (
                                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>✓ Оплачено</div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.4 }}>—</span>
                          )}
                        </td>
                        {/* Звонок */}
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {lead.nextCallAt ? (
                            <span style={{
                              fontSize: '12px', fontWeight: overdue || today ? '700' : '400',
                              color: overdue ? '#ef4444' : today ? '#f59e0b' : 'var(--text2)',
                              fontFamily: 'var(--mono)',
                            }}>
                              {overdue ? '⚠️ ' : today ? '🔔 ' : ''}{dayjs(lead.nextCallAt).format('DD.MM.YYYY')}
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.3 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                          {lead.manager?.name || <span style={{ opacity: 0.3 }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                          {dayjs(lead.createdAt).format('DD.MM.YYYY')}
                        </td>
                        <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => setModalLead(lead)} style={iconBtn('#10b981')} title="Карточка">👁️</button>
                            <button onClick={() => handleEdit(lead)} style={iconBtn('#3b82f6')} title="Редактировать">✏️</button>
                            <button onClick={() => { if (confirm('Удалить лид?')) deleteMutation.mutate(lead.id) }} style={iconBtn('#ef4444')} title="Удалить">🗑️</button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === lead.id && (
                        <tr key={`history-${lead.id}`}>
                          <td colSpan={10} style={{ padding: 0 }}>
                            <div style={{ padding: '16px 24px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                              <LeadHistory leadId={lead.id} />
                              {lead.status === 'studying' && (
                                <div style={{ marginTop: '16px' }}>
                                  <LeadSchedule
                                    lead={lead}
                                    onUpdate={data => api.put(`/leads/${lead.id}`, { ...lead, ...data }).then(() => qc.invalidateQueries(['leads']))}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
                      {hasFilters ? '🔍 Ничего не найдено.' : '◈ Лидов пока нет. Добавь первый!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Вспомогательные компоненты и стили ─────────────────────────────────────

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status]
  return (
    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '600', background: color + '18', color, border: `1px solid ${color}30`, whiteSpace: 'nowrap' }}>
      {STATUS_LABELS[status]}
    </span>
  )
}

const sectionTitle = {
  fontSize: '12px', fontWeight: '600', color: 'var(--text)',
  marginBottom: '12px', letterSpacing: '0.06em', textTransform: 'uppercase',
  display: 'block',
}

const inputStyle = {
  padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text3)', fontSize: '13px', outline: 'none',
  transition: 'border-color 0.15s', boxSizing: 'border-box', width: '100%',
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const btnPrimary = {
  padding: '9px 20px', background: 'var(--accent2)', color: 'white', border: 'none',
  borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
  transition: 'all 0.15s', boxShadow: '0 2px 8px var(--accent-glow)', letterSpacing: '0.01em',
  whiteSpace: 'nowrap',
}
const btnSecondary = {
  padding: '9px 18px', background: 'var(--bg3)', color: 'var(--text2)',
  border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
  transition: 'all 0.15s', whiteSpace: 'nowrap',
}
const thStyle = {
  padding: '11px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--text)',
  fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
}
const iconBtn = (color) => ({
  padding: '6px 10px', background: color + '14', border: '1px solid ' + color + '30',
  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s',
})
