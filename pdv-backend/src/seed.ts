import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando o Seed...')

  // 1. Limpa a tabela de usuários (para não dar erro de duplicado)
  // O try/catch evita erro se a tabela não existir
  try {
      await prisma.user.deleteMany() 
  } catch (e) {
      console.log('Tabela user vazia ou inexistente.')
  }

  // 2. Cria o ADMIN
  console.log('🔑 Gerando senha para "123456"...')
  const senhaForte = await hash('123456', 8)

  await prisma.user.create({
    data: {
      nome: 'Admin Vila Verde',
      username: 'admin',      // 👈 O campo novo que estava faltando
      email: 'admin@vilaverde.com',
      senha: senhaForte,      // Senha: 123456
      cargo: 'GERENTE'
    }
  })

  console.log('✅ Usuário criado com sucesso!')
  console.log('👉 Login: admin')
  console.log('👉 Senha: 123456')
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