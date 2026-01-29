import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Criptografa a senha antes de salvar
  const passwordHash = await hash('admin123', 8)

  // Cria o usuário Programador (se já existir, ele só atualiza)
  const user = await prisma.user.upsert({
    where: { email: 'admin@vilaverde.com' },
    update: {
        senha: passwordHash, // <--- ADICIONE ISSO! (Força atualizar a senha se o usuário já existir)
        cargo: 'GERENTE'
    },
    create: {
      nome: 'Programador Master',
      email: 'admin@vilaverde.com',
      senha: passwordHash,
      cargo: 'GERENTE',
    },
  })

  console.log('✅ Usuário Admin criado com sucesso:', user.email)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })