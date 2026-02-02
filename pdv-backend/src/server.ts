import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const app = Fastify()
const prisma = new PrismaClient()

app.register(cors, { 
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  allowedHeaders: ['Content-Type'] 
})

// --- AUTENTICAÇÃO ---
app.post('/login', async (request, reply) => {
    const loginSchema = z.object({
      email: z.string().email(),
      senha: z.string(),
    })

    const { email, senha } = loginSchema.parse(request.body)

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return reply.status(400).send({ erro: 'Email ou senha inválidos' })
    }

    const senhaBate = await compare(senha, user.senha)

    if (!senhaBate) {
      return reply.status(400).send({ erro: 'Email ou senha inválidos' })
    }

    const token = jwt.sign(
      { id: user.id, cargo: user.cargo }, 
      process.env.JWT_SECRET || 'segredo', 
      { expiresIn: '30d' } 
    )

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
      token: token,
    }
})

// --- PRODUTOS ---
app.get('/produtos', async () => {
  return await prisma.produto.findMany({ orderBy: { nome: 'asc' } })
})

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
        categoria: dados.categoria,
        fornecedor: dados.fornecedor,
        localizacao: dados.localizacao,
        frete: dados.frete,
        ipi: dados.ipi,
        icms: dados.icms,
        ncm: dados.ncm,
        cest: dados.cest,
        cfop: dados.cfop
      }
    })
    return reply.status(201).send(produto)
  } catch (error) {
    return reply.status(500).send({ error: "Erro ao criar produto" })
  }
})

app.delete('/produtos/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  try {
    await prisma.produto.delete({ where: { id: Number(id) } })
    return reply.status(204).send()
  } catch (erro) {
    return reply.status(400).send({ erro: "Não é possível excluir um produto com vendas registradas." })
  }
})

// --- ATUALIZAR PRODUTO (PUT) ---
app.put('/produtos/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  const dados = request.body as any

  try {
    const produtoAtualizado = await prisma.produto.update({
      where: { id: Number(id) },
      data: {
        // Atualiza todos os campos que vierem do formulário
        nome: dados.nome,
        codigoBarra: dados.codigoBarra,
        precoCusto: dados.precoCusto,
        precoVenda: dados.precoVenda,
        estoque: dados.estoque,
        unidade: dados.unidade,
        categoria: dados.categoria,

        // Campos Fiscais/Extras
        fornecedor: dados.fornecedor,
        localizacao: dados.localizacao,
        frete: dados.frete,
        ipi: dados.ipi,
        icms: dados.icms,
        ncm: dados.ncm,
        cest: dados.cest,
        cfop: dados.cfop
      }
    })
    return reply.send(produtoAtualizado)
  } catch (error) {
    console.error(error)
    return reply.status(500).send({ error: "Erro ao atualizar produto no banco." })
  }
})

// --- ROTA DE VENDAS COMPLETA (CAIXA + ESTOQUE + FIADO) ---
app.post('/vendas', async (request, reply) => {
  const dados = request.body as any

  // 1. VERIFICA SE O CAIXA ESTÁ ABERTO
  const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } })
  if (!caixaAberto) {
    return reply.status(400).send({ erro: "O Caixa está FECHADO. Abra o caixa antes de vender!" })
  }

  // 2. VERIFICA SE TEM CLIENTE PARA VENDA A PRAZO
  const temFiado = dados.pagamentos.some((p: any) => p.forma === 'A PRAZO')
  if (temFiado && !dados.clienteId) {
    return reply.status(400).send({ erro: "Para vender A PRAZO, é obrigatório selecionar um Cliente!" })
  }

  // 3. VALIDA ESTOQUE E CALCULA TOTAL
  let totalVenda = 0
  const itensParaSalvar = []

  for (const item of dados.itens) {
    const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } })
    if (!produto) return reply.status(400).send({ erro: "Produto não encontrado" })
    if (produto.estoque < item.quantidade) return reply.status(400).send({ erro: `Estoque insuficiente: ${produto.nome}` })
    
    totalVenda += Number(produto.precoVenda) * item.quantidade
    itensParaSalvar.push({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnit: produto.precoVenda // Ajustado para o nome curto que seu banco aceitou
    })
  }

  // 4. SALVA A VENDA NO BANCO
  const venda = await prisma.venda.create({
    data: {
      total: totalVenda,
      clienteId: dados.clienteId ? Number(dados.clienteId) : null,
      itens: { create: itensParaSalvar as any },
      pagamentos: { create: dados.pagamentos }
    },
    include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }
  })

  // 5. FINANCEIRO: SEPARA O QUE É CAIXA E O QUE É FIADO
  for (const pag of dados.pagamentos) {
    const valor = Number(pag.valor)

    if (pag.forma === 'A PRAZO') {
      // --- LÓGICA DO FIADO (CRIA CONTA A RECEBER) ---
      await prisma.contaReceber.create({
        data: {
          descricao: `Venda #${venda.id} - A Prazo`,
          valor: valor,
          clienteId: Number(dados.clienteId),
          vendaId: venda.id,
          dataVencimento: new Date(new Date().setDate(new Date().getDate() + 30)), // Vence em 30 dias
          status: 'PENDENTE'
        }
      })
    } else {
      // --- LÓGICA DO CAIXA (DINHEIRO/PIX/CARTÃO) ---
      await prisma.movimentacaoCaixa.create({
        data: {
          caixaId: caixaAberto.id,
          tipo: 'VENDA',
          valor: valor,
          descricao: `Venda #${venda.id} (${pag.forma})`
        }
      })
    }
  }

  // 6. BAIXA NO ESTOQUE
  for (const item of dados.itens) {
    await prisma.produto.update({
      where: { id: item.produtoId },
      data: { estoque: { decrement: item.quantidade } }
    })
  }

  return reply.status(201).send(venda)
})

