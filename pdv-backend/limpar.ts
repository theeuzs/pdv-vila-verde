import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function limpar() {
  console.log("🔥 Iniciando a limpeza pesada...")

  try {
    // 1. Apaga os ITENS das vendas (libera os produtos)
    console.log("1. Apagando itens das vendas...")
    await prisma.itemVenda.deleteMany({}) 

    // 2. Apaga as VENDAS em si (opcional, mas bom pra não deixar lixo)
    console.log("2. Apagando histórico de vendas...")
    await prisma.venda.deleteMany({})

    // 3. AGORA SIM: Apaga os Produtos
    console.log("3. Apagando os produtos...")
    await prisma.produto.deleteMany({}) 

    console.log("✨ Tudo limpo! O terreno está pronto para a importação correta.")
  
  } catch (error) {
    console.error("❌ Erro ao limpar:", error)
  }
}

limpar()