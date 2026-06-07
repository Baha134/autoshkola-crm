const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const { PrismaClient } = require('@prisma/client')
const path = require('path')
const qrcode = require('qrcode-terminal')

const prisma = new PrismaClient()
let sock = null
let reconnectCount = 0
const MAX_RECONNECTS = 5
const RECONNECT_DELAY = 10000

async function startWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(__dirname, '../../whatsapp-session')
    )

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 30000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 5000,
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrcode.generate(qr, { small: true })
        console.log('📱 Отсканируй QR код телефоном автошколы')
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut

        if (isLoggedOut) {
          console.log('❌ WhatsApp: сессия завершена (loggedOut). Переподключение не нужно.')
          sock = null
          return
        }

        if (reconnectCount >= MAX_RECONNECTS) {
          console.log(`⛔ WhatsApp: превышен лимит переподключений (${MAX_RECONNECTS}). Остановлено.`)
          console.log('   CRM работает в обычном режиме без WhatsApp.')
          sock = null
          return
        }

        reconnectCount++
        console.log(`🔄 WhatsApp переподключение ${reconnectCount}/${MAX_RECONNECTS} через ${RECONNECT_DELAY / 1000}с...`)
        setTimeout(() => startWhatsApp(), RECONNECT_DELAY)

      } else if (connection === 'open') {
        reconnectCount = 0
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

  } catch (e) {
    console.error('Ошибка запуска WhatsApp:', e.message)

    if (reconnectCount < MAX_RECONNECTS) {
      reconnectCount++
      console.log(`🔄 Повтор через ${RECONNECT_DELAY / 1000}с... (${reconnectCount}/${MAX_RECONNECTS})`)
      setTimeout(() => startWhatsApp(), RECONNECT_DELAY)
    } else {
      console.log('⛔ WhatsApp остановлен. CRM работает без него.')
    }
  }
}

// ─── Отправить сообщение конкретному номеру ───────────────────────────────────
async function sendMessage(phone, text) {
  if (!sock) throw new Error('WhatsApp не подключён к серверу')
  const clean = phone.replace(/\D/g, '')
  const jid = `${clean}@s.whatsapp.net`
  await sock.sendMessage(jid, { text })
  console.log(`📤 Отправлено сообщение на ${clean}: ${text.slice(0, 60)}...`)
}

// ─── Проверить статус подключения ────────────────────────────────────────────
function getStatus() {
  return sock !== null
}

module.exports = { startWhatsApp, sendMessage, getStatus }