import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import axios from 'axios';
import * as dotenv from 'dotenv';

// Isso faz o código ler o arquivo .env
dotenv.config();

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

// ==========================================
// 💰 ROTAS DE CAIXA (NOVO - COLE ISSO NO SEU ARQUIVO)
// ==========================================

// 1. Verificar Status
app.get('/caixa/status', async (request, reply) => {
  const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });
  return caixaAberto || null; 
});

// 2. Abrir Caixa
app.post('/caixa/abrir', async (req, reply) => {
  const { saldoInicial, observacoes } = req.body as any
  const jaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } })
  
  if (jaAberto) return reply.status(400).send({ erro: "Já existe um caixa aberto!" })

  const novoCaixa = await prisma.caixa.create({
    data: {
      saldoInicial: Number(saldoInicial),
      saldoAtual: Number(saldoInicial),
      status: 'ABERTO',
      observacoes: observacoes
    }
  })
  
  // Cria o registro da movimentação inicial
  await prisma.movimentacaoCaixa.create({
    data: {
      caixaId: novoCaixa.id,
      tipo: 'ABERTURA',
      valor: Number(saldoInicial),
      descricao: 'Abertura de Caixa'
    }
  })

  return reply.send(novoCaixa)
})

// 3. Fechar Caixa
app.post('/caixa/fechar', async (request, reply) => {
    const { caixaId } = request.body as { caixaId: number };
    const caixa = await prisma.caixa.findUnique({ where: { id: Number(caixaId) } });
    
    if (!caixa) return reply.status(404).send({ error: "Caixa não encontrado" });

    const caixaFechado = await prisma.caixa.update({
      where: { id: Number(caixaId) },
      data: {
        status: "FECHADO",
        dataFechamento: new Date(),
        saldoFinal: caixa.saldoAtual
      }
    });
    return caixaFechado;
});

// 4. Movimentar (Sangria/Suprimento)
app.post('/caixa/movimentar', async (req, reply) => {
  const { tipo, valor, descricao } = req.body as any 
  const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } })
  
  if (!caixaAberto) return reply.status(400).send({ erro: "Nenhum caixa aberto!" })

  // Atualiza saldo
  if (tipo === 'SANGRIA') {
      await prisma.caixa.update({
          where: { id: caixaAberto.id },
          data: { saldoAtual: { decrement: Number(valor) } }
      })
  } else {
      await prisma.caixa.update({
          where: { id: caixaAberto.id },
          data: { saldoAtual: { increment: Number(valor) } }
      })
  }

  // Registra histórico
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

