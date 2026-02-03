import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Cria o Gerente Matheus
  await prisma.user.create({
   data: {
      nome: 'Matheus',
      email: 'matheus@vilaverde.com', // <--- ADICIONE ESSA LINHA AQUI!
      senha: 'admin',
      cargo: 'GERENTE',
    },
  })
  console.log('✅ Usuário Gerente criado com sucesso!')
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