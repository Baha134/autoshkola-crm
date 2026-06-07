const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

exports.getAll = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    })
    res.json(users)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Детальная статистика по каждому менеджеру (только для admin)
exports.getStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Только для администратора' })
    }

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })

    // Все лиды с платежами
    const leads = await prisma.lead.findMany({
      include: {
        payments: { select: { amount: true } },
      }
    })

    const STATUSES = ['new', 'in_progress', 'done', 'rejected']

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6)
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const stats = users.map(u => {
      const mLeads = leads.filter(l => l.managerId === u.id)
      const total = mLeads.length
      const done = mLeads.filter(l => l.status === 'done').length
      const conversion = total > 0 ? Math.round(done / total * 100) : 0

      const allPayments = mLeads.flatMap(l => l.payments)
      const revenue = allPayments.reduce((s, p) => s + p.amount, 0)
      const monthRevenue = allPayments
        .filter(p => new Date(p.createdAt) >= monthStart)
        .reduce((s, p) => s + p.amount, 0)

      const newToday = mLeads.filter(l => new Date(l.createdAt) >= dayStart).length
      const newWeek  = mLeads.filter(l => new Date(l.createdAt) >= weekStart).length

      // Долги
      const totalDebt = mLeads.reduce((s, l) => {
        const paid = l.payments.reduce((sp, p) => sp + p.amount, 0)
        return s + Math.max(0, (l.courseAmount || 0) - paid)
      }, 0)

      // По статусам
      const byStatus = STATUSES.map(st => ({
        status: st,
        count: mLeads.filter(l => l.status === st).length
      }))

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        total,
        done,
        conversion,
        revenue,
        monthRevenue,
        totalDebt,
        newToday,
        newWeek,
        byStatus,
      }
    })

    // Лиды без менеджера
    const noManagerLeads = leads.filter(l => !l.managerId)
    const noManagerCount = noManagerLeads.length

    res.json({ stats, noManagerCount })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { email, password, name, role } = req.body
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, password: hash, name, role },
      select: { id: true, email: true, name: true, role: true }
    })
    res.status(201).json(user)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.remove = async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}