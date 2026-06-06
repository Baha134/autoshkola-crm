const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

exports.getByLead = async (req, res) => {
  try {
    const events = await prisma.leadEvent.findMany({
      where: { leadId: Number(req.params.leadId) },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' }
    })
    res.json(events)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.create = async (req, res) => {
  try {
    const { leadId, type = 'comment', text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Текст обязателен' })

    const event = await prisma.leadEvent.create({
      data: {
        leadId: Number(leadId),
        userId: req.user.id,
        type,
        text: text.trim()
      },
      include: { user: { select: { id: true, name: true } } }
    })
    res.status(201).json(event)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.remove = async (req, res) => {
  try {
    await prisma.leadEvent.delete({ where: { id: Number(req.params.id) } })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}