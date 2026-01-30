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

// --- VENDAS ---
app.post('/vendas', async (request, reply) => {
  const dados = request.body as any;
  let totalVenda = 0;
  const itensParaSalvar = [];

  // 1. Processar itens e calcular total
  for (const item of dados.itens) {
    const produto = await prisma.produto.findUnique({ where: { id: item.produtoId } });
    if (!produto) return reply.status(400).send({ erro: "Produto não existe" });
    if (produto.estoque < item.quantidade) return reply.status(400).send({ erro: `Sem estoque para ${produto.nome}` });

    totalVenda += Number(produto.precoVenda) * item.quantidade;
    itensParaSalvar.push({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnit: produto.precoVenda
    });
  }

  // 2. Validar pagamentos
  const totalPagamentos = dados.pagamentos.reduce((acc: number, p: any) => acc + Number(p.valor), 0);
  if (Math.abs(totalVenda - totalPagamentos) > 0.05) {
    return reply.status(400).send({ erro: "Pagamento incorreto!" });
  }

  // 3. Processar Pagamentos Especiais (Haver)
  for (const pgto of dados.pagamentos) {
    if (pgto.forma === 'HAVER') {
      await prisma.cliente.update({
        where: { id: Number(dados.clienteId) },
        data: { saldoHaver: { decrement: Number(pgto.valor) } }
      })
    }
  }

  // 4. Salvar a Venda
  const venda = await prisma.venda.create({
    data: {
      total: totalVenda,
      clienteId: dados.clienteId ? Number(dados.clienteId) : null,
      itens: { create: itensParaSalvar },
      pagamentos: { create: dados.pagamentos }
    },
    include: { // <--- ADICIONE ESTE BLOCO
      itens: { include: { produto: true } },
      cliente: true,
      pagamentos: true
    }
    
  });

  // 5. Gerar Dívida (A PRAZO)
  const pagtoPrazo = dados.pagamentos.find((p: any) => p.forma === 'A PRAZO')
  if (pagtoPrazo && dados.clienteId) {
    await prisma.contaReceber.create({
      data: { valor: pagtoPrazo.valor, clienteId: Number(dados.clienteId), vendaId: venda.id, status: 'PENDENTE' }
    })
  }

  // 6. Baixar Estoque
  for (const item of itensParaSalvar) {
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