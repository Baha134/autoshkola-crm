const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@autoshkola.kz' },
    update: {},
    create: {
      email: 'admin@autoshkola.kz',
      password: hash,
      name: 'Администратор',
      role: 'admin',
    },
  })

  console.log('✅ Seed выполнен. Логин: admin@autoshkola.kz / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())