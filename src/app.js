const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const { startWhatsApp } = require('./services/whatsapp.service')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/leads', require('./routes/leads.routes'))
app.use('/api/payments', require('./routes/payments.routes'))
app.use('/api/users', require('./routes/users.routes'))
app.use('/api/events', require('./routes/lead_events.routes'))
app.use('/api/dashboard', require('./routes/dashboard.routes'))

app.get('/', (req, res) => {
  res.json({ message: 'Autoshkola CRM API работает ✅' })
})

// ✅ Keep-alive endpoint — UptimeRobot будет пинговать сюда каждые 10 минут
// чтобы Railway не усыплял сервер
app.get('/ping', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`)
  startWhatsApp()
})