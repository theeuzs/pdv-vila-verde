import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { hash, compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import axios from 'axios';
import * as dotenv from 'dotenv';

// Isso faz o código ler o arquivo .env
dotenv.config();

const app = Fastify()
const prisma = new PrismaClient()

// Rota de LOGIN 🔐
app.post('/login', async (request: any, reply: any) => {
  const { username, senha } = request.body;

  try {
    console.log(`🔐 Tentativa de login para: ${username}`);

    // 1. Busca na tabela 'user' (minúsculo porque o prisma gera assim)
    const usuario = await prisma.user.findUnique({ 
        where: { username: username } 
    });

    if (!usuario) {
      console.log("❌ Usuário não encontrado no banco.");
      return reply.status(400).send({ erro: "Usuário não encontrado." });
    }

    // 2. Confere a senha
    const senhaBateu = await compare(senha, usuario.senha);

    if (!senhaBateu) {
      console.log("❌ Senha incorreta.");
      return reply.status(401).send({ erro: "Senha incorreta!" });
    }

    console.log("✅ Login realizado com sucesso!");
    
    // 3. Remove a senha antes de enviar
    const { senha: _, ...usuarioSemSenha } = usuario;
    return reply.status(200).send(usuarioSemSenha);

  } catch (error: any) {
    console.error("🔥 ERRO CRÍTICO NO LOGIN:", error);
    // Isso vai mostrar o erro real no log do Render pra gente saber o que foi
    return reply.status(500).send({ erro: "Erro interno no servidor." });
  }
});

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
    // 1. Recebe TODOS os campos, inclusive os fiscais
    const { 
      nome, codigoBarra, precoCusto, precoVenda, estoque, 
      unidade, categoria, fornecedor, localizacao,
      // 👇 Campos Fiscais Novos 👇
      ncm, cest, cfop, csosn, origem, ipi, icms, frete
    } = request.body as any;

    // 2. Cria no banco salvando tudo
    const produto = await prisma.produto.create({
      data: {
        nome,
        codigoBarra,
        precoCusto: Number(precoCusto),
        precoVenda: Number(precoVenda),
        estoque: Number(estoque),
        unidade: unidade || 'UN',
        categoria,
        fornecedor,
        localizacao,
        // 👇 Salvando o fiscal 👇
        ncm: ncm || '',
        cest: cest || '',
        cfop: cfop || '5102',
        csosn: csosn || '102',   // Agora vai salvar o 500 se você mandar!
        origem: origem || '0',
        ipi: Number(ipi || 0),
        icms: Number(icms || 0),
        frete: Number(frete || 0)
      }
    });

    return reply.status(201).send(produto);
  });

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
    const { id } = request.params as { id: string };
    
    // 1. Pega os dados novos
    const { 
      nome, codigoBarra, precoCusto, precoVenda, estoque, 
      unidade, categoria, fornecedor, localizacao,
      ncm, cest, cfop, csosn, origem, ipi, icms, frete
    } = request.body as any;

    // 2. Atualiza no banco
    const produto = await prisma.produto.update({
      where: { id: Number(id) },
      data: {
        nome,
        codigoBarra,
        precoCusto: Number(precoCusto),
        precoVenda: Number(precoVenda),
        estoque: Number(estoque),
        unidade,
        categoria,
        fornecedor,
        localizacao,
        // 👇 Atualizando o fiscal 👇
        ncm,
        cest,
        cfop,
        csosn,      // Aqui é onde a mágica acontece
        origem,
        ipi: Number(ipi || 0),
        icms: Number(icms || 0),
        frete: Number(frete || 0)
      }
    });

    return reply.send(produto);
  });

