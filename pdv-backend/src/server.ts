import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const app = Fastify()
const prisma = new PrismaClient()

app.register(cors, { 
  origin: true, // Permite qualquer origem (Frontend)
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Libera explicitamente o DELETE
  allowedHeaders: ['Content-Type'] // Libera cabeçalhos padrões
})

// Rota de Login (A Portaria)
  app.post('/login', async (request, reply) => {
    // 1. Valida se mandou email e senha
    const loginSchema = z.object({
      email: z.string().email(),
      senha: z.string(),
    })

    const { email, senha } = loginSchema.parse(request.body)

    // 2. Busca o usuário no banco
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return reply.status(400).send({ erro: 'Email ou senha inválidos' })
    }

    // 3. Confere se a senha bate (descriptografa e compara)
    const senhaBate = await compare(senha, user.senha)

    if (!senhaBate) {
      return reply.status(400).send({ erro: 'Email ou senha inválidos' })
    }

    // 4. Gera o Crachá (Token)
    const token = jwt.sign(
      { id: user.id, cargo: user.cargo }, // O que vai escrito no crachá
      process.env.JWT_SECRET || 'segredo', // O carimbo de segurança
      { expiresIn: '30d' } // Validade de 30 dias
    )

    // 5. Devolve os dados para o Frontend
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
      token: token,
    }
  })

// --- ROTAS DE PRODUTOS ---

// Listar
app.get('/produtos', async () => {
  return await prisma.produto.findMany({ orderBy: { nome: 'asc' } })
})

// CADASTRAR PRODUTO (Versão Completa)
app.post('/produtos', async (request, reply) => {
  const dados = request.body as any

  try {
    const produto = await prisma.produto.create({
      data: {
        // --- Campos Básicos ---
        nome: dados.nome,
        codigoBarra: dados.codigoBarra,
        precoCusto: dados.precoCusto,
        precoVenda: dados.precoVenda,
        estoque: dados.estoque,
        unidade: dados.unidade,
        categoria: dados.categoria,

        // --- Campos Extras (Fornecedor/Logística) ---
        fornecedor: dados.fornecedor,
        localizacao: dados.localizacao,
        frete: dados.frete,

        // --- Impostos ---
        ipi: dados.ipi,
        icms: dados.icms,

        // --- Campos Fiscais (NCM/CFOP) ---
        ncm: dados.ncm,
        cest: dados.cest,
        cfop: dados.cfop
      }
    })
    return reply.status(201).send(produto)

  } catch (error) {
    console.error(error)
    return reply.status(500).send({ error: "Erro ao criar produto" })
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

// NOVA VENDA (ATUALIZADA COM HAVER)
app.post('/vendas', async (request, reply) => {
  const dados = request.body as any 

  let totalVenda = 0
  const itensParaSalvar = []

  // 1. Calcular total e verificar estoque
  for (const item of dados.itens) {
    const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } })
    if (!produto) return reply.status(400).send({ erro: "Produto não existe" })
    if (Number(produto.estoque) < item.quantidade) return reply.status(400).send({ erro: `Sem estoque para ${produto.nome}` })

    totalVenda += Number(produto.precoVenda) * item.quantidade
    itensParaSalvar.push({ produtoId: item.produtoId, quantidade: item.quantidade, precoUnit: produto.precoVenda })
  }

  // --- LÓGICA DO HAVER (NOVO) ---
  if (dados.formaPagamento === 'HAVER') {
    if (!dados.clienteId) return reply.status(400).send({ erro: "Precisa identificar o cliente para usar Haver!" })
    
    const cliente = await prisma.cliente.findUnique({ where: { id: Number(dados.clienteId) } })
    
    if (!cliente || Number(cliente.saldoHaver) < totalVenda) {
      return reply.status(400).send({ erro: "Saldo de Haver insuficiente!" })
    }

    // Desconta do saldo do cliente
    await prisma.cliente.update({
      where: { id: Number(dados.clienteId) },
      data: { saldoHaver: { decrement: totalVenda } }
    })
  }
  // ------------------------------

  // 2. Criar a Venda
  const venda = await prisma.venda.create({
    data: {
      total: totalVenda,
      clienteId: dados.clienteId ? Number(dados.clienteId) : null,
      formaPagamento: dados.formaPagamento,
      itens: { create: itensParaSalvar }
    }
  })

  // 3. Se for FIADO (A PRAZO)
  if (dados.formaPagamento === 'A PRAZO' && dados.clienteId) {
    await prisma.contaReceber.create({
      data: { valor: totalVenda, clienteId: Number(dados.clienteId), vendaId: venda.id, status: 'PENDENTE' }
    })
  }

  // 4. Baixar Estoque
  for (const item of itensParaSalvar) {
    await prisma.produto.update({ where: { id: item.produtoId }, data: { estoque: { decrement: item.quantidade } } })
  }

  return reply.status(201).send(venda)
})

