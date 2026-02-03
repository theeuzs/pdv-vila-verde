import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

const app = Fastify()
const prisma = new PrismaClient()

// Configuração do CORS (O porteiro)
app.register(cors, { 
  origin: true, // Aceita requisições de qualquer lugar (ou coloque o link do seu front)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] // <--- O SEGREDO ESTÁ AQUI (Adicionamos o PATCH)
});

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
      entrega: dados.entrega || false,
      enderecoEntrega: dados.enderecoEntrega || '',
      statusEntrega: dados.entrega ? 'PENDENTE' : 'RETIRADO',
      itens: { create: itensParaSalvar as any },
      pagamentos: { create: dados.pagamentos }
    },
    include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }
  })

  // 5. FINANCEIRO: SEPARA O QUE É CAIXA E O QUE É FIADO
  // 5. FINANCEIRO E SALDOS (Versão Corrigida)
    for (const pag of dados.pagamentos) {
      const valor = Number(pag.valor);
console.log("💳 Processando pagamento:", pag.forma);
        console.log("💰 Valor:", pag.valor);
        console.log("👤 Cliente ID:", dados.clienteId);
      // --- PARTE A: REGISTRO FINANCEIRO (Dinheiro ou Dívida?) ---
      
      if (pag.forma === 'A PRAZO') {
        // 1. Se for Fiado, cria a conta a receber
        await prisma.contaReceber.create({
          data: {
            descricao: `Venda #${venda.id} - A Prazo`,
            valor: valor,
            clienteId: Number(dados.clienteId),
            vendaId: venda.id,
            dataVencimento: new Date(new Date().setDate(new Date().getDate() + 30)),
            status: 'PENDENTE'
          }
        });
      } 
      // 2. Se NÃO for Fiado e NEM Crédito/Haver, então é Dinheiro/Pix entrando no caixa
      else if (pag.forma !== 'Crédito' && pag.forma !== 'Haver' && pag.forma !== 'Crédito em Haver') {
        await prisma.movimentacaoCaixa.create({
          data: {
            caixaId: caixaAberto.id,
            tipo: 'VENDA',
            valor: valor,
            descricao: `Venda #${venda.id} (${pag.forma})`
          }
        });
      }

      // --- PARTE B: ATUALIZA A FICHA DO CLIENTE ---
      
      if (dados.clienteId) {
        
        // CASO 1: CLIENTE COMPROU NO FIADO (Aumenta a Dívida)
        // Adicionei variações comuns de nome
        if (['A PRAZO', 'Fiado', 'Crediario', 'A Prazo'].includes(pag.forma)) {
          console.log("Simulando: Aumentando Dívida..."); // Log para confirmar
          await prisma.cliente.update({
            where: { id: Number(dados.clienteId) },
            data: { saldoDevedor: { increment: Number(pag.valor) } } 
          });
        }

        // CASO 2: CLIENTE PAGOU USANDO CRÉDITO/HAVER (Diminui o Haver)
        // ATENÇÃO: Verifique se o nome que aparece no seu Terminal está nesta lista abaixo!
        if (['Haver', 'HAVER', 'Crédito', 'CREDITO', 'Saldo', 'Uso de Haver'].includes(pag.forma)) {
          
          console.log("Simulando: Baixando Haver..."); 
          await prisma.cliente.update({
            where: { id: Number(dados.clienteId) },
            data: { saldoHaver: { decrement: Number(pag.valor) } } 
          });
        }
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

// CANCELAR VENDA (COM ESTORNO DE CAIXA E ESTOQUE CORRIGIDO)
// CANCELAR VENDA (VERSÃO CORRIGIDA E LIMPA)
app.delete('/vendas/:id', async (req, res) => {
  const { id } = req.params as any;

  try {
    // 1. Busca a venda para saber quais produtos devolver
    const venda = await prisma.venda.findUnique({
      where: { id: Number(id) }, // Se der erro, use String(id)
      include: { itens: true }
    });

    if (!venda) return res.status(404).send({ error: "Venda não encontrada" });

    // 2. Devolve os produtos para o estoque (CORRIGIDO O ERRO DECIMAL)
    for (const item of venda.itens) {
      await prisma.produto.update({
        where: { id: item.produtoId },
        data: { 
          estoque: { increment: Number(item.quantidade) } // Adicionei o Number() aqui!
        }
      });
    }

    // 3. Apaga a venda e tudo relacionado a ela
    // (O saldo do caixa vai baixar automaticamente porque essa venda sumirá da soma)
    const deleteItens = prisma.itemVenda.deleteMany({ where: { vendaId: Number(id) } });
    const deletePags = prisma.pagamento.deleteMany({ where: { vendaId: Number(id) } });
    const deleteVenda = prisma.venda.delete({ where: { id: Number(id) } });

    await prisma.$transaction([deleteItens, deletePags, deleteVenda]);

    return res.send({ ok: true });

  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Erro ao cancelar venda" });
  }
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

// --- DAR BAIXA EM CONTA (RECEBER FIADO) ---
app.post('/contas-receber/baixar/:id', async (request, reply) => {
  const { id } = request.params as any;

  // 1. O CAIXA ESTÁ ABERTO?
  const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });
  if (!caixaAberto) {
    return reply.status(400).send({ erro: "Abra o caixa antes de receber pagamentos!" });
  }

  // 2. BUSCA A CONTA
  const conta = await prisma.contaReceber.findUnique({ where: { id: Number(id) } });
  if (!conta) return reply.status(404).send({ erro: "Conta não encontrada" });
  if (conta.status === 'PAGO') return reply.status(400).send({ erro: "Esta conta já foi paga!" });

  // 3. REGISTRA A ENTRADA NO CAIXA (O PULO DO GATO 🐱)
  await prisma.movimentacaoCaixa.create({
    data: {
      caixaId: caixaAberto.id,
      tipo: 'RECEBIMENTO_FIADO', // Um tipo novo para você saber de onde veio o dinheiro
      valor: conta.valor,
      descricao: `Recebimento Fiado #${conta.id}`
    }
  });

  // 4. ATUALIZA O STATUS DA CONTA
  const contaAtualizada = await prisma.contaReceber.update({
    where: { id: Number(id) },
    data: { status: 'PAGO' }
  });

  return reply.send(contaAtualizada);
});

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
    include: { movimentacoes: true }, // <--- O SEGREDO: Traz os movimentos para somar
    orderBy: { id: 'desc' }
  })
  
  if (!caixaAberto) return { status: 'FECHADO' }

  // CALCULA O SALDO ATUAL (Soma tudo que entrou e tira o que saiu)
  const saldoAtual = caixaAberto.movimentacoes.reduce((acc, mov) => {
    if (mov.tipo === 'SANGRIA') return acc - Number(mov.valor)
    return acc + Number(mov.valor) // SOMA (Abertura, Venda, Suprimento, Recebimento)
  }, 0)

  // Retorna os dados do caixa + o saldo calculado na hora
  return { ...caixaAberto, saldoAtual } 
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

