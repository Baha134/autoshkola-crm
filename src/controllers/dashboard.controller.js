// src/controllers/dashboard.controller.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

exports.getStats = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin'
    const where = isAdmin ? {} : { managerId: req.user.id }

    // Все лиды с платежами и менеджером
    const leads = await prisma.lead.findMany({
      where,
      include: {
        payments: true,
        manager: { select: { id: true, name: true } },
      },
    })

    // ── Базовые метрики ──────────────────────────────────────────────
    const totalLeads = leads.length
    const doneLeads  = leads.filter(l => l.status === 'done').length
    const conversion = totalLeads ? Math.round(doneLeads / totalLeads * 100) : 0

    // Выручка за текущий месяц
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const allPayments = leads.flatMap(l => l.payments)
    const monthRevenue = allPayments
      .filter(p => new Date(p.createdAt) >= monthStart)
      .reduce((s, p) => s + p.amount, 0)
    const totalRevenue = allPayments.reduce((s, p) => s + p.amount, 0)

    // ── Долги ────────────────────────────────────────────────────────
    const debtors = leads
      .map(l => {
        const paid = l.payments.reduce((s, p) => s + p.amount, 0)
        const debt = Math.max(0, (l.courseAmount || 0) - paid)
        return { id: l.id, name: l.name, phone: l.phone, courseAmount: l.courseAmount || 0, paid, debt }
      })
      .filter(l => l.debt > 0)
      .sort((a, b) => b.debt - a.debt)

    const totalDebt = debtors.reduce((s, l) => s + l.debt, 0)

    // ── Новые лиды сегодня / неделю ──────────────────────────────────
    const dayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(dayStart); weekStart.setDate(weekStart.getDate() - 6)

    const newToday = leads.filter(l => new Date(l.createdAt) >= dayStart).length
    const newWeek  = leads.filter(l => new Date(l.createdAt) >= weekStart).length

    // ── По статусам ──────────────────────────────────────────────────
    const STATUSES = ['new', 'in_progress', 'done', 'rejected']
    const byStatus = STATUSES.map(s => ({
      status: s,
      count: leads.filter(l => l.status === s).length,
    }))

    // ── График: лиды по дням за последние 30 дней ────────────────────
    const days30Start = new Date(dayStart); days30Start.setDate(days30Start.getDate() - 29)
    const chartDays = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(days30Start)
      d.setDate(d.getDate() + i)
      const nextD = new Date(d); nextD.setDate(nextD.getDate() + 1)
      chartDays.push({
        date: d.toISOString().slice(0, 10),
        count: leads.filter(l => {
          const c = new Date(l.createdAt)
          return c >= d && c < nextD
        }).length,
      })
    }

    // ── Статистика менеджеров (только для admin) ─────────────────────
    let managerStats = []
    if (isAdmin) {
      const managers = await prisma.user.findMany({
        select: { id: true, name: true }
      })
      managerStats = managers.map(m => {
        const mLeads = leads.filter(l => l.managerId === m.id)
        const mDone  = mLeads.filter(l => l.status === 'done').length
        return {
          id: m.id,
          name: m.name,
          total: mLeads.length,
          done: mDone,
          conversion: mLeads.length ? Math.round(mDone / mLeads.length * 100) : 0,
        }
      }).filter(m => m.total > 0).sort((a, b) => b.total - a.total)

      const noManager = leads.filter(l => !l.managerId).length
      if (noManager > 0) {
        managerStats.push({ id: null, name: 'Без менеджера', total: noManager, done: 0, conversion: 0 })
      }
    }

    res.json({
      totalLeads,
      doneLeads,
      conversion,
      monthRevenue,
      totalRevenue,
      totalDebt,
      newToday,
      newWeek,
      byStatus,
      chartDays,
      debtors: debtors.slice(0, 10), // топ-10 должников
      managerStats,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
