// src/controllers/payments.controller.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Платежи конкретного лида
exports.getByLead = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { leadId: Number(req.params.leadId) },
      orderBy: { createdAt: 'desc' },
    })
    res.json(payments)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Все платежи (для страницы Платежи и экспорта)
exports.getAll = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin'
    const where = isAdmin
      ? {}
      : { lead: { managerId: req.user.id } }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            courseAmount: true,
            managerId: true,
            manager: { select: { id: true, name: true } },
            payments: { select: { amount: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Добавляем paid/debt прямо в лид внутри платежа
    const result = payments.map(p => ({
      ...p,
      lead: p.lead
        ? {
            ...p.lead,
            paid: p.lead.payments.reduce((s, x) => s + x.amount, 0),
            debt: Math.max(
              0,
              (p.lead.courseAmount || 0) -
                p.lead.payments.reduce((s, x) => s + x.amount, 0)
            ),
          }
        : null,
    }))

    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Создать платёж
exports.create = async (req, res) => {
  try {
    const { leadId, amount, note, method } = req.body
    if (!leadId || !amount) return res.status(400).json({ error: 'leadId и amount обязательны' })

    const payment = await prisma.payment.create({
      data: {
        leadId: Number(leadId),
        amount: Number(amount),
        note: note || null,
        method: method || 'cash',
      },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
      },
    })
    res.status(201).json(payment)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Удалить платёж
exports.remove = async (req, res) => {
  try {
    await prisma.payment.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Экспорт платежей в CSV
exports.exportCsv = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin'
    const where = isAdmin ? {} : { lead: { managerId: req.user.id } }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        lead: {
          select: {
            name: true,
            phone: true,
            manager: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const header = 'ID,Ученик,Телефон,Сумма (₸),Метод,Примечание,Менеджер,Дата\n'
    const rows = payments.map(p => {
      const date = new Date(p.createdAt).toLocaleDateString('ru-RU')
      const name = `"${p.lead?.name || ''}"`
      const phone = p.lead?.phone || ''
      const manager = `"${p.lead?.manager?.name || ''}"`
      const note = `"${(p.note || '').replace(/"/g, '""')}"`
      const method = p.method || 'cash'
      return `${p.id},${name},${phone},${p.amount},${method},${note},${manager},${date}`
    }).join('\n')

    const csv = '\uFEFF' + header + rows // BOM для Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="payments_${Date.now()}.csv"`)
    res.send(csv)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