// --- FECHAR O CAIXA ---
app.post('/caixa/fechar', async (request, reply) => {
  // 1. Procura se tem um caixa aberto
  const caixaAberto = await prisma.caixa.findFirst({
    where: { status: 'ABERTO' }
  });

  if (!caixaAberto) {
    return reply.status(400).send({ erro: "Não existe nenhum caixa aberto para fechar." });
  }

  // 2. Fecha o caixa (registra a hora do fechamento)
  const caixaFechado = await prisma.caixa.update({
    where: { id: caixaAberto.id },
    data: { 
      status: 'FECHADO',
      dataFechamento: new Date() // Salva a hora exata que você clicou no botão
    }
  });

  return reply.send(caixaFechado);
});

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

// --- ROTA DO DASHBOARD (ESTATÍSTICAS) ---
app.get('/dashboard', async () => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Zera a hora para pegar desde o início do dia
  
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  // Busca todas as vendas do mês atual
  const vendas = await prisma.venda.findMany({
    where: { data: { gte: inicioMes } },
    include: { pagamentos: true, itens: { include: { produto: true } } }
  });

  // Variáveis para somar
  let totalHoje = 0;
  let totalMes = 0;
  const porPagamento: any = {};
  const topProdutos: any = {};

  vendas.forEach(venda => {
    const valor = Number(venda.total);
    const dataVenda = new Date(venda.data);

    // Soma Total do Mês
    totalMes += valor;

    // Soma Total de Hoje
    if (dataVenda >= hoje) {
      totalHoje += valor;
    }

    // Soma por Forma de Pagamento (PIX, DINHEIRO, ETC)
    venda.pagamentos.forEach(p => {
      const forma = p.forma || 'OUTROS';
      porPagamento[forma] = (porPagamento[forma] || 0) + Number(p.valor);
    });

    // Contagem de Produtos Mais Vendidos
    venda.itens.forEach(item => {
      const nome = item.produto?.nome || 'Item Excluído';
      topProdutos[nome] = (topProdutos[nome] || 0) + Number(item.quantidade);
    });
  });

  // Organiza o TOP 5 Produtos
  const listaProdutos = Object.entries(topProdutos)
    .sort((a: any, b: any) => b[1] - a[1]) // Ordena do maior para o menor
    .slice(0, 5) // Pega só os 5 primeiros
    .map(([nome, qtd]) => ({ nome, qtd }));

  return {
    totalHoje,
    totalMes,
    porPagamento,
    topProdutos: listaProdutos
  };
});

