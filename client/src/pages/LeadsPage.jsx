import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const STATUSES = ['new', 'contacted', 'enrolled', 'studying', 'graduated', 'rejected']
const STATUS_LABELS = { new: 'Новый', contacted: 'Связались', enrolled: 'Записан', studying: 'Учится', graduated: 'Сдал экзамен', rejected: 'Отказ' }
const STATUS_COLORS = { new: '#3b82f6', contacted: '#f59e0b', enrolled: '#8b5cf6', studying: '#06b6d4', graduated: '#10b981', rejected: '#ef4444' }
const SOURCES = ['manual', 'whatsapp', 'instagram', 'website']
const SOURCE_LABELS = { manual: 'Вручную', whatsapp: 'WhatsApp', instagram: 'Instagram', website: 'Сайт' }
const EVENT_TYPES = ['comment', 'call', 'status_change']
const EVENT_LABELS = { comment: '💬 Комментарий', call: '📞 Звонок', status_change: '🔄 Изменение' }
const EVENT_ICONS = { comment: '💬', call: '📞', status_change: '🔄' }
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function LeadSchedule({ lead, onUpdate }) {
  const [days, setDays] = useState(lead.scheduleDays ? JSON.parse(lead.scheduleDays) : [])
  const [time, setTime] = useState(lead.scheduleTime || '')
  const [saving, setSaving] = useState(false)

  const toggleDay = (day) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const handleSave = async () => {
    setSaving(true)
    await onUpdate({ scheduleDays: JSON.stringify(days), scheduleTime: time })
    setSaving(false)
    toast.success('Расписание сохранено')
  }

  return (
    <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg3)', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        📅 Расписание занятий
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {DAYS.map(day => (
          <button key={day} onClick={() => toggleDay(day)} style={{
            padding: '6px 14px', borderRadius: '8px',
            border: '1px solid ' + (days.includes(day) ? 'var(--accent2)' : 'var(--border)'),
            background: days.includes(day) ? 'var(--accent2)' : 'var(--bg2)',
            color: days.includes(day) ? 'white' : 'var(--text)',
            cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.15s'
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

function LeadHistory({ leadId }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [type, setType] = useState('comment')

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', leadId],
    queryFn: () => api.get(`/events/lead/${leadId}`).then(r => r.data)
  })

  const addMutation = useMutation({
    mutationFn: data => api.post('/events', data),
    onSuccess: () => { qc.invalidateQueries(['events', leadId]); setText(''); toast.success('Добавлено') }
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries(['events', leadId])
  })

  const handleAdd = (e) => { e.preventDefault(); if (!text.trim()) return; addMutation.mutate({ leadId, type, text }) }

  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        История лида
      </div>
      {isLoading ? (
        <div style={{ color: 'var(--text)', fontSize: '13px' }}>Загрузка...</div>
      ) : events.length === 0 ? (
        <div style={{ color: 'var(--text)', fontSize: '13px', marginBottom: '12px' }}>Событий пока нет</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', maxHeight: '200px', overflowY: 'auto' }}>
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '15px', marginTop: '1px' }}>{EVENT_ICONS[ev.type] || '📝'}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>{ev.text}</span>
                <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '3px', fontFamily: 'var(--mono)' }}>
                  {ev.user?.name || 'Система'} · {dayjs(ev.createdAt).format('DD.MM.YYYY HH:mm')}
                </div>
              </div>
              <button onClick={() => deleteMutation.mutate(ev.id)}
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
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Добавить запись..." style={{ ...inputStyle, flex: 1 }} />
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

function LeadModal({ lead, onClose, onEdit, onDelete, onScheduleUpdate }) {
  const color = STATUS_COLORS[lead.status]
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Шапка */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text3)', marginBottom: '4px' }}>{lead.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', fontFamily: 'var(--mono)', marginBottom: '8px' }}>{lead.phone}</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '600', background: color + '18', color, border: `1px solid ${color}30` }}>
                {STATUS_LABELS[lead.status]}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text)' }}>{SOURCE_LABELS[lead.source]}</span>
              <span style={{ fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{dayjs(lead.createdAt).format('DD.MM.YYYY')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => { onEdit(lead); onClose() }} style={iconBtn('#3b82f6')}>✏️</button>
            <button onClick={() => { if (confirm('Удалить лид?')) { onDelete(lead.id); onClose() } }} style={iconBtn('#ef4444')}>🗑️</button>
            <button onClick={onClose} style={{ ...iconBtn('#888'), fontSize: '16px' }}>✕</button>
          </div>
        </div>

        {/* Комментарий */}
        {lead.comment && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', fontSize: '13px', color: 'var(--text2)' }}>
            💬 {lead.comment}
          </div>
        )}

        {/* История */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <LeadHistory leadId={lead.id} />
        </div>

        {/* Расписание если учится */}
        {lead.status === 'studying' && (
          <div style={{ padding: '20px 24px' }}>
            <LeadSchedule lead={lead} onUpdate={onScheduleUpdate} />
          </div>
        )}
      </div>
    </div>
  )
}