// ROTA DE NOVA VENDA (CORRIGIDA)
  app.post('/vendas', async (request, reply) => {
    // 1. Pega os dados que vieram do Frontend
    const dados = request.body as any;

    try {
      // 2. SALVA A VENDA NO BANCO
      const venda = await prisma.venda.create({
        data: {
          total: Number(dados.total), // Usa o total que veio da tela
          
          clienteId: dados.clienteId ? Number(dados.clienteId) : null,
          entrega: dados.entrega || false,
          enderecoEntrega: dados.enderecoEntrega || '',
          // REMOVIDO: statusEntrega (causava o erro 500)
          
          // Cria os itens
          itens: { 
            create: dados.itens.map((item: any) => {
              // 🛡️ REDE DE SEGURANÇA: Tenta achar o ID de qualquer jeito
              const idProdutoSeguro = Number(item.produtoId || item.id || item.produto?.id);
              
              // Se mesmo assim for inválido, avisa no console (pra gente saber)
              if (!idProdutoSeguro || isNaN(idProdutoSeguro)) {
                console.error("❌ ERRO GRAVE: Produto sem ID neste item:", item);
                throw new Error(`Produto inválido na venda (ID faltando).`);
              }

              return {
                // Conecta usando o ID seguro que encontramos
                produto: { connect: { id: idProdutoSeguro } },
                
                quantidade: Number(item.quantidade),
                precoUnit: Number(item.precoUnit || item.preco || 0) // Segurança pro preço também
              };
            })
          },
          
          // Cria os pagamentos
          pagamentos: {
            create: dados.pagamentos.map((pag: any) => ({
              forma: pag.forma,
              valor: Number(pag.valor)
            }))
          }
        },
        include: { itens: { include: { produto: true } }, cliente: true, pagamentos: true }
      });

// ... aqui em cima estava o código do prisma.venda.create ...
      // }); <--- Procure onde fecha a venda

      // 👇👇👇 COLE O ESPIÃO AQUI (LOGO DEPOIS DE CRIAR A VENDA) 👇👇👇
      
      console.log("---------------------------------------------------");
      console.log("🕵️ ESPIÃO DO SALDO EM AÇÃO:");
      console.log("👉 ID DO CAIXA QUE CHEGOU:", dados.caixaId);
      console.log("👉 VALOR PARA SOMAR:", dados.total);

      if (dados.caixaId) {
        console.log("⏳ Tentando atualizar o banco de dados agora...");
        
        try {
          await prisma.caixa.update({
            where: { id: Number(dados.caixaId) },
            data: { 
              saldoAtual: { increment: Number(dados.total) } 
            }
          });
          console.log("✅ SUCESSO! O saldo foi atualizado no banco.");
        } catch (err) {
          console.log("❌ ERRO AO ATUALIZAR CAIXA:", err);
        }
      } else {
        console.log("⚠️ ALERTA: O 'caixaId' veio vazio ou nulo! Não vou atualizar nada.");
      }
      
      console.log("---------------------------------------------------");

      // 👆👆👆 FIM DO ESPIÃO 👆👆👆

// ... (código que atualiza o caixa) ...
      // } else {
      //   console.log("⚠️ AVISO: ... ");
      // }

      // 👇👇👇 4. BAIXA DE ESTOQUE (NOVO CÓDIGO) 👇👇👇
      console.log("📦 ATUALIZANDO ESTOQUE DOS PRODUTOS...");
      
      for (const item of dados.itens) {
        // Pega o ID seguro do produto
        const idProd = Number(item.produtoId || item.id || item.produto?.id);
        
        if (idProd) {
          await prisma.produto.update({
            where: { id: idProd },
            data: { 
              estoque: { decrement: Number(item.quantidade) } // Tira a quantidade vendida
            }
          });
        }
      }
      console.log("✅ ESTOQUE ATUALIZADO!");
      // 👆👆👆 FIM DA BAIXA DE ESTOQUE 👆👆👆

      return venda; // <--- O return tem que ficar DEPOIS do espião

      // 3. ATUALIZA O SALDO DO CAIXA (Se tiver caixa aberto)
      if (dados.caixaId) { 
        await prisma.caixa.update({
          where: { id: Number(dados.caixaId) },
          data: { 
            saldoAtual: { increment: Number(dados.total) } 
          }
        });
      }

      // 4. Retorna sucesso
      return venda;

    } catch (error) {
      console.error(error); // Isso mostra o erro real no terminal preto
      return reply.status(500).send({ error: "Erro ao salvar venda" });
    }
  });

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

