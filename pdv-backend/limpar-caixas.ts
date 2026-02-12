import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Iniciando limpeza dos caixas...')
  
  // Apaga todos os registros de caixa (abertos ou fechados)
  await prisma.caixa.deleteMany()
  
  console.log('✅ SUCESSO! Todos os caixas foram removidos.')
  console.log('🚀 Agora você pode abrir o caixa no sistema normalmente.')
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect())