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

  const { data: payments = [], isLoading, isError, error } = useQuery({
    queryKey: ['payments-all'],
    queryFn: async () => {
      const all = await Promise.all(leads.map(l => api.get(`/payments/lead/${l.id}`).then(r => r.data)))
      return all.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    },
    enabled: leads.length > 0
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/payments', data),
    onSuccess: () => {
      qc.invalidateQueries(['payments-all'])
      toast.success('Платёж добавлен')
      setShowForm(false)
      setForm({ leadId: '', amount: '', note: '' })
    }
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

  if (isError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>⚠️</div>
      <div style={{ fontSize: '16px', color: 'var(--red)', fontWeight: '600' }}>Не удалось загрузить платежи</div>
      <div style={{ fontSize: '13px', color: 'var(--text)', textAlign: 'center', maxWidth: '400px' }}>
        {error?.message || 'Проверь что бэкенд запущен: npm run dev'}
      </div>
      <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: 'var(--accent2)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
        Попробовать снова
      </button>
    </div>
  )

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>◎</div>
      Загрузка...
    </div>
  )

  return (
    <div style={{ maxWidth: '900px', animation: 'fadeIn 0.3s ease both' }}>
      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Платежи</h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>История оплат учеников</div>
        </div>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>
          + Добавить платёж
        </button>
      </div>

      {/* Итого */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', background: 'radial-gradient(circle at 100% 50%, rgba(16,185,129,0.1) 0%, transparent 70%)' }} />
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '6px' }}>Общая выручка</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--green)', letterSpacing: '-0.03em', fontFamily: 'var(--mono)' }}>
            {total.toLocaleString()} ₸
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text)', marginTop: '4px' }}>{payments.length} платежей</div>
        </div>
        <div style={{ fontSize: '40px', opacity: 0.2 }}>◎</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--green))' }} />
      </div>

      {/* Форма */}
      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', padding: '22px', borderRadius: '12px', marginBottom: '16px', animation: 'slideDown 0.2s ease both', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text3)' }}>+ Новый платёж</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <select value={form.leadId} onChange={e => setForm({...form, leadId: e.target.value})} required style={selectStyle}>
              <option value="">Выбери лида</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
            </select>
            <input
              type="number"
              placeholder="Сумма (₸)"
              value={form.amount}
              onChange={e => setForm({...form, amount: e.target.value})}
              required
              style={inputStyle}
            />
            <input
              placeholder="Примечание (необязательно)"
              value={form.note}
              onChange={e => setForm({...form, note: e.target.value})}
              style={{ ...inputStyle, gridColumn: 'span 2' }}
            />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px' }}>
              <button type="submit" style={btnPrimary}>Добавить</button>
              <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* Таблица */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                {['Ученик', 'Сумма', 'Примечание', 'Дата', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => {
                const lead = leads.find(l => l.id === p.leadId)
                return (
                  <tr
                    key={p.id}
                    style={{ borderTop: '1px solid var(--border)', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: 'var(--text3)' }}>{lead?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '700', color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                      +{p.amount.toLocaleString()} ₸
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text)' }}>{p.note || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{dayjs(p.createdAt).format('DD.MM.YYYY')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => { if (confirm('Удалить платёж?')) deleteMutation.mutate(p.id) }}
                        style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s' }}
                        onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.2)'}
                        onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.1)'}
                      >🗑️</button>
                    </td>
                  </tr>
                )
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
                    ◎ Платежей пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  transition: 'border-color 0.15s',
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
  letterSpacing: '0.01em',
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
const thStyle = {
  padding: '11px 16px',
  textAlign: 'left',
  fontSize: '11px',
  color: 'var(--text)',
  fontWeight: '600',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}