function LeadCard({ lead, onEdit, onDelete, onDragStart, onClick }) {
  const color = STATUS_COLORS[lead.status]
  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(lead) }}
      onClick={onClick}
      style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px',
        padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s', marginBottom: '8px',
        borderLeft: `3px solid ${color}`,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text3)', marginBottom: '4px' }}>{lead.name}</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--mono)', marginBottom: '6px' }}>{lead.phone}</div>
      {lead.comment && <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '6px', opacity: 0.8 }}>{lead.comment}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{SOURCE_LABELS[lead.source]}</span>
        <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(lead)} style={iconBtn('#3b82f6')}>✏️</button>
          <button onClick={() => { if (confirm('Удалить лид?')) onDelete(lead.id) }} style={iconBtn('#ef4444')}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

function KanbanBoard({ leads, onEdit, onDelete, onDragStart, onStatusChange, onCardClick }) {
  const dragLead = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  const handleDragStart = (lead) => { dragLead.current = lead }

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
        return (
          <div
            key={status}
            onDragOver={e => { e.preventDefault(); setDragOver(status) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(status)}
            style={{
              minWidth: '220px', flex: '1',
              background: isOver ? 'var(--bg3)' : 'var(--bg2)',
              border: `1px solid ${isOver ? color : 'var(--border)'}`,
              borderRadius: '12px', padding: '12px',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {STATUS_LABELS[status]}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '11px', background: color + '22', color, padding: '2px 8px', borderRadius: '100px', fontWeight: '600' }}>
                {col.length}
              </span>
            </div>
            <div style={{ minHeight: '60px' }}>
              {col.map(lead => (
                <LeadCard key={lead.id} lead={lead} onEdit={onEdit} onDelete={onDelete} onDragStart={handleDragStart} onClick={() => onCardClick(lead)} />
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

export default function LeadsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', source: 'manual', status: 'new', comment: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [modalLead, setModalLead] = useState(null)

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/leads', data),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Лид добавлен'); resetForm() }
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/leads/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Лид обновлён'); resetForm() }
  })
  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/leads/${id}`),
    onSuccess: () => { qc.invalidateQueries(['leads']); toast.success('Лид удалён') }
  })

  const resetForm = () => {
    setForm({ name: '', phone: '', source: 'manual', status: 'new', comment: '' })
    setShowForm(false); setEditLead(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editLead) updateMutation.mutate({ id: editLead.id, ...form })
    else createMutation.mutate(form)
  }

  const handleEdit = (lead) => {
    setEditLead(lead)
    setForm({ name: lead.name, phone: lead.phone, source: lead.source, status: lead.status, comment: lead.comment || '' })
    setShowForm(true)
  }

  const handleScheduleUpdate = (lead, data) => {
    return api.put(`/leads/${lead.id}`, { ...lead, ...data })
      .then(() => qc.invalidateQueries(['leads']))
  }

  const handleStatusChange = (lead, newStatus) => {
    api.put(`/leads/${lead.id}`, { ...lead, status: newStatus })
      .then(() => { qc.invalidateQueries(['leads']); toast.success(`Перемещён в "${STATUS_LABELS[newStatus]}"`) })
  }

  const toggleHistory = (id) => setExpandedId(prev => prev === id ? null : id)

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = search.toLowerCase()
      const matchSearch = !q || lead.name.toLowerCase().includes(q) || lead.phone.toLowerCase().includes(q) || (lead.comment || '').toLowerCase().includes(q)
      const matchStatus = !filterStatus || lead.status === filterStatus
      const matchSource = !filterSource || lead.source === filterSource
      return matchSearch && matchStatus && matchSource
    })
  }, [leads, search, filterStatus, filterSource])

  const hasFilters = search || filterStatus || filterSource

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>◈</div>
      Загрузка...
    </div>
  )

  return (
    <div style={{ maxWidth: viewMode === 'kanban' ? '100%' : '1100px', animation: 'fadeIn 0.3s ease both' }}>

      {/* Модалка */}
      {modalLead && (
        <LeadModal
          lead={leads.find(l => l.id === modalLead.id) || modalLead}
          onClose={() => setModalLead(null)}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          onScheduleUpdate={(data) => handleScheduleUpdate(modalLead, data)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
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
              color: viewMode === 'table' ? 'white' : 'var(--text)', transition: 'all 0.15s'
            }}>☰ Таблица</button>
            <button onClick={() => setViewMode('kanban')} style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              background: viewMode === 'kanban' ? 'var(--accent2)' : 'transparent',
              color: viewMode === 'kanban' ? 'white' : 'var(--text)', transition: 'all 0.15s'
            }}>⬛ Канбан</button>
          </div>
          <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Добавить лид</button>
        </div>
      </div>

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

      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '22px', borderRadius: '12px', marginBottom: '16px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text3)' }}>{editLead ? '✏️ Редактировать лид' : '+ Новый лид'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input placeholder="Имя" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={inputStyle} />
            <input placeholder="Телефон" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required style={inputStyle} />
            <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} style={selectStyle}>
              {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={selectStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <input placeholder="Комментарий" value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} style={{ ...inputStyle, gridColumn: 'span 2' }} />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px' }}>
              <button type="submit" style={btnPrimary}>{editLead ? 'Сохранить' : 'Добавить'}</button>
              <button type="button" onClick={resetForm} style={btnSecondary}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {viewMode === 'kanban' && (
        <KanbanBoard
          leads={filteredLeads}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          onStatusChange={handleStatusChange}
          onCardClick={(lead) => setModalLead(lead)}
        />
      )}

      {viewMode === 'table' && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}></th>
                  {['Имя', 'Телефон', 'Источник', 'Статус', 'Дата', 'Действия'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <>
                    <tr key={lead.id}
                      style={{ borderTop: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                      onClick={() => toggleHistory(lead.id)}
                    >
                      <td style={{ padding: '12px 8px 12px 16px', color: 'var(--text)', fontSize: '12px', userSelect: 'none' }}>
                        <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: expandedId === lead.id ? 'rotate(90deg)' : 'none' }}>▶</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: '600', color: 'var(--text3)' }}>{lead.name}</td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>{lead.phone}</td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text)' }}>{SOURCE_LABELS[lead.source] || lead.source}</td>
                      <td style={{ padding: '12px 14px' }}><StatusBadge status={lead.status} /></td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{dayjs(lead.createdAt).format('DD.MM.YYYY')}</td>
                      <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleEdit(lead)} style={iconBtn('#3b82f6')}>✏️</button>
                          <button onClick={() => { if (confirm('Удалить лид?')) deleteMutation.mutate(lead.id) }} style={iconBtn('#ef4444')}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === lead.id && (
                      <tr key={`history-${lead.id}`}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ padding: '16px 20px 18px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                            <LeadHistory leadId={lead.id} />
                            {lead.status === 'studying' && (
                              <LeadSchedule lead={lead} onUpdate={(data) => handleScheduleUpdate(lead, data)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
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

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status]
  return (
    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '600', background: color + '18', color, border: `1px solid ${color}30` }}>
      {STATUS_LABELS[status]}
    </span>
  )
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
}
const btnSecondary = {
  padding: '9px 18px', background: 'var(--bg3)', color: 'var(--text2)',
  border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s',
}
const thStyle = {
  padding: '11px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--text)',
  fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
}
const iconBtn = (color) => ({
  padding: '6px 10px', background: color + '14', border: '1px solid ' + color + '30',
  borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s',
})