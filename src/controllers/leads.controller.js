const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

exports.getAll = async (req, res) => {
  try {
    const where = req.user.role === 'manager' ? { managerId: req.user.id } : {}
    const leads = await prisma.lead.findMany({
      where,
      include: { manager: { select: { id: true, name: true } }, payments: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leads)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.getOne = async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(req.params.id) },
      include: { manager: { select: { id: true, name: true } }, payments: true }
    })
    if (!lead) return res.status(404).json({ error: 'Лид не найден' })
    res.json(lead)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { name, phone, source, status, comment, managerId } = req.body
    const lead = await prisma.lead.create({
      data: { name, phone, source, status, comment, managerId: managerId ? Number(managerId) : null }
    })
    res.status(201).json(lead)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.update = async (req, res) => {
  try {
    const { name, phone, source, status, comment, managerId } = req.body
    const lead = await prisma.lead.update({
      where: { id: Number(req.params.id) },
      data: { name, phone, source, status, comment, managerId: managerId ? Number(managerId) : null }
    })
    res.json(lead)
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