// client/src/components/PaymentBlock.jsx
// ── Блок платежей внутри карточки лида ───────────────────────────────────────
// Использование: <PaymentBlock lead={lead} onUpdate={() => queryClient.invalidateQueries(['leads'])} />

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

const METHOD_LABELS = {
  cash:     { label: 'Наличные', icon: '💵', color: '#10b981' },
  card:     { label: 'Карта',    icon: '💳', color: '#3b82f6' },
  transfer: { label: 'Перевод',  icon: '📲', color: '#8b5cf6' },
}

export default function PaymentBlock({ lead }) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')
  const [method, setMethod] = useState('cash')

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', lead.id],
    queryFn: () => api.get(`/payments/lead/${lead.id}`).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/payments', data),
    onSuccess: () => {
      qc.invalidateQueries(['payments', lead.id])
      qc.invalidateQueries(['payments-all'])
      qc.invalidateQueries(['leads'])
      toast.success('✓ Платёж добавлен')
      setShowAdd(false)
      setAmount('')
      setNote('')
      setMethod('cash')
    },
    onError: e => toast.error(e.response?.data?.error || 'Ошибка'),
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['payments', lead.id])
      qc.invalidateQueries(['payments-all'])
      qc.invalidateQueries(['leads'])
      toast.success('Удалено')
    },
  })

  const paid  = payments.reduce((s, p) => s + p.amount, 0)
  const total = lead.courseAmount || 0
  const debt  = Math.max(0, total - paid)
  const pct   = total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0

  const handleAdd = (e) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) return toast.error('Введи сумму')
    createMutation.mutate({ leadId: lead.id, amount: Number(amount), note, method })
  }

  return (
    <div>
      {/* ── Финансовый итог ── */}
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '14px 16px', marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <FinRow label="Стоимость курса" value={total > 0 ? `${total.toLocaleString()} ₸` : '—'} color="var(--text2)" />
          <FinRow label="Оплачено"        value={`${paid.toLocaleString()} ₸`}                    color="var(--green)" />
          <FinRow
            label="Остаток"
            value={debt > 0 ? `${debt.toLocaleString()} ₸` : '✓ Оплачено'}
            color={debt > 0 ? '#ef4444' : 'var(--green)'}
          />
        </div>

        {/* Прогресс-бар */}
        {total > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text)', marginBottom: '4px' }}>
              <span>Оплачено {pct}%</span>
              <span>{paid.toLocaleString()} / {total.toLocaleString()} ₸</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg4)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: pct === 100 ? 'var(--green)' : pct > 50 ? 'var(--accent)' : '#f59e0b',
                borderRadius: '100px',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Кнопка добавить ── */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '9px', background: 'rgba(16,185,129,0.1)',
            border: '1px dashed rgba(16,185,129,0.35)', borderRadius: '8px',
            color: 'var(--green)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
            transition: 'all 0.15s', marginBottom: '12px',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(16,185,129,0.18)'}
          onMouseLeave={e => e.target.style.background = 'rgba(16,185,129,0.1)'}
        >
          + Добавить платёж
        </button>
      ) : (
        <form onSubmit={handleAdd} style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '14px', marginBottom: '12px',
          animation: 'slideDown 0.2s ease both',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={labelSm}>Сумма (₸) *</label>
              <input
                type="number" placeholder="50000" value={amount} min="1"
                onChange={e => setAmount(e.target.value)}
                style={inputSm} autoFocus
              />
            </div>
            <div>
              <label style={labelSm}>Метод</label>
              <select value={method} onChange={e => setMethod(e.target.value)} style={inputSm}>
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelSm}>Примечание</label>
              <input
                placeholder="1-й взнос, рассрочка..."
                value={note} onChange={e => setNote(e.target.value)}
                style={inputSm}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <button type="submit" disabled={createMutation.isPending} style={btnGreen}>
              {createMutation.isPending ? '...' : '✓ Сохранить'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} style={btnCancel}>Отмена</button>
          </div>
        </form>
      )}

      {/* ── История платежей ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text)', fontSize: '13px', padding: '8px' }}>Загрузка...</div>
      ) : payments.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text)', fontSize: '13px', opacity: 0.5, padding: '8px' }}>
          Платежей нет
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {payments.map(p => {
            const m = METHOD_LABELS[p.method || 'cash'] || METHOD_LABELS.cash
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', background: 'var(--bg3)',
                border: '1px solid var(--border)', borderRadius: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>{m.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                    +{p.amount.toLocaleString()} ₸
                  </div>
                  {p.note && <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '1px' }}>{p.note}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                    {dayjs(p.createdAt).format('DD.MM.YYYY')}
                  </div>
                  <div style={{
                    fontSize: '10px', padding: '1px 7px', borderRadius: '100px', marginTop: '2px',
                    background: m.color + '18', color: m.color, border: `1px solid ${m.color}30`,
                    display: 'inline-block',
                  }}>
                    {m.label}
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm('Удалить?')) deleteMutation.mutate(p.id) }}
                  style={{
                    padding: '4px 8px', background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '12px', flexShrink: 0,
                  }}
                >🗑️</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FinRow({ label, value, color }) {
  return (
    <div style={{ minWidth: '90px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: '700', color, fontFamily: 'var(--mono)' }}>{value}</div>
    </div>
  )
}

const labelSm = { display: 'block', fontSize: '10px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }
const inputSm = {
  padding: '7px 10px', background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: '7px', color: 'var(--text3)', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box',
}
const btnGreen = {
  padding: '7px 16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
  borderRadius: '7px', color: 'var(--green)', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
}
const btnCancel = {
  padding: '7px 12px', background: 'var(--bg4)', border: '1px solid var(--border)',
  borderRadius: '7px', color: 'var(--text)', fontSize: '13px', cursor: 'pointer',
}
