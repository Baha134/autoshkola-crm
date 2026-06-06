import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const STATUSES = ['new', 'in_progress', 'done', 'rejected']
const STATUS_LABELS = { new: 'Новый', in_progress: 'В работе', done: 'Готов', rejected: 'Отказ' }
const STATUS_COLORS = { new: '#3b82f6', in_progress: '#f59e0b', done: '#10b981', rejected: '#ef4444' }
const SOURCES = ['manual', 'whatsapp', 'instagram', 'website']

export default function LeadsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', source: 'manual', status: 'new', comment: '' })

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

  const resetForm = () => { setForm({ name: '', phone: '', source: 'manual', status: 'new', comment: '' }); setShowForm(false); setEditLead(null) }

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

  if (isLoading) return <div>Загрузка...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600' }}>Лиды</h1>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          + Добавить лид
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px' }}>{editLead ? 'Редактировать лид' : 'Новый лид'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input placeholder="Имя" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Телефон" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
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

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Имя', 'Телефон', 'Источник', 'Статус', 'Дата', 'Действия'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{lead.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{lead.phone}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{lead.source}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '12px', background: STATUS_COLORS[lead.status] + '20', color: STATUS_COLORS[lead.status] }}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{dayjs(lead.createdAt).format('DD.MM.YYYY')}</td>
                <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(lead)} style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                  <button onClick={() => deleteMutation.mutate(lead.id)} style={{ padding: '6px 12px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Лидов пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}