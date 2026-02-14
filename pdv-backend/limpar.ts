import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function limpar() {
  console.log("🔥 Iniciando a limpeza pesada...")

  try {
    // 1. Apaga PAGAMENTOS (para não travar a venda)
    console.log("1. Apagando pagamentos...")
    // Se sua tabela chama 'Pagamento' ou 'PagamentoVenda', ajuste aqui:
    // O try/catch interno garante que se a tabela não existir, ele segue.
    try { await prisma.pagamento.deleteMany({}) } catch(e) {} 

    // 2. Apaga os ITENS das vendas
    console.log("2. Apagando itens das vendas...")
    await prisma.itemVenda.deleteMany({}) 

    // 3. Apaga as VENDAS
    console.log("3. Apagando histórico de vendas...")
    await prisma.venda.deleteMany({})

    // 4. AGORA SIM: Apaga os Produtos
    console.log("4. Apagando os produtos...")
    await prisma.produto.deleteMany({}) 

    console.log("✨ Tudo limpo! O terreno está pronto para a importação correta.")
  
  } catch (error) {
    console.error("❌ Erro ao limpar:", error)
  } finally {
    await prisma.$disconnect()
  }
}

limpar()