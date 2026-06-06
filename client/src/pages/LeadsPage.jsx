import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const STATUSES = ['new', 'in_progress', 'done', 'rejected']
const STATUS_LABELS = { new: 'Новый', in_progress: 'В работе', done: 'Готов', rejected: 'Отказ' }
const STATUS_COLORS = { new: '#3b82f6', in_progress: '#f59e0b', done: '#10b981', rejected: '#ef4444' }
const SOURCES = ['manual', 'whatsapp', 'instagram', 'website']
const SOURCE_LABELS = { manual: 'Вручную', whatsapp: 'WhatsApp', instagram: 'Instagram', website: 'Сайт' }
const EVENT_TYPES = ['comment', 'call', 'status_change']
const EVENT_LABELS = { comment: '💬 Комментарий', call: '📞 Звонок', status_change: '🔄 Изменение' }
const EVENT_ICONS = { comment: '💬', call: '📞', status_change: '🔄' }

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
    onSuccess: () => {
      qc.invalidateQueries(['events', leadId])
      setText('')
      toast.success('Добавлено')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries(['events', leadId])
  })

  const handleAdd = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addMutation.mutate({ leadId, type, text })
  }

  return (
    <div style={{ padding: '16px 24px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>
        История лида
      </div>

      {isLoading ? (
        <div style={{ color: '#94a3b8', fontSize: '13px' }}>Загрузка...</div>
      ) : events.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>Событий пока нет</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {events.map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', marginTop: '1px' }}>{EVENT_ICONS[ev.type] || '📝'}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13px', color: '#1e293b' }}>{ev.text}</span>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {ev.user?.name || 'Система'} · {dayjs(ev.createdAt).format('DD.MM.YYYY HH:mm')}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(ev.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '14px', padding: '0 4px' }}
                title="Удалить"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', background: 'white' }}
        >
          {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_LABELS[t]}</option>)}
        </select>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Добавить запись..."
          style={{ flex: 1, padding: '7px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          style={{
            padding: '7px 14px', background: '#2563eb', color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '13px', opacity: text.trim() ? 1 : 0.5
          }}
        >
          Добавить
        </button>
      </form>
    </div>
  )
}

export default function LeadsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', source: 'manual', status: 'new', comment: '' })
  const [expandedId, setExpandedId] = useState(null)

  // Поиск и фильтры
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')

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
    setShowForm(false)
    setEditLead(null)
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

  const toggleHistory = (id) => {
    setExpandedId(prev => prev === id ? null : id)
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

  const hasFilters = search || filterStatus || filterSource

  if (isLoading) return <div>Загрузка...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0 }}>
          Лиды
          <span style={{ marginLeft: '10px', fontSize: '14px', color: '#64748b', fontWeight: '400' }}>
            {filteredLeads.length} из {leads.length}
          </span>
        </h1>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          + Добавить лид
        </button>
      </div>

      {/* Поиск и фильтры */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          placeholder="🔍 Поиск по имени, телефону, комментарию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1', minWidth: '240px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', background: 'white', cursor: 'pointer' }}
        >
          <option value="">Все статусы</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', background: 'white', cursor: 'pointer' }}
        >
          <option value="">Все источники</option>
          {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterSource('') }}
            style={{ padding: '10px 14px', background: '#f1f5f9', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}
          >
            ✕ Сбросить
          </button>
        )}
      </div>

      {/* Форма */}
      {showForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px', marginTop: 0 }}>{editLead ? 'Редактировать лид' : 'Новый лид'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input placeholder="Имя" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Телефон" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <input placeholder="Комментарий" value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', gridColumn: 'span 2' }} />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                {editLead ? 'Сохранить' : 'Добавить'}
              </button>
              <button type="button" onClick={resetForm} style={{ padding: '10px 24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Таблица */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '500', width: '24px' }}></th>
              {['Имя', 'Телефон', 'Источник', 'Статус', 'Дата', 'Действия'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => (
              <>
                <tr
                  key={lead.id}
                  style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => toggleHistory(lead.id)}
                >
                  <td style={{ padding: '12px 8px 12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                    {expandedId === lead.id ? '▼' : '▶'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>{lead.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{lead.phone}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{SOURCE_LABELS[lead.source] || lead.source}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '12px', background: STATUS_COLORS[lead.status] + '20', color: STATUS_COLORS[lead.status] }}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{dayjs(lead.createdAt).format('DD.MM.YYYY')}</td>
                  <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(lead)} style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                      <button onClick={() => deleteMutation.mutate(lead.id)} style={{ padding: '6px 12px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
                {expandedId === lead.id && (
                  <tr key={`history-${lead.id}`}>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <LeadHistory leadId={lead.id} />
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  {hasFilters ? 'Ничего не найдено. Попробуй изменить фильтры.' : 'Лидов пока нет'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}