// CANCELAR VENDA (CORRIGIDO PARA NÚMERO)
 app.delete('/vendas/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const idVenda = Number(id);

    // 1. Busca a venda com seus itens
    const venda = await prisma.venda.findUnique({
      where: { id: idVenda },
      include: { itens: true }
    });

    if (!venda) {
      return reply.status(404).send({ error: "Venda não encontrada" });
    }

    console.log(`🗑️ Iniciando cancelamento da Venda #${idVenda}...`);

    // 2. DEVOLVE OS PRODUTOS PARA O ESTOQUE
    for (const item of venda.itens) {
      await prisma.produto.update({
        where: { id: item.produtoId },
        data: { 
          estoque: { increment: Number(item.quantidade) }
        }
      });
    }

    // 3. TIRA O DINHEIRO DO CAIXA ABERTO (Se houver caixa aberto)
    const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });

    if (caixaAberto) {
      console.log(`💰 Estornando R$ ${venda.total} do caixa #${caixaAberto.id}`);
      await prisma.caixa.update({
        where: { id: caixaAberto.id },
        data: { 
          saldoAtual: { decrement: Number(venda.total) } 
        }
      });
    }

    // 👇👇 AQUI ESTÁ A SOLUÇÃO DO ERRO 500 👇👇
    // 4. LIMPEZA DOS "FILHOS" (Itens e Pagamentos) ANTES DE APAGAR O "PAI"
    try {
        // Tenta apagar os itens associados a essa venda
        await prisma.itemVenda.deleteMany({ where: { vendaId: idVenda } });
        
        // Tenta apagar os pagamentos associados (se existirem)
        // OBS: Se sua tabela chamar 'PagamentoVenda', troque o nome aqui embaixo
        await prisma.pagamento.deleteMany({ where: { vendaId: idVenda } });
        
    } catch (err) {
        console.log("⚠️ Aviso: Erro ao limpar itens/pagamentos (talvez já estejam limpos). Seguindo...");
    }

    // 5. AGORA SIM, PODEMOS APAGAR A VENDA SEM O BANCO RECLAMAR
    await prisma.venda.delete({ where: { id: idVenda } });

    return reply.send({ message: "Venda cancelada e limpa com sucesso!" });
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
    orderBy: { dataCriacao: 'asc' } // ✅ Nome correto da coluna
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

// ============================================================================
// ROTAS DE CAIXA - CORRIGIDAS PARA FASTIFY
// ============================================================================

// Abrir caixa
app.post('/caixa/abrir', async (request: any, reply: any) => {
  try {
    const { saldoInicial, observacoes, usuarioId } = request.body
    
    if (!saldoInicial || saldoInicial < 0) {
      return reply.status(400).send({ erro: 'Saldo inicial inválido' })
    }
    
    if (!usuarioId) {
      return reply.status(400).send({ erro: 'usuarioId é obrigatório' })
    }
    
    // Verifica se já existe caixa aberto para este usuário
    const caixaExistente = await prisma.caixa.findFirst({
      where: { 
        status: 'ABERTO',
        usuarioId: usuarioId
      },
      include: {
        user: {
          select: { id: true, nome: true, cargo: true }
        }
      }
    })
    
    if (caixaExistente) {
      return reply.status(400).send({ 
        erro: 'Já existe um caixa aberto para este usuário',
        caixa: caixaExistente 
      })
    }
    
    // Cria novo caixa
    const novoCaixa = await prisma.caixa.create({
      data: {
        saldoInicial: Number(saldoInicial),
        saldoAtual: Number(saldoInicial),
        status: 'ABERTO',
        observacoes: observacoes || null,
        usuarioId: usuarioId
      },
      include: {
        user: {
          select: { id: true, nome: true, cargo: true }
        }
      }
    })
    
    // Registra movimentação
    await prisma.movimentacaoCaixa.create({
      data: {
        caixaId: novoCaixa.id,
        tipo: 'ABERTURA',
        valor: Number(saldoInicial),
        descricao: observacoes || 'Abertura de caixa'
      }
    })
    
    return reply.send(novoCaixa)
    
  } catch (error) {
    console.error('Erro ao abrir caixa:', error)
    return reply.status(500).send({ erro: 'Erro ao abrir caixa' })
  }
})

