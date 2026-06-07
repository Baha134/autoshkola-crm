const router = require('express').Router()
const auth = require('../middleware/auth')
const { getAll, getOne, create, update, remove } = require('../controllers/leads.controller')
const { sendMessage, getStatus } = require('../services/whatsapp.service')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

router.get('/', auth, getAll)
router.get('/:id', auth, getOne)
router.post('/', auth, create)
router.put('/:id', auth, update)
router.delete('/:id', auth, remove)

// Проверить статус WhatsApp подключения
router.get('/whatsapp-status', auth, (req, res) => {
  res.json({ connected: getStatus() })
})

// Отправить WhatsApp сообщение лиду
router.post('/:id/send-whatsapp', auth, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: Number(req.params.id) } })
    if (!lead) return res.status(404).json({ error: 'Лид не найден' })

    const text = req.body.text || `Здравствуйте, ${lead.name}! Это автошкола. Напоминаем о вашей заявке. Ждём вас! 🚗`

    await sendMessage(lead.phone, text)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router