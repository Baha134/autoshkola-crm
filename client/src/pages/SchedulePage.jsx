import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

// ─── Константы ───────────────────────────────────────────────────────────────

const DAYS_RU   = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

// 10 цветов для инструкторов
const INSTRUCTOR_COLORS = [
  { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  text: '#60a5fa'  },
  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)',  text: '#34d399'  },
  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)',  text: '#fbbf24'  },
  { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)',  text: '#a78bfa'  },
  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',   text: '#f87171'  },
  { bg: 'rgba(6,182,212,0.15)',  border: 'rgba(6,182,212,0.4)',   text: '#22d3ee'  },
  { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)',  text: '#fb923c'  },
  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.4)',  text: '#f472b6'  },
  { bg: 'rgba(132,204,22,0.15)', border: 'rgba(132,204,22,0.4)',  text: '#a3e635'  },
  { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.4)',  text: '#c084fc'  },
]

const STATUS_LABELS = {
  new: 'Новый', contacted: 'Связались', enrolled: 'Записан',
  studying: 'Учится', graduated: 'Сдал экзамен', rejected: 'Отказ',
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/** Получаем даты текущей недели (Пн–Вс) для заданного смещения */
function getWeekDates(offset = 0) {
  const now = dayjs().add(offset, 'week')
  const monday = now.startOf('week').add(1, 'day') // dayjs startOf('week') = воскресенье, +1 = понедельник
  // Но dayjs с locale ru уже даёт понедельник как первый день
  const mon = now.startOf('isoWeek')
  return Array.from({ length: 7 }, (_, i) => mon.add(i, 'day'))
}

function parseScheduleDays(scheduleDays) {
  if (!scheduleDays) return []
  try { return JSON.parse(scheduleDays) } catch { return [] }
}

// ─── Компоненты ──────────────────────────────────────────────────────────────

function LessonCard({ lead, colorScheme, onClick }) {
  const time = lead.scheduleTime || ''
  return (
    <div
      onClick={() => onClick(lead)}
      style={{
        background: colorScheme.bg,
        border: `1px solid ${colorScheme.border}`,
        borderLeft: `3px solid ${colorScheme.text}`,
        borderRadius: '7px',
        padding: '7px 9px',
        marginBottom: '4px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text3)', marginBottom: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {lead.name}
      </div>
      {time && (
        <div style={{ fontSize: '11px', color: colorScheme.text, fontFamily: 'var(--mono)', fontWeight: '600' }}>
          🕐 {time}
        </div>
      )}
      {lead.manager && (
        <div style={{ fontSize: '10px', color: 'var(--text)', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {lead.manager.name}
        </div>
      )}
      {lead.phone && (
        <div style={{ fontSize: '10px', color: 'var(--text)', fontFamily: 'var(--mono)', marginTop: '1px' }}>
          {lead.phone}
        </div>
      )}
    </div>
  )
}

function LeadDetailModal({ lead, colorScheme, onClose, onSaveSchedule }) {
  const [days, setDays] = useState(parseScheduleDays(lead.scheduleDays))
  const [time, setTime] = useState(lead.scheduleTime || '')
  const [saving, setSaving] = useState(false)

  const toggleDay = (day) =>
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const handleSave = async () => {
    setSaving(true)
    await onSaveSchedule(lead.id, { scheduleDays: JSON.stringify(days), scheduleTime: time })
    setSaving(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Шапка */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg3)', borderRadius: '16px 16px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text3)', marginBottom: '4px' }}>{lead.name}</div>
            <a href={`tel:${lead.phone}`} style={{ fontSize: '13px', color: 'var(--accent)', fontFamily: 'var(--mono)', textDecoration: 'none' }}>
              📞 {lead.phone}
            </a>
            <div style={{ marginTop: '6px' }}>
              <span style={{
                padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '600',
                background: colorScheme.bg, color: colorScheme.text, border: `1px solid ${colorScheme.border}`,
              }}>
                {STATUS_LABELS[lead.status] || lead.status}
              </span>
              {lead.manager && (
                <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text)' }}>
                  · {lead.manager.name}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '20px', padding: '0', lineHeight: 1 }}>✕</button>
        </div>

        {/* Тело */}
        <div style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            📅 Дни занятий
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {DAYS_RU.map(day => (
              <button key={day} onClick={() => toggleDay(day)} style={{
                padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${days.includes(day) ? colorScheme.border : 'var(--border)'}`,
                background: days.includes(day) ? colorScheme.bg : 'var(--bg3)',
                color: days.includes(day) ? colorScheme.text : 'var(--text)',
                fontSize: '13px', fontWeight: days.includes(day) ? '600' : '400',
                transition: 'all 0.15s',
              }}>{day}</button>
            ))}
          </div>

          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            🕐 Время занятия
          </div>
          <input
            type="time" value={time}
            onChange={e => setTime(e.target.value)}
            style={{
              padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text3)', fontSize: '14px', outline: 'none',
              marginBottom: '18px', width: '140px',
            }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSave} disabled={saving} style={{
              flex: 1, padding: '10px', background: 'var(--accent2)', color: 'white',
              border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontWeight: '600', transition: 'all 0.15s',
            }}>
              {saving ? 'Сохраняю...' : '✓ Сохранить расписание'}
            </button>
            <button onClick={onClose} style={{
              padding: '10px 16px', background: 'var(--bg3)', color: 'var(--text2)',
              border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
            }}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function SchedulePage() {
  const qc = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedLead, setSelectedLead] = useState(null)
  const [filterManager, setFilterManager] = useState('')

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  // Только лиды с расписанием (есть хотя бы один день)
  const scheduledLeads = useMemo(() =>
    leads.filter(l => {
      const days = parseScheduleDays(l.scheduleDays)
      return days.length > 0
    }), [leads]
  )

  // Фильтрация по менеджеру
  const filteredLeads = useMemo(() =>
    filterManager
      ? scheduledLeads.filter(l => String(l.managerId) === filterManager)
      : scheduledLeads,
    [scheduledLeads, filterManager]
  )

  // Карта инструктор → цвет
  const managerColorMap = useMemo(() => {
    const map = {}
    let idx = 0
    filteredLeads.forEach(l => {
      const key = l.managerId ?? 'none'
      if (!(key in map)) map[key] = INSTRUCTOR_COLORS[idx++ % INSTRUCTOR_COLORS.length]
    })
    return map
  }, [filteredLeads])

  const weekDates = getWeekDates(weekOffset)
  const today = dayjs()
  const isCurrentWeek = weekOffset === 0

  // Лиды по дню недели
  const leadsByDay = useMemo(() => {
    return DAYS_RU.map(dayLabel => {
      return filteredLeads
        .filter(l => parseScheduleDays(l.scheduleDays).includes(dayLabel))
        .sort((a, b) => (a.scheduleTime || '').localeCompare(b.scheduleTime || ''))
    })
  }, [filteredLeads])

  // Итого занятий на неделю
  const totalThisWeek = leadsByDay.reduce((s, arr) => s + arr.length, 0)

  const handleSaveSchedule = async (leadId, data) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    await api.put(`/leads/${leadId}`, { ...lead, ...data })
    qc.invalidateQueries(['leads'])
    // Обновляем модалку
    setSelectedLead(prev => prev ? { ...prev, ...data } : null)
  }

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>📅</div>
      Загрузка...
    </div>
  )

  return (
    <div style={{ animation: 'fadeIn 0.3s ease both' }}>

      {/* Модалка */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          colorScheme={managerColorMap[selectedLead.managerId ?? 'none'] || INSTRUCTOR_COLORS[0]}
          onClose={() => setSelectedLead(null)}
          onSaveSchedule={handleSaveSchedule}
        />
      )}

      {/* ── Заголовок ── */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Расписание
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>
            {weekDates[0].format('D MMM')} — {weekDates[6].format('D MMM YYYY')}
            {isCurrentWeek && <span style={{ marginLeft: '8px', color: 'var(--accent)', fontWeight: '600' }}>· текущая неделя</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Фильтр по инструктору */}
          <select
            value={filterManager}
            onChange={e => setFilterManager(e.target.value)}
            style={{
              padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text2)', fontSize: '13px', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">Все инструкторы</option>
            {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
          </select>

          {/* Навигация по неделям */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button onClick={() => setWeekOffset(v => v - 1)} style={navBtn}>‹</button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, fontSize: '11px', padding: '7px 10px', color: 'var(--accent)' }}>
                Сегодня
              </button>
            )}
            <button onClick={() => setWeekOffset(v => v + 1)} style={navBtn}>›</button>
          </div>
        </div>
      </div>

      {/* ── Легенда инструкторов ── */}
      {Object.keys(managerColorMap).length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {Object.entries(managerColorMap).map(([managerId, color]) => {
            const manager = managerId === 'none'
              ? { name: 'Без инструктора' }
              : users.find(u => String(u.id) === managerId)
            if (!manager) return null
            return (
              <div key={managerId} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '100px',
                background: color.bg, border: `1px solid ${color.border}`,
                fontSize: '12px', fontWeight: '500', color: color.text,
                cursor: 'pointer',
              }}
                onClick={() => setFilterManager(managerId === 'none' ? '' : (filterManager === managerId ? '' : managerId))}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color.text, display: 'inline-block' }} />
                {manager.name}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Статистика ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{ padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text)' }}>Учеников с расписанием: </span>
          <span style={{ fontWeight: '700', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{filteredLeads.length}</span>
        </div>
        <div style={{ padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text)' }}>Занятий на неделе: </span>
          <span style={{ fontWeight: '700', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{totalThisWeek}</span>
        </div>
      </div>

      {/* ── Сетка недели ── */}
      {filteredLeads.length === 0 ? (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '60px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
          <div style={{ color: 'var(--text3)', fontWeight: '600', fontSize: '16px', marginBottom: '6px' }}>
            Расписание пусто
          </div>
          <div style={{ color: 'var(--text)', fontSize: '13px' }}>
            Открой карточку ученика и назначь дни занятий
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', minWidth: '700px', overflowX: 'auto' }}>
          {DAYS_RU.map((dayLabel, i) => {
            const date = weekDates[i]
            const isToday = isCurrentWeek && date.isSame(today, 'day')
            const isPast  = date.isBefore(today, 'day')
            const lessons = leadsByDay[i]

            return (
              <div key={dayLabel} style={{
                background: isToday ? 'rgba(59,130,246,0.06)' : 'var(--bg2)',
                border: `1px solid ${isToday ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                borderRadius: '10px',
                overflow: 'hidden',
                opacity: isPast && !isCurrentWeek ? 0.6 : 1,
                minHeight: '120px',
              }}>
                {/* Заголовок дня */}
                <div style={{
                  padding: '10px 10px 8px',
                  background: isToday ? 'rgba(59,130,246,0.1)' : 'var(--bg3)',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: isToday ? 'var(--accent)' : 'var(--text)',
                    marginBottom: '3px',
                  }}>
                    {dayLabel}
                  </div>
                  <div style={{
                    fontSize: '18px', fontWeight: '700',
                    color: isToday ? 'var(--accent)' : isPast ? 'var(--text)' : 'var(--text3)',
                    lineHeight: 1,
                  }}>
                    {date.format('D')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text)', marginTop: '2px' }}>
                    {date.format('MMM')}
                  </div>
                  {lessons.length > 0 && (
                    <div style={{
                      marginTop: '5px',
                      fontSize: '10px', fontWeight: '700',
                      padding: '1px 7px', borderRadius: '100px',
                      background: isToday ? 'rgba(59,130,246,0.2)' : 'var(--bg4)',
                      color: isToday ? 'var(--accent)' : 'var(--text)',
                      display: 'inline-block',
                    }}>
                      {lessons.length} {lessons.length === 1 ? 'занятие' : lessons.length < 5 ? 'занятия' : 'занятий'}
                    </div>
                  )}
                </div>

                {/* Карточки занятий */}
                <div style={{ padding: '8px', minHeight: '80px' }}>
                  {lessons.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text)', fontSize: '11px', opacity: 0.35 }}>
                      —
                    </div>
                  ) : (
                    lessons.map(lead => (
                      <LessonCard
                        key={lead.id}
                        lead={lead}
                        colorScheme={managerColorMap[lead.managerId ?? 'none'] || INSTRUCTOR_COLORS[0]}
                        onClick={setSelectedLead}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Список без расписания ── */}
      {leads.filter(l => parseScheduleDays(l.scheduleDays).length === 0 && l.status === 'studying').length > 0 && (
        <div style={{ marginTop: '20px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>Учатся, но без расписания</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '700', color: 'var(--amber)', fontFamily: 'var(--mono)' }}>
              {leads.filter(l => parseScheduleDays(l.scheduleDays).length === 0 && l.status === 'studying').length}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px 16px' }}>
            {leads
              .filter(l => parseScheduleDays(l.scheduleDays).length === 0 && l.status === 'studying')
              .map(lead => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  style={{
                    padding: '6px 14px', background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '13px', color: 'var(--amber)', fontWeight: '500',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(245,158,11,0.2)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(245,158,11,0.1)'}
                >
                  {lead.name}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

const navBtn = {
  width: '34px', height: '34px',
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: '8px', cursor: 'pointer', fontSize: '16px',
  color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
}
