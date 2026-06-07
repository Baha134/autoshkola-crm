import { useQuery } from '@tanstack/react-query'
import api from '../api'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
dayjs.locale('ru')

const STATUS_LABELS = {
  new: 'Новый',
  in_progress: 'В работе',
  done: 'Сдал экзамен',
  rejected: 'Отказ',
}
const STATUS_COLORS = {
  new: '#3b82f6',
  in_progress: '#f59e0b',
  done: '#10b981',
  rejected: '#ef4444',
}

// ─── Мини-компоненты ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon, highlight }) {
  return (
    <div style={{
      background: highlight ? `linear-gradient(135deg, ${color}18 0%, var(--bg2) 60%)` : 'var(--bg2)',
      border: `1px solid ${highlight ? color + '40' : 'var(--border)'}`,
      borderRadius: '12px',
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fadeIn 0.35s ease both',
      transition: 'border-color 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '110px', height: '110px',
        background: `radial-gradient(circle at 100% 0%, ${color}12 0%, transparent 65%)`,
      }} />
      <div style={{ position: 'absolute', top: '16px', right: '18px', fontSize: '20px', opacity: 0.45 }}>
        {icon}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text)', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text3)', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: color, marginTop: '7px', fontWeight: '500' }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${color}30, ${color})` }} />
    </div>
  )
}

function Card({ title, children, action }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '18px 20px',
      animation: 'fadeIn 0.4s ease both',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text3)', letterSpacing: '0.01em' }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ color: 'var(--text)', fontSize: '13px', textAlign: 'center', padding: '24px 0', opacity: 0.6 }}>{text}</div>
}

// ─── График лидов за 30 дней ─────────────────────────────────────────────────

function LeadsChart({ data }) {
  if (!data || data.length === 0) return <Empty text="Нет данных" />

  const maxVal  = Math.max(...data.map(d => d.count), 1)
  const chartH  = 80

  const points  = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = chartH - (d.count / maxVal) * chartH
    return `${x},${y}`
  })
  const linePath = 'M ' + points.join(' L ')
  const areaPath = `M ${points[0]} L ${points.join(' L ')} L 100,${chartH} L 0,${chartH} Z`
  const labelIndices = new Set([0, 6, 13, 20, 27, 29])

  return (
    <div>
      <div style={{ position: 'relative', height: `${chartH + 8}px`, marginBottom: '4px' }}>
        <svg viewBox={`0 0 100 ${chartH}`} preserveAspectRatio="none"
          style={{ width: '100%', height: `${chartH}px`, position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#chartGrad)" />
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeLinejoin="round" />
          {data.map((d, i) => d.count > 0 && (
            <circle key={i}
              cx={(i / (data.length - 1)) * 100}
              cy={chartH - (d.count / maxVal) * chartH}
              r="1.2" fill="#3b82f6"
            />
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        {data.map((d, i) => labelIndices.has(i) ? (
          <span key={i} style={{ fontSize: '10px', color: 'var(--text)', fontFamily: 'var(--mono)', opacity: 0.7 }}>
            {dayjs(d.date).format('D.MM')}
          </span>
        ) : <span key={i} />)}
      </div>

      <div style={{ display: 'flex', gap: '2px', marginTop: '8px', alignItems: 'flex-end', height: '28px' }}>
        {data.map((d, i) => (
          <div key={i}
            title={`${dayjs(d.date).format('D MMM')}: ${d.count} лидов`}
            style={{
              flex: 1,
              height: `${Math.max(2, (d.count / maxVal) * 28)}px`,
              background: d.count > 0 ? '#3b82f620' : 'var(--bg4)',
              borderRadius: '2px', cursor: 'default', transition: 'background 0.15s',
              border: '1px solid transparent',
            }}
            onMouseEnter={e => { e.target.style.background = '#3b82f640'; e.target.style.borderColor = '#3b82f660' }}
            onMouseLeave={e => { e.target.style.background = d.count > 0 ? '#3b82f620' : 'var(--bg4)'; e.target.style.borderColor = 'transparent' }}
          />
        ))}
      </div>

      <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text)', textAlign: 'right' }}>
        Всего за 30 дней: <span style={{ color: 'var(--text3)', fontWeight: '700', fontFamily: 'var(--mono)' }}>
          {data.reduce((s, d) => s + d.count, 0)}
        </span>
      </div>
    </div>
  )
}

// ─── Главная страница ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', color: 'var(--text)' }}>
      <div style={{ animation: 'pulse 1.2s ease infinite', fontSize: '24px' }}>◎</div>
      Загрузка дашборда...
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
      <div style={{ fontSize: '36px' }}>⚠️</div>
      <div style={{ color: 'var(--red)', fontWeight: '600' }}>Ошибка загрузки дашборда</div>
      <div style={{ color: 'var(--text)', fontSize: '12px' }}>{error.message}</div>
    </div>
  )

  const {
    totalLeads, doneLeads, conversion,
    monthRevenue, totalRevenue, totalDebt,
    newToday, newWeek,
    byStatus, chartDays, debtors, managerStats,
  } = stats

  const maxStatus = Math.max(...byStatus.map(x => x.count), 1)

  return (
    <div style={{ maxWidth: '1200px' }}>

      {/* ── Заголовок ── */}
      <div className="page-header" style={{
        marginBottom: '24px', display: 'flex',
        alignItems: 'flex-end', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text3)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Дашборд
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text)' }}>
            {dayjs().format('D MMMM YYYY')} · Общая сводка
          </div>
        </div>
        {newToday > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '100px',
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.25)',
            fontSize: '13px', color: 'var(--accent)', fontWeight: '600',
          }}>
            ◉ Сегодня новых лидов: {newToday}
          </div>
        )}
      </div>

      {/* ── 6 метрик — адаптивная сетка ── */}
      <div
        className="stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <StatCard label="Всего лидов"   value={totalLeads}                           sub={`+${newWeek} за неделю`}       color="var(--accent)"  icon="◈" />
        <StatCard label="Новых сегодня" value={newToday}                             sub={`+${newWeek} за 7 дней`}       color="#06b6d4"        icon="◉" highlight={newToday > 0} />
        <StatCard label="Конверсия"     value={`${conversion}%`}                     sub={`${doneLeads} завершено`}      color="var(--green)"   icon="◎" />
        <StatCard label="Выручка месяц" value={monthRevenue.toLocaleString() + ' ₸'} sub="текущий месяц"                 color="var(--purple)"  icon="◷" />
        <StatCard label="Всего выручка" value={totalRevenue.toLocaleString() + ' ₸'} sub="за всё время"                  color="var(--green)"   icon="◈" />
        <StatCard label="Общий долг"    value={totalDebt.toLocaleString() + ' ₸'}    sub={`${debtors.length} должников`} color="var(--red)"     icon="◎" highlight={totalDebt > 0} />
      </div>

      {/* ── Строка 2: статусы + график ── */}
      <div
        className="dash-row-2"
        style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '12px', marginBottom: '12px' }}
      >
        <Card title="По статусам">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {byStatus.map(({ status, count }) => (
              <div key={status}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: STATUS_COLORS[status],
                      boxShadow: `0 0 6px ${STATUS_COLORS[status]}80`,
                    }} />
                    <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{STATUS_LABELS[status]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {totalLeads > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                        {Math.round(count / totalLeads * 100)}%
                      </span>
                    )}
                    <span style={{
                      fontSize: '13px', fontWeight: '700',
                      color: STATUS_COLORS[status], fontFamily: 'var(--mono)',
                      minWidth: '24px', textAlign: 'right',
                    }}>
                      {count}
                    </span>
                  </div>
                </div>
                <div style={{ height: '4px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${maxStatus ? (count / maxStatus) * 100 : 0}%`,
                    background: STATUS_COLORS[status],
                    borderRadius: '2px',
                    transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow: `0 0 6px ${STATUS_COLORS[status]}50`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Лиды за последние 30 дней">
          <LeadsChart data={chartDays} />
        </Card>
      </div>

      {/* ── Строка 3: долги + менеджеры ── */}
      <div
        className="grid-2-1"
        style={{
          display: 'grid',
          gridTemplateColumns: managerStats?.length > 0 ? '1fr 1fr' : '1fr',
          gap: '12px',
        }}
      >
        <Card
          title={`Должники (${debtors.length})`}
          action={totalDebt > 0 && (
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--red)', fontFamily: 'var(--mono)' }}>
              −{totalDebt.toLocaleString()} ₸
            </span>
          )}
        >
          {debtors.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '8px' }}>
              <div style={{ fontSize: '28px' }}>✓</div>
              <div style={{ fontSize: '13px', color: 'var(--green)', fontWeight: '600' }}>Все долги погашены!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {debtors.map((d, i) => (
                <div key={d.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: i < debtors.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text3)' }}>{d.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text)', marginTop: '1px' }}>
                      {d.phone}
                      {d.courseAmount > 0 && (
                        <span style={{ marginLeft: '6px' }}>
                          · оплачено {d.paid.toLocaleString()} / {d.courseAmount.toLocaleString()} ₸
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '13px', fontWeight: '700', color: 'var(--red)',
                    fontFamily: 'var(--mono)', whiteSpace: 'nowrap', marginLeft: '12px',
                  }}>
                    −{d.debt.toLocaleString()} ₸
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {managerStats?.length > 0 && (
          <Card title="Менеджеры">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {managerStats.map(m => (
                <div key={m.id ?? 'none'} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px',
                  background: m.id === null ? 'rgba(239,68,68,0.06)' : 'var(--bg3)',
                  border: `1px solid ${m.id === null ? 'rgba(239,68,68,0.18)' : 'var(--border)'}`,
                  borderRadius: '8px',
                }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    background: m.id === null
                      ? 'rgba(239,68,68,0.15)'
                      : 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: m.id === null ? 'var(--red)' : 'white',
                    fontSize: '13px', fontWeight: '700',
                  }}>
                    {m.id === null ? '?' : m.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: m.id === null ? 'var(--red)' : 'var(--text3)' }}>
                        {m.name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                        {m.total} · {m.conversion}%
                      </span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--bg4)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${m.conversion}%`,
                        background: m.id === null ? 'var(--red)' : 'var(--green)',
                        borderRadius: '2px', transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}