// --- ROTAS DE ENTREGA ---

// 1. Listar entregas pendentes
app.get('/entregas/pendentes', async () => {
  const entregas = await prisma.venda.findMany({
    where: { 
      entrega: true,
      statusEntrega: 'PENDENTE' 
    },
    include: { cliente: true, itens: { include: { produto: true } } },
    orderBy: { data: 'asc' } // As mais antigas aparecem primeiro
  });
  return entregas;
});

// 2. Marcar como entregue
app.patch('/entregas/:id/concluir', async (request) => {
  const { id } = request.params as any;
  
  const vendaAtualizada = await prisma.venda.update({
    where: { id: Number(id) },
    data: { statusEntrega: 'ENTREGUE' }
  });
  
  return vendaAtualizada;
});

// --- ROTA DE LOGIN (CORRIGIDA) ---
app.post('/login', async (req, res) => {
  // 1. Usamos 'as any' para o TypeScript parar de reclamar que não conhece o body
  const { nome, senha, cargo } = req.body as any;

  try {
    const usuario = await prisma.user.findFirst({
      where: { 
        nome: nome,
        cargo: cargo 
      }
    });

    if (usuario && usuario.senha === senha) {
      // 2. Trocamos .json() por .send() (O Fastify prefere assim)
      return res.send(usuario);
    } else {
      return res.status(401).send({ error: "Usuário ou senha incorretos." });
    }
  } catch (error) {
    return res.status(500).send({ error: "Erro ao tentar fazer login." });
  }
});

// --- ROTA DE RESET BLINDADA (Apaga pelo EMAIL) ---
app.get('/resetar-chefe', async (req, res) => {
  try {
    // 1. Apaga QUALQUER usuário que esteja usando esse e-mail
    await prisma.user.deleteMany({
      where: { 
        email: "admin@vilaverde.com" 
      }
    });

    // 2. Apaga também pelo nome para garantir (faxina completa)
    await prisma.user.deleteMany({
      where: { 
        nome: "Matheus" 
      }
    });

    // 3. Agora cria o chefe novinho
    await prisma.user.create({
      data: {
        nome: "Matheus",
        senha: "admin",
        cargo: "GERENTE",
        email: "admin@vilaverde.com"
      }
    });
    
    return res.send("♻️ SUCESSO! O usuário antigo foi removido e o novo foi criado. Pode logar!");
  } catch (error: any) {
    return res.send("Erro fatal: " + error.message);
  }
});

// --- GESTÃO DE EQUIPE (Só o Gerente usa) ---

// 1. Listar funcionários
app.get('/usuarios', async (req, res) => {
  const usuarios = await prisma.user.findMany({
    orderBy: { nome: 'asc' }
  });
  return res.send(usuarios);
});

// 2. Criar novo funcionário
app.post('/usuarios', async (req, res) => {
  const { nome, senha, cargo } = req.body as any;
  // Cria um email falso automático pro banco não reclamar
  const emailAuto = `${nome.toLowerCase().replace(/\s/g, '')}${Math.floor(Math.random()*999)}@vila.com`;

  try {
    const novo = await prisma.user.create({
      data: { nome, senha, cargo, email: emailAuto }
    });
    return res.send(novo);
  } catch (err) {
    return res.status(500).send({ error: "Erro ao criar. Tente outro nome." });
  }
});

// 3. Demitir funcionário
app.delete('/usuarios/:id', async (req, res) => {
  const { id } = req.params as any;
await prisma.user.delete({ where: { id: String(id) } });  return res.send({ ok: true });
});

// 4. Alterar senha do funcionário (Para o gerente resetar)
app.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params as any;
  const { senha } = req.body as any;
  
  try {
    await prisma.user.update({
      where: { id: String(id) }, // Se der erro, use String(id) se mudou antes
      data: { senha }
    });
    return res.send({ ok: true });
  } catch (error) {
    return res.status(500).send({ error: "Erro ao atualizar senha." });
  }
});

// Rota para verificar se uma senha pertence a ALGUM gerente
app.post('/verificar-gerente', async (req, res) => {
  const { senha } = req.body as any;
  
  // Procura no banco se existe algum usuário que seja GERENTE e tenha essa senha
  const gerente = await prisma.user.findFirst({
    where: { 
      cargo: 'GERENTE',
      senha: senha 
    }
  });

  if (gerente) {
    return res.send({ autorizado: true, nome: gerente.nome });
  } else {
    return res.status(401).send({ error: "Senha de gerente incorreta!" });
  }
});

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