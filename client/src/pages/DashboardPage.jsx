import { useQuery } from '@tanstack/react-query'
import api from '../api'
import dayjs from 'dayjs'

const STATUS_LABELS = { new: 'Новый', in_progress: 'В работе', done: 'Готов', rejected: 'Отказ' }
const STATUS_COLORS = { new: '#3b82f6', in_progress: '#f59e0b', done: '#10b981', rejected: '#ef4444' }
const SOURCE_LABELS = { manual: 'Вручную', whatsapp: 'WhatsApp', instagram: 'Instagram', website: 'Сайт' }

function StatCard({ label, value, sub, color = '#2563eb' }) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px',
      padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data)
  })

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments-all'],
    queryFn: async () => {
      const all = await Promise.all(leads.map(l => api.get(`/payments/lead/${l.id}`).then(r => r.data)))
      return all.flat()
    },
    enabled: leads.length > 0
  })

  const isLoading = leadsLoading || paymentsLoading

  // Считаем статистику
  const totalLeads = leads.length
  const newLeads = leads.filter(l => l.status === 'new').length
  const doneLeads = leads.filter(l => l.status === 'done').length
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)

  // Лиды по статусам
  const byStatus = ['new', 'in_progress', 'done', 'rejected'].map(s => ({
    status: s,
    count: leads.filter(l => l.status === s).length
  }))

  // Лиды по источникам
  const bySource = ['manual', 'whatsapp', 'instagram', 'website'].map(src => ({
    source: src,
    count: leads.filter(l => l.source === src).length
  })).filter(x => x.count > 0)

  // Последние 5 лидов
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  // Последние 5 платежей
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8' }}>
      Загрузка...
    </div>
  )

  const maxCount = Math.max(...byStatus.map(x => x.count), 1)

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: '600', marginTop: 0, marginBottom: '24px' }}>
        Дашборд
        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '400', marginLeft: '10px' }}>
          {dayjs().format('DD MMMM YYYY')}
        </span>
      </h1>

      {/* Карточки статистики */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Всего лидов" value={totalLeads} color="#2563eb" />
        <StatCard label="Новых лидов" value={newLeads} sub="ожидают обработки" color="#f59e0b" />
        <StatCard label="Завершено" value={doneLeads} sub={`${totalLeads ? Math.round(doneLeads / totalLeads * 100) : 0}% конверсия`} color="#10b981" />
        <StatCard label="Выручка" value={totalRevenue.toLocaleString() + ' ₸'} color="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* Лиды по статусам */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>По статусам</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {byStatus.map(({ status, count }) => (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{STATUS_LABELS[status]}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: STATUS_COLORS[status] }}>{count}</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${maxCount ? (count / maxCount) * 100 : 0}%`,
                    background: STATUS_COLORS[status],
                    borderRadius: '3px',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Лиды по источникам */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>По источникам</div>
          {bySource.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Нет данных</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bySource.map(({ source, count }) => (
                <div key={source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{SOURCE_LABELS[source] || source}</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: '100px',
                    background: '#f1f5f9', fontSize: '13px', fontWeight: '600', color: '#1e293b'
                  }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Последние лиды */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Последние лиды</div>
          {recentLeads.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Нет лидов</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentLeads.map(lead => (
                <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{lead.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{lead.phone} · {dayjs(lead.createdAt).format('DD.MM')}</div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: '100px', fontSize: '11px',
                    background: STATUS_COLORS[lead.status] + '20',
                    color: STATUS_COLORS[lead.status]
                  }}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Последние платежи */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Последние платежи</div>
          {recentPayments.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Нет платежей</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentPayments.map(p => {
                const lead = leads.find(l => l.id === p.leadId)
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b' }}>{lead?.name || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{dayjs(p.createdAt).format('DD.MM.YYYY')}</div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>
                      +{p.amount.toLocaleString()} ₸
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}