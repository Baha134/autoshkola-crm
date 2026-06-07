const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ─── helpers ────────────────────────────────────────────────────────────────

function buildInclude() {
  return {
    manager: { select: { id: true, name: true } },
    payments: { orderBy: { createdAt: 'desc' } },
  }
}

/** Считаем сколько оплачено и остаток долга */
function withFinance(lead) {
  const paid = (lead.payments || []).reduce((s, p) => s + p.amount, 0)
  return {
    ...lead,
    paid,
    debt: Math.max(0, (lead.courseAmount || 0) - paid),
  }
}

// ─── controllers ────────────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const where = req.user.role === 'manager' ? { managerId: req.user.id } : {}
    const leads = await prisma.lead.findMany({
      where,
      include: buildInclude(),
      orderBy: { createdAt: 'desc' },
    })
    res.json(leads.map(withFinance))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.getOne = async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(req.params.id) },
      include: buildInclude(),
    })
    if (!lead) return res.status(404).json({ error: 'Лид не найден' })
    res.json(withFinance(lead))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { name, phone, source, status, comment, managerId, courseAmount, nextCallAt } = req.body
    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        source,
        status,
        comment,
        managerId: managerId ? Number(managerId) : null,
        courseAmount: courseAmount ? Number(courseAmount) : 0,
        nextCallAt: nextCallAt ? new Date(nextCallAt) : null,
      },
      include: buildInclude(),
    })
    res.status(201).json(withFinance(lead))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.update = async (req, res) => {
  try {
    const {
      name, phone, source, status, comment, managerId,
      scheduleDays, scheduleTime,
      courseAmount, nextCallAt,
    } = req.body

    const lead = await prisma.lead.update({
      where: { id: Number(req.params.id) },
      data: {
        name,
        phone,
        source,
        status,
        comment,
        managerId: managerId ? Number(managerId) : null,
        scheduleDays,
        scheduleTime,
        courseAmount: courseAmount !== undefined ? Number(courseAmount) : undefined,
        nextCallAt: nextCallAt !== undefined
          ? (nextCallAt ? new Date(nextCallAt) : null)
          : undefined,
      },
      include: buildInclude(),
    })
    res.json(withFinance(lead))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.remove = async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}