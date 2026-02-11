import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando script de criação de ADMIN...')

  try {
    // 1. Apaga usuários antigos para não dar erro de duplicidade
    await prisma.user.deleteMany()
    console.log('🗑️ Usuários antigos apagados.')

    // 2. Cria a senha hash
    const senhaForte = await hash('123456', 8)

    // 3. Cria o usuário NOVO com o campo username
    await prisma.user.create({
      data: {
        nome: 'Admin Vila Verde',
        username: 'admin',       // <--- OBRIGATÓRIO AGORA
        email: 'admin@vilaverde.com',
        senha: senhaForte,
        cargo: 'GERENTE'
      }
    })

    console.log('✅ SUCESSO! Usuário criado.')
    console.log('👤 User: admin')
    console.log('🔑 Pass: 123456')

  } catch (erro) {
    console.error('❌ Deu erro:', erro)
  }
}

main()