// Buscar caixa aberto de um usuário específico
app.get('/caixa/aberto/:usuarioId', async (request: any, reply: any) => {
  try {
    const { usuarioId } = request.params
    
    const caixa = await prisma.caixa.findFirst({
      where: {
        status: 'ABERTO',
        usuarioId: usuarioId
      },
      include: {
        user: {
          select: { id: true, nome: true, cargo: true }
        }
      }
    })
    
    if (!caixa) {
      return reply.status(404).send({ erro: 'Nenhum caixa aberto para este usuário' })
    }
    
    return reply.send(caixa)
    
  } catch (error) {
    console.error('Erro ao buscar caixa:', error)
    return reply.status(500).send({ erro: 'Erro ao buscar caixa' })
  }
})

// Listar todos os caixas abertos
app.get('/caixa/todos', async (request: any, reply: any) => {
  try {
    const caixas = await prisma.caixa.findMany({
      where: { status: 'ABERTO' },
      include: {
        user: {
          select: { id: true, nome: true, cargo: true }
        }
      },
      orderBy: { dataAbertura: 'desc' }
    })
    
    return reply.send(caixas)
    
  } catch (error) {
    console.error('Erro ao listar caixas:', error)
    return reply.status(500).send({ erro: 'Erro ao listar caixas' })
  }
})

