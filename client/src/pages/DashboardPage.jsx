import { useQuery } from '@tanstack/react-query'
import api from '../api'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

const STATUS_LABELS = { new: 'Новый', in_progress: 'В работе', done: 'Готов', rejected: 'Отказ' }
const STATUS_COLORS = { new: '#3b82f6', in_progress: '#f59e0b', done: '#10b981', rejected: '#ef4444' }
const SOURCE_LABELS = { manual: 'Вручную', whatsapp: 'WhatsApp', instagram: 'Instagram', website: 'Сайт' }
const SOURCE_ICONS = { manual: '✎', whatsapp: '●', instagram: '◎', website: '◷' }

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fadeIn 0.35s ease both',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '100px', height: '100px',
        background: `radial-gradient(circle at 100% 0%, ${color}14 0%, transparent 70%)`,
        borderRadius: '0 12px 0 0',
      }} />
      <div style={{
        position: 'absolute', top: '16px', right: '16px',
        fontSize: '22px', opacity: 0.5,
      }}>{icon}</div>
      <div style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '8px', fontWeight: '500', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '30px', fontWeight: '700', color: 'var(--text3)', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: color, marginTop: '8px', fontWeight: '500' }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}40, ${color})` }} />
    </div>
  )
}

export default function DashboardPage() {
  // ✅ ИСПРАВЛЕНО: один запрос вместо N+1
  // Платежи уже включены в ответ /leads через include: { payments: true }
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.get('/leads').then(r => r.data)
  })

  // Достаём платежи из уже загруженных лидов — без дополнительных запросов!
  const payments = leads.flatMap(l => l.payments ?? [])

  const totalLeads = leads.length
  const newLeads = leads.filter(l => l.status === 'new').length
  const doneLeads = leads.filter(l => l.status === 'done').length
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
  const conversion = totalLeads ? Math.round(doneLeads / totalLeads * 100) : 0

  const byStatus = ['new', 'in_progress', 'done', 'rejected'].map(s => ({
    status: s, count: leads.filter(l => l.status === s).length
  }))

  const bySource = ['manual', 'whatsapp', 'instagram', 'website'].map(src => ({
    source: src, count: leads.filter(l => l.source === src).length
  })).filter(x => x.count > 0)

  const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)
  const recentPayments = [...payments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>◎</div>
      Загрузка...
    </div>
  )

  const maxCount = Math.max(...byStatus.map(x => x.count), 1)

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Заголовок */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Дашборд
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>
            {dayjs().format('D MMMM YYYY')} · Общая сводка
          </div>
        </div>
      </div>

      {/* Карточки */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <StatCard label="Всего лидов"  value={totalLeads}                                   sub="за всё время"           color="var(--accent)"  icon="◈" />
        <StatCard label="Новых"        value={newLeads}                                      sub="ожидают обработки"     color="var(--amber)"   icon="◉" />
        <StatCard label="Конверсия"    value={`${conversion}%`}                              sub={`${doneLeads} завершено`} color="var(--green)" icon="◎" />
        <StatCard label="Выручка"      value={totalRevenue.toLocaleString() + ' ₸'}          sub="все платежи"           color="var(--purple)"  icon="◷" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        {/* По статусам */}
        <Card title="По статусам">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {byStatus.map(({ status, count }) => (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{STATUS_LABELS[status]}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: STATUS_COLORS[status], fontFamily: 'var(--mono)' }}>{count}</span>
                </div>
                <div style={{ height: '5px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${maxCount ? (count / maxCount) * 100 : 0}%`,
                    background: STATUS_COLORS[status],
                    borderRadius: '3px',
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: `0 0 8px ${STATUS_COLORS[status]}60`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* По источникам */}
        <Card title="По источникам">
          {bySource.length === 0 ? (
            <div style={{ color: 'var(--text)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Нет данных</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bySource.map(({ source, count }) => (
                <div key={source} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg3)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', opacity: 0.7 }}>{SOURCE_ICONS[source]}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{SOURCE_LABELS[source] || source}</span>
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: '100px',
                    background: 'var(--bg4)', fontSize: '12px', fontWeight: '700',
                    color: 'var(--text3)', fontFamily: 'var(--mono)',
                  }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {/* Последние лиды */}
        <Card title="Последние лиды">
          {recentLeads.length === 0 ? (
            <Empty text="Нет лидов" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentLeads.map((lead, i) => (
                <div key={lead.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: i < recentLeads.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text3)' }}>{lead.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '1px' }}>{lead.phone} · {dayjs(lead.createdAt).format('DD.MM')}</div>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Последние платежи */}
        <Card title="Последние платежи">
          {recentPayments.length === 0 ? (
            <Empty text="Нет платежей" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentPayments.map((p, i) => {
                const lead = leads.find(l => l.id === p.leadId)
                return (
                  <div key={p.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 0',
                    borderBottom: i < recentPayments.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text3)' }}>{lead?.name || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '1px' }}>{dayjs(p.createdAt).format('DD.MM.YYYY')}</div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--green)', fontFamily: 'var(--mono)', letterSpacing: '-0.01em' }}>
                      +{p.amount.toLocaleString()} ₸
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '18px 20px',
      animation: 'fadeIn 0.4s ease both',
    }}>
      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text3)', marginBottom: '16px', letterSpacing: '0.01em' }}>{title}</div>
      {children}
    </div>
  )
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status]
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: '600',
      background: color + '18', color,
      border: `1px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function Empty({ text }) {
  return <div style={{ color: 'var(--text)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>{text}</div>
}