// client/src/pages/PaymentsPage.jsx
// ── ЭТАП 5: Платежи (полная версия) ──────────────────────────────────────────
// ✅ Платёж из карточки лида (leadId можно передать через URL: ?leadId=5)
// ✅ История платежей с лидом, менеджером, методом оплаты
// ✅ Общий долг по всем ученикам
// ✅ Экспорт в CSV
// ✅ Метод оплаты: наличные / карта / перевод
// ✅ Фильтр по ученику / методу оплаты

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

const METHOD_LABELS = {
  cash:     { label: 'Наличные', icon: '💵', color: '#10b981' },
  card:     { label: 'Карта',    icon: '💳', color: '#3b82f6' },
  transfer: { label: 'Перевод',  icon: '📲', color: '#8b5cf6' },
}

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()

  const [showForm, setShowForm] = useState(!!searchParams.get('leadId'))
  const [form, setForm] = useState({
    leadId: searchParams.get('leadId') || '',
    amount: '',
    note: '',
    method: 'cash',
  })
  const [filterLead, setFilterLead]     = useState('')
  const [filterMethod, setFilterMethod] = useState('')

  // ── Запросы ────────────────────────────────────────────────────────────────

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data),
  })

  const { data: payments = [], isLoading, isError, error } = useQuery({
    queryKey: ['payments-all'],
    queryFn: () => api.get('/payments').then(r => r.data),
  })

  // ── Мутации ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: data => api.post('/payments', data),
    onSuccess: () => {
      qc.invalidateQueries(['payments-all'])
      qc.invalidateQueries(['leads'])
      toast.success('✓ Платёж добавлен')
      setShowForm(false)
      setForm({ leadId: '', amount: '', note: '', method: 'cash' })
    },
    onError: e => toast.error(e.response?.data?.error || 'Ошибка'),
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['payments-all'])
      qc.invalidateQueries(['leads'])
      toast.success('Платёж удалён')
    },
  })

  // ── Подсчёты ───────────────────────────────────────────────────────────────

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)

  // Долг = сумма courseAmount - сумма платежей по каждому лиду
  const totalDebt = useMemo(() => {
    const debtMap = {}
    leads.forEach(l => {
      debtMap[l.id] = { courseAmount: l.courseAmount || 0, paid: 0 }
    })
    payments.forEach(p => {
      if (debtMap[p.leadId]) debtMap[p.leadId].paid += p.amount
    })
    return Object.values(debtMap).reduce((s, l) => s + Math.max(0, l.courseAmount - l.paid), 0)
  }, [leads, payments])

  const monthRevenue = useMemo(() => {
    const start = dayjs().startOf('month')
    return payments
      .filter(p => dayjs(p.createdAt).isAfter(start))
      .reduce((s, p) => s + p.amount, 0)
  }, [payments])

  // ── Фильтрация ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = payments
    if (filterLead)   list = list.filter(p => String(p.leadId) === filterLead)
    if (filterMethod) list = list.filter(p => (p.method || 'cash') === filterMethod)
    return list
  }, [payments, filterLead, filterMethod])

  // ── Экспорт CSV ────────────────────────────────────────────────────────────

  const handleExport = () => {
    const token = localStorage.getItem('auth')
      ? JSON.parse(localStorage.getItem('auth'))?.state?.token
      : null
    const url = (import.meta.env.VITE_API_URL || 'https://autoshkola-crm-production.up.railway.app/api')
      + '/payments/export/csv'
    // Создаём временную ссылку с авторизацией через fetch
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `payments_${dayjs().format('YYYY-MM-DD')}.csv`
        a.click()
        toast.success('CSV скачан')
      })
      .catch(() => toast.error('Ошибка экспорта'))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.leadId) return toast.error('Выбери ученика')
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Введи сумму')
    createMutation.mutate({
      leadId: Number(form.leadId),
      amount: Number(form.amount),
      note: form.note,
      method: form.method,
    })
  }

  // ── Рендер ─────────────────────────────────────────────────────────────────

  if (isError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>⚠️</div>
      <div style={{ fontSize: '16px', color: 'var(--red)', fontWeight: '600' }}>Не удалось загрузить платежи</div>
      <div style={{ fontSize: '13px', color: 'var(--text)', textAlign: 'center', maxWidth: '400px' }}>
        {error?.message || 'Проверь что бэкенд запущен'}
      </div>
      <button onClick={() => window.location.reload()} style={btnPrimary}>Попробовать снова</button>
    </div>
  )

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>◎</div>
      Загрузка...
    </div>
  )

  return (
    <div style={{ maxWidth: '960px', animation: 'fadeIn 0.3s ease both' }}>

      {/* ── Заголовок ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>Платежи</h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>История оплат учеников</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={btnSecondary}>
            📥 Экспорт CSV
          </button>
          <button onClick={() => setShowForm(v => !v)} style={btnPrimary}>
            {showForm ? '✕ Закрыть' : '+ Добавить платёж'}
          </button>
        </div>
      </div>

      {/* ── Карточки метрик ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <StatCard
          label="Выручка за месяц"
          value={`${monthRevenue.toLocaleString()} ₸`}
          icon="📅"
          color="var(--accent)"
        />
        <StatCard
          label="Всего выручки"
          value={`${totalRevenue.toLocaleString()} ₸`}
          icon="◎"
          color="var(--green)"
        />
        <StatCard
          label="Общий долг"
          value={`${totalDebt.toLocaleString()} ₸`}
          icon="⚠️"
          color={totalDebt > 0 ? '#ef4444' : 'var(--green)'}
        />
        <StatCard
          label="Платежей всего"
          value={payments.length}
          icon="📋"
          color="var(--text2)"
        />
      </div>

      {/* ── Форма добавления ── */}
      {showForm && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          padding: '22px', borderRadius: '12px', marginBottom: '16px',
          animation: 'slideDown 0.2s ease both', boxShadow: 'var(--shadow)',
        }}>
          <h3 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text3)' }}>+ Новый платёж</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>

            {/* Ученик */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Ученик *</label>
              <select
                value={form.leadId}
                onChange={e => setForm({ ...form, leadId: e.target.value })}
                required
                style={selectStyle}
              >
                <option value="">— Выбери ученика —</option>
                {leads.map(l => {
                  const debt = Math.max(0, (l.courseAmount || 0) - (l.paid || 0))
                  return (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.phone}{debt > 0 ? ` (долг: ${debt.toLocaleString()} ₸)` : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Сумма */}
            <div>
              <label style={labelStyle}>Сумма (₸) *</label>
              <input
                type="number"
                placeholder="50000"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
                min="1"
                style={inputStyle}
              />
            </div>

            {/* Метод */}
            <div>
              <label style={labelStyle}>Метод оплаты</label>
              <select
                value={form.method}
                onChange={e => setForm({ ...form, method: e.target.value })}
                style={selectStyle}
              >
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            {/* Примечание */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Примечание</label>
              <input
                placeholder="Оплата за обучение, 1-й взнос..."
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={createMutation.isPending}
                style={{ ...btnPrimary, opacity: createMutation.isPending ? 0.7 : 1 }}
              >
                {createMutation.isPending ? '⏳ Сохраняю...' : '✓ Добавить'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={btnSecondary}>Отмена</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Фильтры ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filterLead}
          onChange={e => setFilterLead(e.target.value)}
          style={{ ...selectStyle, maxWidth: '220px' }}
        >
          <option value="">Все ученики</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <select
          value={filterMethod}
          onChange={e => setFilterMethod(e.target.value)}
          style={{ ...selectStyle, maxWidth: '170px' }}
        >
          <option value="">Все методы</option>
          {Object.entries(METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>

        {(filterLead || filterMethod) && (
          <button
            onClick={() => { setFilterLead(''); setFilterMethod('') }}
            style={{ ...btnSecondary, padding: '7px 14px', fontSize: '12px' }}
          >
            ✕ Сбросить
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text)' }}>
          {filtered.length} из {payments.length} платежей
          {' · '}
          <span style={{ fontWeight: '700', color: 'var(--green)' }}>
            {filtered.reduce((s, p) => s + p.amount, 0).toLocaleString()} ₸
          </span>
        </div>
      </div>

      {/* ── Таблица ── */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                {['Ученик', 'Сумма', 'Метод', 'Примечание', 'Менеджер', 'Дата', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const method = METHOD_LABELS[p.method || 'cash'] || METHOD_LABELS.cash
                return (
                  <tr
                    key={p.id}
                    style={{ borderTop: '1px solid var(--border)', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    {/* Ученик */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text3)' }}>
                        {p.lead?.name || '—'}
                      </div>
                      {p.lead?.phone && (
                        <div style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--mono)', marginTop: '2px' }}>
                          {p.lead.phone}
                        </div>
                      )}
                    </td>

                    {/* Сумма */}
                    <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: '700', color: 'var(--green)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                      +{p.amount.toLocaleString()} ₸
                    </td>

                    {/* Метод */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '600',
                        background: method.color + '18', color: method.color,
                        border: `1px solid ${method.color}30`, whiteSpace: 'nowrap',
                      }}>
                        {method.icon} {method.label}
                      </span>
                    </td>

                    {/* Примечание */}
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.note || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>

                    {/* Менеджер */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {p.lead?.manager?.name || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>

                    {/* Дата */}
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                      {dayjs(p.createdAt).format('DD.MM.YYYY')}
                      <div style={{ fontSize: '10px', opacity: 0.6 }}>{dayjs(p.createdAt).format('HH:mm')}</div>
                    </td>

                    {/* Удалить */}
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => { if (confirm('Удалить платёж?')) deleteMutation.mutate(p.id) }}
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.2)'}
                        onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.1)'}
                      >🗑️</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text)', fontSize: '14px' }}>
                    ◎ {payments.length === 0 ? 'Платежей пока нет' : 'Нет платежей по фильтру'}
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

// ── Компонент карточки метрики ─────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '16px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '80px', height: '100%',
        background: `radial-gradient(circle at 100% 50%, ${color}15 0%, transparent 70%)`,
      }} />
      <div style={{ fontSize: '11px', color: 'var(--text)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700', color, fontFamily: 'var(--mono)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}

// ── Стили ──────────────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block',
  fontSize: '11px', fontWeight: '600', color: 'var(--text)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: '5px',
}
const inputStyle = {
  padding: '9px 12px',
  background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: '8px', color: 'var(--text3)', fontSize: '13px',
  outline: 'none', boxSizing: 'border-box', width: '100%',
  transition: 'border-color 0.15s',
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const btnPrimary = {
  padding: '9px 20px',
  background: 'var(--accent2)', color: 'white',
  border: 'none', borderRadius: '8px', cursor: 'pointer',
  fontSize: '13px', fontWeight: '600',
  boxShadow: '0 2px 8px var(--accent-glow)',
  letterSpacing: '0.01em', whiteSpace: 'nowrap',
}
const btnSecondary = {
  padding: '9px 18px',
  background: 'var(--bg3)', color: 'var(--text2)',
  border: '1px solid var(--border)', borderRadius: '8px',
  cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap',
}
const thStyle = {
  padding: '11px 16px', textAlign: 'left',
  fontSize: '11px', color: 'var(--text)',
  fontWeight: '600', letterSpacing: '0.06em',
  textTransform: 'uppercase', whiteSpace: 'nowrap',
}