// Fechar caixa
app.post('/caixa/fechar', async (request: any, reply: any) => {
  try {
    const { caixaId, observacoes } = request.body
    
    if (!caixaId) {
      return reply.status(400).send({ erro: 'caixaId é obrigatório' })
    }
    
    const caixa = await prisma.caixa.findUnique({
      where: { id: Number(caixaId) }
    })
    
    if (!caixa) {
      return reply.status(404).send({ erro: 'Caixa não encontrado' })
    }
    
    if (caixa.status !== 'ABERTO') {
      return reply.status(400).send({ erro: 'Este caixa já está fechado' })
    }
    
    const caixaFechado = await prisma.caixa.update({
      where: { id: Number(caixaId) },
      data: {
        status: 'FECHADO',
        dataFechamento: new Date(),
        saldoFinal: caixa.saldoAtual,
        observacoes: observacoes || caixa.observacoes
      },
      include: {
        user: {
          select: { id: true, nome: true }
        }
      }
    })
    
    await prisma.movimentacaoCaixa.create({
      data: {
        caixaId: caixaFechado.id,
        tipo: 'FECHAMENTO',
        valor: Number(caixaFechado.saldoFinal || 0),
        descricao: observacoes || 'Fechamento de caixa'
      }
    })
    
    return reply.send(caixaFechado)
    
  } catch (error) {
    console.error('Erro ao fechar caixa:', error)
    return reply.status(500).send({ erro: 'Erro ao fechar caixa' })
  }
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
    username: "matheus",  // <--- O ERRO ERA A FALTA DISSO
    senha: "admin",       // (Obs: ideal seria usar 'await hash("admin", 8)')
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
app.post('/usuarios', async (request: any, reply: any) => {
  // 👇 Pegamos o 'cargo' aqui
  const { nome, username, email, senha, cargo } = request.body;

  try {
    const usuarioExiste = await prisma.user.findFirst({
        where: {
            OR: [ { username: username }, { email: email } ]
        }
    });

    if (usuarioExiste) {
        return reply.status(400).send({ erro: "Usuário ou Email já existe!" });
    }

    const senhaForte = await hash(senha, 8);

    const novoUsuario = await prisma.user.create({
      data: {
        nome,
        username,
        email,
        senha: senhaForte,
        // 👇 Se não mandar nada, vira Vendedor. Se mandar, salva o que veio (ex: MOTORISTA)
        cargo: cargo || 'VENDEDOR' 
      }
    });

    const { senha: _, ...usuarioLimpo } = novoUsuario;
    return reply.status(201).send(usuarioLimpo);

  } catch (error) {
    console.error(error);
    return reply.status(500).send({ erro: "Erro ao cadastrar." });
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

// ROTA DE HISTÓRICO DE CAIXAS 📜
  app.get('/caixas/historico', async () => {
    // Busca os últimos 50 caixas fechados
    return await prisma.caixa.findMany({
      where: { status: 'FECHADO' }, // Só mostra os fechados
      orderBy: { dataAbertura: 'desc' }, // Do mais recente para o antigo
      take: 50
    });
  });

// ROTA PARA EMITIR NOTA FISCAL (NFC-e) - CORRIGIDO
// Rota "RAIO-X" 💀 - Acha o link ou monta o da SEFAZ
app.post('/emitir-fiscal', async (request: any, reply: any) => {
  console.log("🚨 1. ROTA EMISSÃO + SALVAMENTO INICIADA");
  
  // 👇 AGORA PRECISAMOS DO 'vendaId' PARA SABER ONDE SALVAR
  const { itens, total, pagamento, cliente, vendaId } = request.body; 

  try {
    // 1. Validação básica
    if (!vendaId) {
       console.warn("⚠️ ALERTA: Venda ID não informado. A nota será emitida mas não será salva no histórico.");
    }

    // 2. Busca produtos
    const idsProdutos = itens.map((i: any) => Number(i.id || i.produtoId)).filter((id: number) => !isNaN(id));
    const produtosDb = await prisma.produto.findMany({ where: { id: { in: idsProdutos } } });
    
    // 3. Autenticação Nuvem Fiscal
    const credenciais = new URLSearchParams();
    credenciais.append('client_id', process.env.NUVEM_CLIENT_ID!);
    credenciais.append('client_secret', process.env.NUVEM_CLIENT_SECRET!);
    credenciais.append('grant_type', 'client_credentials');
    credenciais.append('scope', 'nfce'); 

    const authResponse = await fetch('https://auth.nuvemfiscal.com.br/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: credenciais
    });
    const authData = await authResponse.json();

    // 4. Montagem do Payload
    const numeroAleatorio = Math.floor(10000000 + Math.random() * 90000000);
    const documentoCliente = (cliente && cliente.cpf_cnpj) ? cliente.cpf_cnpj.replace(/\D/g, '') : '';

    const corpoNota = {
       "ambiente": "homologacao", // ⚠️ Mude para "producao" quando for valer
       "infNFe": {
          "versao": "4.00",
          "ide": {
             "cUF": 41, 
             "cNF": numeroAleatorio,
             "natOp": "VENDA AO CONSUMIDOR",
             "mod": 65,
             "serie": 1,
             "nNF": numeroAleatorio,
             "dhEmi": new Date().toISOString(),
             "tpNF": 1,
             "idDest": 1,
             "cMunFG": 4106902,
             "tpImp": 4, 
             "tpEmis": 1,
             "cDV": 0,
             "tpAmb": 2, 
             "finNFe": 1,
             "indFinal": 1,
             "indPres": 1,
             "procEmi": 0,
             "verProc": "1.0"
          },
          "emit": {
             "CNPJ": "12820608000141",
             "xNome": "MATERIAIS DE CONSTRUCAO VILA VERDE LTDA",
             "enderEmit": {
                "xLgr": "RUA JORNALISTA RUBENS AVILA",
                "nro": "431",
                "xBairro": "CIDADE INDUSTRIAL",
                "cMun": 4106902,
                "xMun": "CURITIBA",
                "UF": "PR",
                "CEP": "81460219",
                "cPais": 1058,
                "xPais": "BRASIL"
             },
             "IE": "9053865574",
             "CRT": 1
          },
          "infRespTec": {
             "CNPJ": "12820608000141",
             "xContato": "Matheus Henrique",
             "email": "mat.vilaverde@hotmail.com",
             "fone": "41984387167"
          },
          "dest": (documentoCliente.length >= 11) ? {
              "CNPJ": documentoCliente.length > 11 ? documentoCliente : undefined,
              "CPF": documentoCliente.length <= 11 ? documentoCliente : undefined,
              "xNome": cliente.nome || "Consumidor Final",
              "indIEDest": 9
          } : undefined,
          "det": itens.map((item: any, index: number) => {
             const idReal = Number(item.id || item.produtoId);
             const prod = produtosDb.find(p => p.id === idReal);
             if (!prod) throw new Error(`Produto não encontrado.`);
             const qtd = Number(item.quantidade);
             const valorUnit = Number(prod.precoVenda);
             return {
                "nItem": index + 1,
                "prod": {
                   "cProd": String(prod.id),
                   "cEAN": "SEM GTIN",
                   "xProd": prod.nome,
                   "NCM": prod.ncm || "00000000",
                   "CFOP": "5102",
                   "uCom": "UN",
                   "qCom": Number(qtd.toFixed(4)), 
                   "vUnCom": Number(valorUnit.toFixed(10)),
                   "vProd": Number((qtd * valorUnit).toFixed(2)),
                   "cEANTrib": "SEM GTIN",
                   "uTrib": "UN",
                   "qTrib": Number(qtd.toFixed(4)),
                   "vUnTrib": Number(valorUnit.toFixed(10)),
                   "indTot": 1
                },
                "imposto": {
                   "ICMS": { "ICMSSN102": { "orig": 0, "CSOSN": "102" } },
                   "PIS": { "PISOutr": { "CST": "99", "vBC": 0, "pPIS": 0, "vPIS": 0 } },
                   "COFINS": { "COFINSOutr": { "CST": "99", "vBC": 0, "pCOFINS": 0, "vCOFINS": 0 } }
                }
             };
          }),
          "total": {
             "ICMSTot": {
                "vBC": 0, "vICMS": 0, "vICMSDeson": 0, "vFCP": 0, "vBCST": 0, "vST": 0, "vFCPST": 0, "vFCPSTRet": 0,
                "vProd": Number(Number(total).toFixed(2)),
                "vFrete": 0, "vSeg": 0, "vDesc": 0, "vII": 0, "vIPI": 0, "vIPIDevol": 0, "vPIS": 0, "vCOFINS": 0, "vOutro": 0, 
                "vNF": Number(Number(total).toFixed(2)), "vTotTrib": 0
             }
          },
          "transp": { "modFrete": 9 },
          "pag": {
             "detPag": [{ "tPag": pagamento === 'Dinheiro' ? "01" : "99", "vPag": Number(Number(total).toFixed(2)) }]
          }
       }
    };

    console.log("📤 5. Enviando nota para API...");
    const emitirResponse = await fetch('https://api.sandbox.nuvemfiscal.com.br/nfce', {
        method: 'POST',
        headers: {
           'Authorization': `Bearer ${authData.access_token}`,
           'Content-Type': 'application/json'
        },
        body: JSON.stringify(corpoNota)
    });

    const textoResposta = await emitirResponse.text();
    console.log("📩 6. Status da API:", emitirResponse.status);

    if (!emitirResponse.ok) throw new Error(`Rejeição Nuvem: ${textoResposta}`);

    const respostaJson = JSON.parse(textoResposta);
    
    // 👇 LOG IMPORTANTE: Aqui você vê o ID no terminal
    console.log("🔑 ID DA NOTA GERADO:", respostaJson.id);
    console.log("🔑 CHAVE DE ACESSO:", respostaJson.chave);

    // 7. SALVAR NO BANCO DE DADOS (CRUCIAL!)
    if (vendaId && respostaJson.status === 'autorizado') {
        try {
            console.log("💾 7. Salvando dados fiscais na venda " + vendaId + "...");
            await prisma.venda.update({
                where: { id: Number(vendaId) }, // Atualiza a venda existente
                data: {
                    nota_emitida: true,
                    nota_id_nuvem: respostaJson.id,     // Salva ID pra cancelar depois
                    nota_chave: respostaJson.chave,     // Salva chave pra consulta
                    nota_numero: respostaJson.numero,   // Salva número visual
                }
            });
            console.log("✅ DADOS SALVOS NO BANCO!");
        } catch (dbError) {
            console.error("❌ Erro ao salvar no banco (mas nota foi emitida):", dbError);
        }
    }

    // 8. TENTA BAIXAR O PDF (Lógica de Persistência)
    let linkPdf = respostaJson.url_danfe || respostaJson.link_danfe;
    
    if (!linkPdf && respostaJson.status === 'autorizado') {
        console.log("🔄 8. Buscando PDF (Persistente)...");
        const maxTentativas = 3;
        
        for (let i = 1; i <= maxTentativas; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2s

            try {
                const pdfResponse = await fetch(`https://api.sandbox.nuvemfiscal.com.br/nfce/${respostaJson.id}/danfe`, {
                    headers: { 'Authorization': `Bearer ${authData.access_token}` }
                });

                if (pdfResponse.ok) {
                    const pdfBuffer = await pdfResponse.arrayBuffer();
                    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
                    linkPdf = `data:application/pdf;base64,${base64Pdf}`;
                    console.log("📦 PDF CAPTURADO NA TENTATIVA " + i);
                    break; 
                }
            } catch (e) { console.error("Tentativa falhou:", e); }
        }
    }

    // Se falhar tudo, manda o link da SEFAZ
    if (!linkPdf) linkPdf = "http://www.fazenda.pr.gov.br/nfce/consulta";

    return reply.status(200).send({
       mensagem: "Nota autorizada e salva!",
       url: linkPdf,
       nota_id: respostaJson.id,
       nota_chave: respostaJson.chave,
       nota_numero: respostaJson.numero 
    });

  } catch (error: any) {
    console.error("❌ ERRO GERAL:", error);
    return reply.status(500).send({ erro: error.message || "Erro interno" });
  }
});

// Rota de CANCELAMENTO de Nota Fiscal (Versão Tagarela 🗣️)
app.post('/cancelar-fiscal', async (request: any, reply: any) => {
  console.log("🚨 ROTA DE CANCELAMENTO ACIONADA");
  const { vendaId, justificativa } = request.body;

  try {
    const venda = await prisma.venda.findUnique({ where: { id: Number(vendaId) } });

    if (!venda || !venda.nota_id_nuvem) {
        return reply.status(400).send({ erro: "Venda sem ID de nota fiscal." });
    }

    // Valida tamanho da justificativa
    let motivoFinal = justificativa || "";
    if (motivoFinal.length < 15) {
        motivoFinal += " (Cancelamento solicitado no caixa)";
    }

    // Autenticação Nuvem Fiscal
    const credenciais = new URLSearchParams();
    credenciais.append('client_id', process.env.NUVEM_CLIENT_ID!);
    credenciais.append('client_secret', process.env.NUVEM_CLIENT_SECRET!);
    credenciais.append('grant_type', 'client_credentials');
    credenciais.append('scope', 'nfce'); 

    const authResponse = await fetch('https://auth.nuvemfiscal.com.br/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: credenciais
    });
    const authData = await authResponse.json();

    console.log(`🗑️ Enviando pedido de cancelamento para ID: ${venda.nota_id_nuvem}`);

    // Chamada API Nuvem Fiscal
    const cancelResponse = await fetch(`https://api.sandbox.nuvemfiscal.com.br/nfce/${venda.nota_id_nuvem}/cancelamento`, {
        method: 'POST',
        headers: {
           'Authorization': `Bearer ${authData.access_token}`,
           'Content-Type': 'application/json'
        },
        body: JSON.stringify({ justificativa: motivoFinal })
    });

    const textoBruto = await cancelResponse.text();
    console.log("📦 RESPOSTA API:", textoBruto); 

    if (!cancelResponse.ok) {
        if (textoBruto.toLowerCase().includes("já está cancelada") || textoBruto.toLowerCase().includes("ja esta cancelada") || cancelResponse.status === 422) {
             console.log("⚠️ Nota já estava cancelada. Prosseguindo para estorno interno...");
        } else {
             throw new Error(`Recusa da Nuvem: ${textoBruto}`);
        }
    }

    // ====================================================
    // 🔄 TRANSACTION: ESTORNA TUDO (ESTOQUE E DINHEIRO)
    // ====================================================
    await prisma.$transaction(async (tx) => {
        // 1. Marca venda como cancelada
        await tx.venda.update({
            where: { id: Number(vendaId) },
            data: { nota_cancelada: true }
        });

        // 2. Devolve itens para o estoque
        const itensVenda = await tx.itemVenda.findMany({ where: { vendaId: Number(vendaId) }});
        for (const item of itensVenda) {
            await tx.produto.update({
                where: { id: item.produtoId },
                data: { estoque: { increment: Number(item.quantidade) } }
            });
        }
        
        // 3. TIRA O DINHEIRO DO CAIXA (ESTORNO) 💰🔻
        if (venda.caixaId) {
            await tx.caixa.update({
                where: { id: venda.caixaId },
                data: { saldoAtual: { decrement: Number(venda.total) } }
            });

            // 4. Cria registro no histórico do caixa para você saber o que houve
            await tx.movimentacaoCaixa.create({
                data: {
                    caixaId: venda.caixaId,
                    tipo: "ESTORNO", // Ou "DEVOLUCAO"
                    valor: Number(venda.total),
                    descricao: `Cancelamento Venda #${venda.id}`
                }
            });
        }
    });

    console.log("✅ Estorno financeiro e fiscal realizado!");
    return reply.status(200).send({ mensagem: "Nota cancelada e valor estornado do caixa!" });

  } catch (error: any) {
    console.error("❌ ERRO:", error);
    return reply.status(500).send({ erro: error.message || "Erro interno" });
  }
});

// 👇 SUBSTITUA SUA ROTA '/finalizar-venda' POR ESTA AQUI
// 👇 SUBSTITUA SUA ROTA '/finalizar-venda' POR ESTA VERSÃO INTEGRADA
// Rota UNIVERSAL: Aceita nota pronta ou emite na hora
app.post('/finalizar-venda', async (request: any, reply: any) => {
  // 👇 Perceba que agora pegamos 'dadosFiscais' também
  const { itens, total, pagamento, clienteId, caixaId, emitirNota, dadosFiscais } = request.body;

  const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });
  if (!caixaAberto) return reply.status(400).send({ erro: "Caixa Fechado!" });

  try {
    // 1. DEFINE OS DADOS DA NOTA (Seja vindo do Front ou Null)
    let infoNota = {
        emitida: false,
        id_nuvem: null,
        chave: null,
        numero: null,
        url: null as string | null
    };

    // SE O FRONT JÁ MANDOU A NOTA (Cenário atual do seu log)
    if (dadosFiscais && dadosFiscais.nota_id) {
        console.log("📎 Recebi nota pronta do Frontend:", dadosFiscais.nota_id);
        infoNota = {
            emitida: true,
            id_nuvem: dadosFiscais.nota_id,
            chave: dadosFiscais.nota_chave,
            numero: dadosFiscais.nota_numero,
            url: dadosFiscais.url || dadosFiscais.nota_url_pdf
        };
    }

    // 2. SALVA NO BANCO (COM OS DADOS DA NOTA SE TIVER)
    const vendaRegistrada = await prisma.$transaction(async (tx) => {
      // Cria Venda
      const novaVenda = await tx.venda.create({
        data: {
          total: Number(total),
          pagamento: pagamento || "Dinheiro",
          data: new Date(),
          clienteId: clienteId ? Number(clienteId) : null,
          caixaId: caixaAberto.id,
          
          // 👇 AQUI ESTÁ A CORREÇÃO: GRAVA O QUE VEIO DO FRONT
          nota_emitida: infoNota.emitida, 
          nota_id_nuvem: infoNota.id_nuvem,
          nota_chave: infoNota.chave,
          nota_numero: infoNota.numero,
          urlFiscal: infoNota.url,

          itens: {
            create: itens.map((item: any) => ({
              produtoId: Number(item.id || item.produtoId),
              quantidade: Number(item.quantidade),
              precoUnit: Number(item.preco || item.precoVenda || 0)
            }))
          },
          pagamentos: {
            create: [{ forma: pagamento, valor: Number(total) }]
          }
        }
      });

      // Baixa Estoque
      for (const item of itens) {
        await tx.produto.update({
          where: { id: Number(item.id || item.produtoId) },
          data: { estoque: { decrement: Number(item.quantidade) } }
        });
      }

      // Atualiza Caixa
      await tx.caixa.update({
        where: { id: caixaAberto.id },
        data: { saldoAtual: { increment: Number(total) } }
      });
      
      return novaVenda;
    });

    console.log(`✅ Venda #${vendaRegistrada.id} Salva! Nota Emitida: ${infoNota.emitida}`);

    // 3. SE PRECISAR EMITIR AGORA (Caso o front peça)
    if (emitirNota && !infoNota.emitida) {
        // ... (Aqui ficaria aquela lógica de emitir depois, se um dia precisar) ...
        // Por enquanto, como seu front já emite antes, não precisa duplicar.
    }

    return reply.status(200).send({ 
      ok: true, 
      vendaId: vendaRegistrada.id, 
      urlFiscal: infoNota.url 
    });

  } catch (error: any) {
    console.error("❌ ERRO AO SALVAR VENDA:", error);
    return reply.status(500).send({ erro: "Erro ao processar venda." });
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