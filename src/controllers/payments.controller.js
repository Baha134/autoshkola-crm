const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

exports.getByLead = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { leadId: Number(req.params.leadId) },
      orderBy: { createdAt: 'desc' }
    })
    res.json(payments)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { leadId, amount, note } = req.body
    const payment = await prisma.payment.create({
      data: { leadId: Number(leadId), amount: Number(amount), note }
    })
    res.status(201).json(payment)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.remove = async (req, res) => {
  try {
    await prisma.payment.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}