import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'

const app = Fastify()
const prisma = new PrismaClient()

app.register(cors, { 
  origin: true, // Permite qualquer origem (Frontend)
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Libera explicitamente o DELETE
  allowedHeaders: ['Content-Type'] // Libera cabeçalhos padrões
})

// --- ROTAS DE PRODUTOS ---

// Listar
app.get('/produtos', async () => {
  return await prisma.produto.findMany({ orderBy: { nome: 'asc' } })
})

// Cadastrar
app.post('/produtos', async (request, reply) => {
  const dados = request.body as any
  try {
    const produto = await prisma.produto.create({
      data: {
        nome: dados.nome,
        codigoBarra: dados.codigoBarra,
        precoCusto: dados.precoCusto,
        precoVenda: dados.precoVenda,
        estoque: dados.estoque,
        unidade: dados.unidade,
        categoria: dados.categoria
      }
    })
    return reply.status(201).send(produto)
  } catch (erro) {
    return reply.status(400).send({ erro: "Erro ao cadastrar. Código de barras duplicado?" })
  }
})

// Editar (NOVO)
app.put('/produtos/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const dados = request.body as any
  try {
    const produto = await prisma.produto.update({
      where: { id: Number(id) },
      data: {
        nome: dados.nome,
        codigoBarra: dados.codigoBarra,
        precoCusto: dados.precoCusto,
        precoVenda: dados.precoVenda,
        estoque: dados.estoque,
        unidade: dados.unidade,
        categoria: dados.categoria
      }
    })
    return produto
  } catch (erro) {
    return reply.status(400).send({ erro: "Erro ao atualizar produto." })
  }
})

// Excluir (NOVO)
app.delete('/produtos/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  try {
    await prisma.produto.delete({ where: { id: Number(id) } })
    return reply.status(204).send()
  } catch (erro) {
    // Se o produto já foi vendido, o banco não deixa apagar para não quebrar o histórico
    return reply.status(400).send({ erro: "Não é possível excluir um produto que já possui vendas registradas." })
  }
})

// --- ROTAS DE VENDAS ---

// Realizar Venda
app.post('/vendas', async (request, reply) => {
  const dados = request.body as any
  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar Venda
      const venda = await tx.venda.create({ data: { total: 0 } }) // O total será atualizado no final

      let totalVenda = 0
      
      for (const item of dados.itens) {
        const produtoDb = await tx.produto.findUnique({ where: { id: item.produtoId } })
        if (!produtoDb) throw new Error("Produto não encontrado")
        if (Number(produtoDb.estoque) < item.quantidade) throw new Error(`Sem estoque para: ${produtoDb.nome}`)

        const totalItem = Number(produtoDb.precoVenda) * item.quantidade
        totalVenda += totalItem

        // 2. Criar Item
        await tx.itemVenda.create({
          data: {
            vendaId: venda.id,
            produtoId: produtoDb.id,
            quantidade: item.quantidade,
            precoUnit: produtoDb.precoVenda
          }
        })

        // 3. Baixar Estoque
        await tx.produto.update({
          where: { id: produtoDb.id },
          data: { estoque: { decrement: item.quantidade } }
        })
      }

      // 4. Atualizar Total da Venda
      return await tx.venda.update({
        where: { id: venda.id },
        data: { total: totalVenda },
        include: { itens: true }
      })
    })
    return reply.status(201).send(resultado)
  } catch (erro: any) {
    return reply.status(400).send({ erro: erro.message })
  }
})

// Histórico de Vendas (NOVO)
app.get('/vendas', async () => {
  // Pega as últimas 50 vendas, da mais recente para a mais antiga
  return await prisma.venda.findMany({
    take: 50,
    orderBy: { data: 'desc' },
    include: { itens: { include: { produto: true } } }
  })
})

const start = async () => {
  try {
    await app.listen({ 
      host: '0.0.0.0', // ISSO É O SEGREDO: Libera o acesso externo para o Render
      port: process.env.PORT ? Number(process.env.PORT) : 3333 // Usa a porta que o Render mandar ou a 3333 se for no seu PC
    })
    console.log('Servidor rodando')
  } catch (err) {
    process.exit(1)
  }
}
start()