// Rota para Atualizar Saldo (Sangria/Suprimento)
  // Rota para Atualizar Saldo (Versão Fastify ⚡)
  app.post('/movimentacao', async (request, reply) => {
    // 1. "Avisa" pro TypeScript o que tem dentro do corpo da requisição
    const { caixaId, tipo, valor, motivo } = request.body as { 
      caixaId: number | string, 
      tipo: string, 
      valor: number | string, 
      motivo: string 
    };

    try {
      // 2. Busca o caixa atual
      const caixa = await prisma.caixa.findUnique({ where: { id: Number(caixaId) } });
      
      if (!caixa) {
        return reply.status(404).send({ error: "Caixa não encontrado" });
      }

      // 3. Calcula o novo saldo (Convertendo Decimal do banco para JS Number)
      const valorNumerico = Number(valor);
      const saldoAtualNumerico = Number(caixa.saldoAtual);

      const novoSaldo = tipo === 'SUPRIMENTO' 
        ? saldoAtualNumerico + valorNumerico 
        : saldoAtualNumerico - valorNumerico;

      // 4. Atualiza no banco
      const caixaAtualizado = await prisma.caixa.update({
        where: { id: Number(caixaId) },
        data: { saldoAtual: novoSaldo }
      });

      // No Fastify, basta retornar o objeto que ele vira JSON sozinho
      return caixaAtualizado;

    } catch (error) {
      console.log(error);
      return reply.status(500).send({ error: "Erro ao realizar movimentação" });
    }
  });

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
// Rota FINAL de Emissão de NFC-e (Padrão Completo SEFAZ 🏛️)
app.post('/emitir-fiscal', async (request: any, reply: any) => {
  const { itens, total, pagamento, cliente } = request.body;

  try {
    console.log("🔍 Iniciando emissão NFC-e (Padrão Completo)...");

    // 1. Busca produtos
    const idsProdutos = itens.map((i: any) => Number(i.id || i.produtoId)).filter((id: number) => !isNaN(id));
    const produtosDb = await prisma.produto.findMany({ where: { id: { in: idsProdutos } } });

    // 2. Autenticação
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

    if (!authResponse.ok) throw new Error(await authResponse.text());
    const authData = await authResponse.json();
    
    // 3. Monta a Nota no Padrão OFICIAL (infNFe)
    // Gera um número aleatório para não dar duplicidade nos testes
    const numeroNota = Math.floor(Math.random() * 100000);

    const corpoNota = {
       "infNFe": {
          "versao": "4.00",
          "ide": {
             "cUF": 41, // Paraná
             "cNF": numeroNota,
             "natOp": "VENDA AO CONSUMIDOR",
             "mod": 65, // Modelo 65 = NFC-e
             "serie": 1,
             "nNF": numeroNota,
             "dhEmi": new Date().toISOString(),
             "tpNF": 1,
             "idDest": 1,
             "cMunFG": 4106902, // Curitiba
             "tpImp": 4, // DANFE NFC-e
             "tpEmis": 1,
             "cDV": 0, // API calcula
             "tpAmb": 2, // 1=Produção, 2=Homologação (Testes)
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
                "nro": "530",
                "xBairro": "CIDADE INDUSTRIAL",
                "cMun": 4106902,
                "xMun": "CURITIBA",
                "UF": "PR",
                "CEP": "81460219",
                "cPais": 1058,
                "xPais": "BRASIL"
             },
             // 🚨🚨 ATENÇÃO: PREENCHA AQUI A SUA INSCRIÇÃO ESTADUAL 🚨🚨
             "IE": "9053865574", // <--- CONFIRA SE É ESSA MESMA (Achei essa pública na internet)
             "CRT": 1 // Simples Nacional
          },
          // Destinatário (Opcional na NFC-e se < R$ 10k)
          "dest": cliente ? {
              "CNPJ": cliente.cpfCnpj.length > 11 ? cliente.cpfCnpj : undefined,
              "CPF": cliente.cpfCnpj.length <= 11 ? cliente.cpfCnpj : undefined,
              "xNome": cliente.nome,
              "indIEDest": "9"
          } : undefined,
          
          "det": itens.map((item: any, index: number) => {
             const idReal = Number(item.id || item.produtoId);
             const prod = produtosDb.find(p => p.id === idReal);
             if (!prod) throw new Error(`Produto não encontrado.`);

             return {
                "nItem": index + 1,
                "prod": {
                   "cProd": String(prod.id),
                   "cEAN": "SEM GTIN", // Obrigatório
                   "xProd": prod.nome,
                   "NCM": prod.ncm || "00000000",
                   "CFOP": "5102", // Venda mercadoria
                   "uCom": "UN",
                   "qCom": Number(item.quantidade).toFixed(4),
                   "vUnCom": Number(prod.precoVenda).toFixed(10),
                   "vProd": (Number(prod.precoVenda) * Number(item.quantidade)).toFixed(2),
                   "cEANTrib": "SEM GTIN", // Obrigatório
                   "uTrib": "UN",
                   "qTrib": Number(item.quantidade).toFixed(4),
                   "vUnTrib": Number(prod.precoVenda).toFixed(10),
                   "indTot": 1
                },
                "imposto": {
                   "ICMS": {
                      "ICMSSN102": { // Simples Nacional
                         "orig": 0,
                         "CSOSN": "102"
                      }
                   },
                   "PIS": { "PISQtde": { "CST": "01", "qBCProd": 0, "vAliqProd": 0 } },
                   "COFINS": { "COFINSQtde": { "CST": "01", "qBCProd": 0, "vAliqProd": 0 } }
                }
             };
          }),
          
          "total": {
             "ICMSTot": {
                "vBC": "0.00", "vICMS": "0.00", "vICMSDeson": "0.00", "vFCP": "0.00", 
                "vBCST": "0.00", "vST": "0.00", "vFCPST": "0.00", "vFCPSTRet": "0.00",
                "vProd": Number(total).toFixed(2),
                "vFrete": "0.00", "vSeg": "0.00", "vDesc": "0.00", "vII": "0.00", 
                "vIPI": "0.00", "vIPIDevol": "0.00", "vPIS": "0.00", "vCOFINS": "0.00", 
                "vOutro": "0.00", "vNF": Number(total).toFixed(2), "vTotTrib": "0.00"
             }
          },
          
          "transp": { "modFrete": 9 }, // 9 = Sem Frete (Obrigatório informar)
          
          "pag": {
             "detPag": [{
                "tPag": pagamento === 'Dinheiro' ? "01" : "99",
                "vPag": Number(total).toFixed(2)
             }]
          }
       }
    };

    console.log("📤 Enviando...");

    // 4. Envia para o Endpoint Padrão (Agora com o JSON completo!)
    const emitirResponse = await fetch('https://api.sandbox.nuvemfiscal.com.br/nfce', {
        method: 'POST',
        headers: {
           'Authorization': `Bearer ${authData.access_token}`,
           'Content-Type': 'application/json'
        },
        body: JSON.stringify(corpoNota)
    });

    const responseText = await emitirResponse.text();
    if (!emitirResponse.ok) {
        console.error("❌ Erro:", responseText);
        throw new Error(responseText);
    }

    const respostaNota = JSON.parse(responseText);
    return reply.status(200).send({
       mensagem: "Nota emitida com sucesso!",
       // A resposta pode variar, tenta pegar qualquer link de PDF
       url: respostaNota.link_danfe || respostaNota.url_danfe || "https://www.nuvemfiscal.com.br"
    });

  } catch (error: any) {
    console.error("ERRO GERAL:", error);
    return reply.status(500).send({ erro: error.message || "Erro interno" });
  }
});
// 👇 SUBSTITUA SUA ROTA '/finalizar-venda' POR ESTA AQUI
// 👇 SUBSTITUA SUA ROTA '/finalizar-venda' POR ESTA VERSÃO INTEGRADA
app.post('/finalizar-venda', async (request: any, reply: any) => {
  const { itens, total, pagamento, clienteId, caixaId, emitirNota } = request.body;

  // 1. SEGURANÇA: Só vende se tiver caixa aberto
  const caixaAberto = await prisma.caixa.findFirst({ where: { status: 'ABERTO' } });
  
  if (!caixaAberto) {
    return reply.status(400).send({ erro: "O Caixa está fechado! Abra antes de vender." });
  }

  let urlFiscal = null;

  try {
    // ========================================
    // 🧾 EMISSÃO DA NOTA FISCAL (SE SOLICITADO)
    // ========================================
    if (emitirNota) {
      console.log("📄 Iniciando emissão de NFC-e...");

      // Busca os produtos do banco
      const idsProdutos = itens
        .map((i: any) => Number(i.id || i.produtoId))
        .filter((id: number) => !isNaN(id));

      const produtosDb = await prisma.produto.findMany({ 
        where: { id: { in: idsProdutos } } 
      });

      // Busca dados do cliente (se houver)
      const cliente = clienteId 
        ? await prisma.cliente.findUnique({ where: { id: Number(clienteId) } })
        : null;

      // Autenticação na Nuvem Fiscal
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

      if (!authResponse.ok) {
        const erroTexto = await authResponse.text();
        console.error("❌ Erro na Autenticação:", erroTexto);
        throw new Error(`Falha ao autenticar: ${erroTexto}`);
      }

      const authData = await authResponse.json();

      // Monta o corpo da nota
      const corpoNota = {
        ambiente: "homologacao", // Troque para "producao" quando for ao vivo
        natureza_operacao_descricao: "Venda ao Consumidor",
        finalidade_emissao: "normal",
        emitente: { 
          cpf_cnpj: process.env.CNPJ_EMITENTE || "12820608000141"
        },
        destinatario: cliente ? { 
          nome: cliente.nome, 
          cpf_cnpj: cliente.cpfCnpj 
        } : undefined,
        
        itens: itens.map((item: any, index: number) => {
          const idReal = Number(item.id || item.produtoId);
          const prod = produtosDb.find(p => p.id === idReal);
          
          if (!prod) throw new Error(`Produto ID ${idReal} não encontrado.`);

          return {
            numero_item: index + 1,
            codigo_produto: String(prod.id),
            descricao: prod.nome,
            ncm: prod.ncm || "00000000",
            cest: prod.cest || "",
            cfop: prod.cfop || "5102",
            unidade_comercial: prod.unidade || "UN",
            quantidade_comercial: Number(item.quantidade),
            valor_unitario_comercial: Number(prod.precoVenda),
            valor_bruto: Number(prod.precoVenda) * Number(item.quantidade),
            icms: {
              situacao_tributaria: prod.csosn || "102",
              origem: Number(prod.origem) || 0
            }
          };
        }),
        
        pagamento: {
          formas_pagamento: [{
            meio_pagamento: pagamento === 'Dinheiro' ? '01' : 
                           pagamento === 'PIX' ? '99' : 
                           pagamento === 'Cartão Débito' ? '04' : 
                           pagamento === 'Cartão Crédito' ? '03' : '99',
            valor: Number(total)
          }]
        }
      };

      // Envia para a Nuvem Fiscal
      const emitirResponse = await fetch('https://api.sandbox.nuvemfiscal.com.br/nfce', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(corpoNota)
      });

      if (!emitirResponse.ok) {
        const erroTexto = await emitirResponse.text();
        let erroFinal;
        try {
          erroFinal = JSON.parse(erroTexto);
        } catch (e) {
          erroFinal = { erro: erroTexto };
        }
        console.error("❌ Erro na Emissão:", JSON.stringify(erroFinal, null, 2));
        throw new Error(JSON.stringify(erroFinal));
      }

      const respostaNota = await emitirResponse.json();
      urlFiscal = respostaNota.url_danfe || respostaNota.link_pdf;
      
      console.log("✅ Nota emitida! URL:", urlFiscal);
    }

    // ========================================
    // 💾 SALVA A VENDA NO BANCO
    // ========================================
    const venda = await prisma.venda.create({
      data: {
        total: Number(total),
        pagamento: pagamento || "Dinheiro",
        data: new Date(),
        clienteId: clienteId ? Number(clienteId) : null,
        caixaId: caixaAberto.id,
        urlFiscal: urlFiscal,
        
        itens: {
          create: itens.map((item: any) => ({
            produtoId: Number(item.id || item.produtoId),
            quantidade: Number(item.quantidade),
            precoUnit: Number(item.preco || item.precoVenda || 0)
          }))
        },
        
        pagamentos: {
          create: [{
            forma: pagamento,
            valor: Number(total)
          }]
        }
      }
    });

    // Baixa Estoque
    for (const item of itens) {
      await prisma.produto.update({
        where: { id: Number(item.id || item.produtoId) },
        data: { estoque: { decrement: Number(item.quantidade) } }
      });
    }

    // Atualiza Caixa
    await prisma.caixa.update({
      where: { id: caixaAberto.id },
      data: { saldoAtual: { increment: Number(total) } }
    });

    await prisma.movimentacaoCaixa.create({
      data: {
        caixaId: caixaAberto.id,
        tipo: "VENDA",
        valor: Number(total),
        descricao: `Venda #${venda.id}`
      }
    });

    return reply.status(200).send({ 
      ok: true, 
      vendaId: venda.id,
      urlFiscal: urlFiscal 
    });

  } catch (error: any) {
    console.error("❌ Erro na venda:", error);
    return reply.status(500).send({ 
      erro: error.message || "Erro interno ao processar venda." 
    });
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