app.get('/vendas', async () => {
  return await prisma.venda.findMany({
    include: { 
      itens: { include: { produto: true } }, 
      cliente: true,
      pagamentos: true 
    },
    orderBy: { data: 'desc' }
  })
})

app.delete('/vendas/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const vendaId = Number(id);

  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true }
  });

  if (!venda) return reply.status(404).send({ error: "Venda não encontrada" });

  for (const item of venda.itens) {
    await prisma.produto.update({
      where: { id: item.produtoId },
      data: { estoque: { increment: Number(item.quantidade) } }
    });
  }

  await prisma.itemVenda.deleteMany({ where: { vendaId } });
  await prisma.pagamento.deleteMany({ where: { vendaId } });
  await prisma.contaReceber.deleteMany({ where: { vendaId } });
  await prisma.venda.delete({ where: { id: vendaId } });

  return { message: "Venda cancelada e estoque devolvido!" };
});

// --- CLIENTES ---
app.get('/clientes', async () => {
  return await prisma.cliente.findMany({ orderBy: { nome: 'asc' } })
})

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

// --- HISTÓRICO DE COMPRAS DO CLIENTE ---
app.get('/clientes/:id/vendas', async (request, reply) => {
  const { id } = request.params as any
  
  const vendas = await prisma.venda.findMany({
    where: { clienteId: Number(id) },
    include: { 
      itens: { include: { produto: true } },
      pagamentos: true // <--- O SEGREDO PARA NÃO DAR TELA BRANCA
    },
    orderBy: { data: 'desc' }
  })
  return reply.send(vendas)
})

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

app.delete('/clientes/:id', async (request, reply) => {
  const { id } = request.params as any
  try {
    await prisma.cliente.delete({ where: { id: Number(id) } })
    return reply.send({ message: "Cliente deletado" })
  } catch (erro) {
    return reply.status(500).send({ erro: "Não foi possível deletar" })
  }
})

// --- ORÇAMENTOS ---
app.post('/orcamentos', async (request, reply) => {
  const dados = request.body as any
  let total = 0
  const itensParaSalvar = []

  for (const item of dados.itens) {
    const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } })
    if (!produto) return reply.status(400).send({ erro: "Produto não existe" })
    
    total += Number(produto.precoVenda) * item.quantidade
    itensParaSalvar.push({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnit: Number(produto.precoVenda)
    })
  }

  const orcamento = await prisma.orcamento.create({
    data: {
      total: total,
      clienteId: dados.clienteId ? Number(dados.clienteId) : null,
      itens: { create: itensParaSalvar }
    }
  })
  return reply.status(201).send(orcamento)
})

app.get('/orcamentos', async () => {
  return await prisma.orcamento.findMany({
    include: { itens: { include: { produto: true } }, cliente: true },
    orderBy: { data: 'desc' }
  })
})

