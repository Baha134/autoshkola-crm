import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leadId: '', amount: '', note: '' })

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data)
  })

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments-all'],
    queryFn: async () => {
      const all = await Promise.all(leads.map(l => api.get(`/payments/lead/${l.id}`).then(r => r.data)))
      return all.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },
    enabled: leads.length > 0
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/payments', data),
    onSuccess: () => { qc.invalidateQueries(['payments-all']); toast.success('Платёж добавлен'); setShowForm(false); setForm({ leadId: '', amount: '', note: '' }) }
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/payments/${id}`),
    onSuccess: () => { qc.invalidateQueries(['payments-all']); toast.success('Платёж удалён') }
  })

  const total = payments.reduce((sum, p) => sum + p.amount, 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({ ...form, leadId: Number(form.leadId), amount: Number(form.amount) })
  }

  if (isLoading) return <div>Загрузка...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '600' }}>Платежи</h1>
        <button onClick={() => setShowForm(true)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          + Добавить платёж
        </button>
      </div>

      <div style={{ background: '#10b981', color: 'white', padding: '20px 24px', borderRadius: '12px', marginBottom: '24px', fontSize: '18px', fontWeight: '600' }}>
        Итого: {total.toLocaleString()} ₸
      </div>

      {showForm && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: '16px' }}>Новый платёж</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select value={form.leadId} onChange={e => setForm({...form, leadId: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="">Выбери лида</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
            </select>
            <input type="number" placeholder="Сумма (₸)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <input placeholder="Примечание" value={form.note} onChange={e => setForm({...form, note: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', gridColumn: 'span 2' }} />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px' }}>
              <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Добавить</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Лид', 'Сумма', 'Примечание', 'Дата', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => {
              const lead = leads.find(l => l.id === p.leadId)
              return (
                <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>{lead?.name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#10b981' }}>{p.amount.toLocaleString()} ₸</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b' }}>{p.note || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{dayjs(p.createdAt).format('DD.MM.YYYY')}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => deleteMutation.mutate(p.id)} style={{ padding: '6px 12px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                  </td>
                </tr>
              )
            })}
            {payments.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Платежей пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}