// LISTAR VENDAS (Agora traz o cliente junto)
app.get('/vendas', async () => {
  return await prisma.venda.findMany({
    include: { 
      itens: { include: { produto: true } },
      cliente: true // <--- Traz os dados do cliente
    },
    orderBy: { id: 'desc' }
  })
})

// --- ROTAS DE CLIENTES ---

// 1. Listar todos os clientes
app.get('/clientes', async () => {
  return await prisma.cliente.findMany({
    orderBy: { nome: 'asc' } // Já traz em ordem alfabética
  })
})

// 2. Cadastrar novo cliente
app.post('/clientes', async (request, reply) => {
  const dados = request.body as any
  
  try {
    const novoCliente = await prisma.cliente.create({
      data: {
        nome: dados.nome,
        cpfCnpj: dados.cpfCnpj,
        celular: dados.celular,
        endereco: dados.endereco
      }
    })
    return reply.status(201).send(novoCliente)
  } catch (erro) {
    return reply.status(500).send({ erro: "Erro ao criar cliente" })
  }
})

// 3. Excluir cliente
app.delete('/clientes/:id', async (request, reply) => {
  const { id } = request.params as any
  
  try {
    await prisma.cliente.delete({
      where: { id: Number(id) }
    })
    return reply.send({ message: "Cliente deletado com sucesso" })
  } catch (erro) {
    return reply.status(500).send({ erro: "Não foi possível deletar" })
  }
})

// --- ATUALIZAR CLIENTE (PUT) ---
app.put('/clientes/:id', async (request, reply) => {
  const { id } = request.params as any
  const dados = request.body as any
  
  try {
    const clienteAtualizado = await prisma.cliente.update({
      where: { id: Number(id) },
      data: {
        nome: dados.nome,
        cpfCnpj: dados.cpfCnpj,
        celular: dados.celular,
        endereco: dados.endereco
      }
    })
    return reply.send(clienteAtualizado)
  } catch (erro) {
    return reply.status(500).send({ erro: "Erro ao atualizar cliente" })
  }
})

// --- HISTÓRICO DE COMPRAS DO CLIENTE ---
app.get('/clientes/:id/vendas', async (request, reply) => {
  const { id } = request.params as any
  
  const vendas = await prisma.venda.findMany({
    where: { clienteId: Number(id) },
    include: { 
      itens: { include: { produto: true } } 
    },
    orderBy: { data: 'desc' }
  })
  return reply.send(vendas)
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

// --- FINANCEIRO: LISTAR DÍVIDAS ---
app.get('/contas-receber', async () => {
  return await prisma.contaReceber.findMany({
    where: { status: 'PENDENTE' }, // Só traz quem deve
    include: { cliente: true, venda: true },
    orderBy: { data: 'asc' } // As mais antigas primeiro
  })
})

// --- FINANCEIRO: RECEBER (BAIXAR CONTA) ---
app.put('/contas-receber/:id/pagar', async (request, reply) => {
  const { id } = request.params as any
  
  await prisma.contaReceber.update({
    where: { id: Number(id) },
    data: { status: 'PAGO' }
  })
  
  return reply.send({ message: "Conta recebida com sucesso!" })
})

// --- HAVER: ADICIONAR CRÉDITO (DEVOLUÇÃO) ---
app.post('/clientes/:id/haver', async (request, reply) => {
  const { id } = request.params as any
  const { valor } = request.body as any // Valor para somar

  const cliente = await prisma.cliente.update({
    where: { id: Number(id) },
    data: { saldoHaver: { increment: Number(valor) } }
  })

  return reply.send(cliente)
})