app.delete('/orcamentos/:id', async (request, reply) => {
  const { id } = request.params as any
  await prisma.orcamento.delete({ where: { id: Number(id) } })
  return reply.send({ message: "Orçamento excluído" })
})

// --- FINANCEIRO ---
app.get('/contas-receber', async () => {
  return await prisma.contaReceber.findMany({
    where: { status: 'PENDENTE' },
    include: { cliente: true, venda: true },
    orderBy: { data: 'asc' }
  })
})

app.put('/contas-receber/:id/pagar', async (request, reply) => {
  const { id } = request.params as any
  await prisma.contaReceber.update({
    where: { id: Number(id) },
    data: { status: 'PAGO' }
  })
  return reply.send({ message: "Conta recebida!" })
})

app.post('/clientes/:id/haver', async (request, reply) => {
  const { id } = request.params as any
  const { valor } = request.body as any
  const cliente = await prisma.cliente.update({
    where: { id: Number(id) },
    data: { saldoHaver: { increment: Number(valor) } }
  })
  return reply.send(cliente)
})

// --- ROTAS DE CONTROLE DE CAIXA ---

// 1. VERIFICAR STATUS DO CAIXA (O Frontend vai perguntar isso toda hora)
app.get('/caixa/status', async () => {
  const caixaAberto = await prisma.caixa.findFirst({
    where: { status: 'ABERTO' },
    orderBy: { id: 'desc' } // Pega o último aberto
  })
  return caixaAberto || { status: 'FECHADO' }
})

// 2. ABRIR CAIXA
app.post('/caixa/abrir', async (req, reply) => {
  const { saldoInicial, observacoes } = req.body as any

  // Verifica se já tem um aberto pra não dar confusão
  const jaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } })
  if (jaAberto) return reply.status(400).send({ erro: "Já existe um caixa aberto!" })

  const novoCaixa = await prisma.caixa.create({
    data: {
      saldoInicial: Number(saldoInicial),
      status: 'ABERTO',
      observacoes: observacoes
    }
  })
  
  // Registra o saldo inicial como uma movimentação também
  await prisma.movimentacaoCaixa.create({
    data: {
      caixaId: novoCaixa.id,
      tipo: 'ABERTURA',
      valor: Number(saldoInicial),
      descricao: 'Saldo Inicial de Abertura'
    }
  })

  return reply.send(novoCaixa)
})

// 3. SANGRIA (Retirada) ou SUPRIMENTO (Entrada extra)
app.post('/caixa/movimentar', async (req, reply) => {
  const { tipo, valor, descricao } = req.body as any // tipo: "SANGRIA" ou "SUPRIMENTO"

  const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } })
  if (!caixaAberto) return reply.status(400).send({ erro: "Nenhum caixa aberto!" })

  const movimento = await prisma.movimentacaoCaixa.create({
    data: {
      caixaId: caixaAberto.id,
      tipo: tipo,
      valor: Number(valor),
      descricao: descricao
    }
  })
  return reply.send(movimento)
})

// 4. FECHAR CAIXA
app.post('/caixa/fechar', async (req, reply) => {
  const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } })
  if (!caixaAberto) return reply.status(400).send({ erro: "Nenhum caixa para fechar!" })

  // Calcula quanto entrou e saiu
  const movimentos = await prisma.movimentacaoCaixa.findMany({ where: { caixaId: caixaAberto.id } })
  
  let saldoCalculado = Number(caixaAberto.saldoInicial)
  for (const mov of movimentos) {
    if (mov.tipo === 'VENDA' || mov.tipo === 'SUPRIMENTO') saldoCalculado += Number(mov.valor)
    if (mov.tipo === 'SANGRIA') saldoCalculado -= Number(mov.valor)
  }

  const caixaFechado = await prisma.caixa.update({
    where: { id: caixaAberto.id },
    data: {
      status: 'FECHADO',
      dataFechamento: new Date(),
      saldoFinal: saldoCalculado // O sistema diz quanto tem que ter
    }
  })

  return reply.send(caixaFechado)
})

// --- INICIALIZAÇÃO ---
const start = async () => {
  try {
    await app.listen({ 
      host: '0.0.0.0', 
      port: process.env.PORT ? Number(process.env.PORT) : 3333 
    })
    console.log('Servidor rodando')
  } catch (err) {
    process.exit(1)
  }
}
start()