const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const { PrismaClient } = require('@prisma/client')
const path = require('path')
const qrcode = require('qrcode-terminal')

const prisma = new PrismaClient()
let sock = null

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, '../../whatsapp-session')
  )

  sock = makeWASocket({
    auth: state,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true })
      console.log('📱 Отсканируй QR код телефоном автошколы')
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('WhatsApp отключён, переподключение:', shouldReconnect)
      if (shouldReconnect) startWhatsApp()
    } else if (connection === 'open') {
      console.log('✅ WhatsApp подключён!')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      if (!msg.message) continue

      const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '')
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

      console.log(`📱 Новое сообщение от ${phone}: ${text}`)

      try {
        const existing = await prisma.lead.findFirst({ where: { phone } })
        if (!existing) {
          await prisma.lead.create({
            data: {
              name: `WhatsApp ${phone}`,
              phone,
              source: 'whatsapp',
              status: 'new',
              comment: text,
            }
          })
          console.log(`✅ Новый лид создан: ${phone}`)
        }
      } catch (e) {
        console.error('Ошибка создания лида:', e.message)
      }
    }
  })
}

module.exports = { startWhatsApp }