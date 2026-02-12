import { useState, useEffect, useMemo } from 'react'
import { TelaLogin } from './TelaLogin';
import { TelaEquipe } from './TelaEquipe';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================================================
// 1. TIPAGEM DE DADOS (INTERFACES)
// ============================================================================

interface Produto {
  id: number
  nome: string
  codigoBarra?: string
  precoCusto: number
  precoVenda: number
  estoque: number
  unidade?: string
  categoria?: string
  fornecedor?: string
  localizacao?: string
  // Campos Fiscais
  ipi?: number
  icms?: number
  frete?: number
  ncm?: string
  cest?: string
  cfop?: string
  csosn?: string
  origem?: string
}

interface Cliente {
  id: number
  nome: string
  cpfCnpj?: string
  celular?: string
  endereco?: string
  saldoHaver: string 
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
}

interface PagamentoVenda {
  forma: string
  valor: number
}

interface Venda {
  id: number
  data: string
  total: string
  cliente?: Cliente
  nota_emitida?: boolean
  nota_cancelada?: boolean
  urlFiscal?: string
  pagamentos: { forma: string; valor: string }[]
  itens: { 
    id: number
    quantidade: string
    precoUnit: string
    produto: Produto 
  }[]
}

interface Orcamento {
  id: number
  data: string
  total: string
  cliente?: Cliente
  itens: { 
    id: number
    quantidade: string
    precoUnit: string
    produto: Produto 
  }[]
}

interface ContaReceber {
  id: number
  valor: string
  data: string
  status: string
  cliente: Cliente
  venda: Venda
}

// ============================================================================
// 2. ESTILOS (LAYOUT)
// ============================================================================

const estiloInput = {
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e0',
  outline: 'none',
  width: '100%',
  fontSize: '1rem',
  boxSizing: 'border-box' as const,
  marginBottom: '5px'
}

const estiloLabel = {
  fontSize: '0.85rem',
  color: '#4a5568',
  fontWeight: 'bold' as const,
  marginBottom: '4px',
  display: 'block'
}

const estiloBotao = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold' as const,
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '5px'
}

// ⚠️ CONFIGURAÇÃO DA API
const API_URL = 'https://api-vila-verde.onrender.com'

export function App() {
  
  // --- ESTADOS GERAIS ---
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [aba, setAba] = useState<string>('caixa');
  const [dashboard, setDashboard] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);  
  const [modoEscuro, setModoEscuro] = useState(false);
  
  // --- ESTADOS DE DADOS ---
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [historicoCaixas, setHistoricoCaixas] = useState<any[]>([]);

  // --- ESTADOS DO CAIXA ---
  const [caixaAberto, setCaixaAberto] = useState<any>(null); // Usado na barra de status
  const [caixa, setCaixa] = useState<any>(null); // Usado no modal de abrir/fechar
  const [modalCaixaVisivel, setModalCaixaVisivel] = useState(false);
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [valorAbertura, setValorAbertura] = useState("");

  // --- ESTADOS DE VENDA / CARRINHO ---
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('') 
  const [clienteSelecionado, setClienteSelecionado] = useState('') 
  const [termoCliente, setTermoCliente] = useState('');
  const [qtdParaAdicionar, setQtdParaAdicionar] = useState(1);
  const [troco, setTroco] = useState(0);
  const [listaPagamentos, setListaPagamentos] = useState<PagamentoVenda[]>([])
  const [valorPagamentoInput, setValorPagamentoInput] = useState('')
  const [formaPagamento, setFormaPagamento] = useState("Dinheiro");
  const [entrega, setEntrega] = useState(false);
  const [endereco, setEndereco] = useState('');
  const [listaEntregas, setListaEntregas] = useState<any[]>([]);

  // --- ESTADOS DE MODAIS E EDIÇÃO ---
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null)
  
  const [modalHistoricoCliente, setModalHistoricoCliente] = useState(false)
  const [historicoCliente, setHistoricoCliente] = useState<Venda[]>([])
  const [clienteDoHistorico, setClienteDoHistorico] = useState<Cliente | null>(null)
  const [modoFiscal, setModoFiscal] = useState(true);

  // --- ESTADOS DE AUTORIZAÇÃO E MOVIMENTAÇÃO ---
  const [modalAutorizacao, setModalAutorizacao] = useState(false);
  const [senhaGerente, setSenhaGerente] = useState('');
  const [idVendaParaCancelar, setIdVendaParaCancelar] = useState<number | null>(null);
  
  const [modalMovimentacao, setModalMovimentacao] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA');
  const [valorMovimentacao, setValorMovimentacao] = useState('');
  const [descMovimentacao, setDescMovimentacao] = useState('');
  const [sangriaPendente, setSangriaPendente] = useState<{valor: number, motivo: string} | null>(null);

  // --- FORMULÁRIOS ---
  const [formProduto, setFormProduto] = useState({
    nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN',
    categoria: 'Geral', fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '',
    ncm: '', cest: '', cfop: '5102', csosn: '102', origem: '0'
  });

  const [formCliente, setFormCliente] = useState({ 
    nome: '', cpfCnpj: '', celular: '', endereco: '' 
  });

  // ==========================================================================
  // 3. EFEITOS E CARREGAMENTO
  // ==========================================================================

  // Detector de Mobile
  useEffect(() => {
    function handleResize() { setIsMobile(window.innerWidth < 768); }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carregamento Inicial e Loop de Atualização
  useEffect(() => {
    if (usuarioLogado) {
        carregarDados();
        carregarDashboard();
        verificarStatusCaixa();
        
        if (usuarioLogado.cargo === 'MOTORISTA') {
            setAba('entregas');
            carregarEntregas();
        }

        const relogio = setInterval(() => {
            carregarDados(); 
            if (aba === 'entregas') carregarEntregas();
        }, 5000);

        return () => clearInterval(relogio);
    }
  }, [usuarioLogado, aba]);

  // Monitor de Limpeza do Carrinho
  useEffect(() => {
    if (carrinho.length === 0) {
      setTroco(0);            
      setListaPagamentos([]); 
    }
  }, [carrinho]);

  // Filtro de Produtos Otimizado
  const produtosFiltrados = useMemo(() => {
    if (!busca) return []; 
    const termo = busca.toLowerCase();
    return produtos
      .filter(p => p.nome.toLowerCase().includes(termo) || (p.codigoBarra && p.codigoBarra.includes(termo)))
      .slice(0, 30);
  }, [busca, produtos]);

  // ==========================================================================
  // 4. FUNÇÕES LÓGICAS
  // ==========================================================================

  async function carregarDados() {
    try {
      const [resProd, resVend, resCli, resConta, resOrc] = await Promise.all([
        fetch(`${API_URL}/produtos`),
        fetch(`${API_URL}/vendas`),
        fetch(`${API_URL}/clientes`),
        fetch(`${API_URL}/contas-receber`),
        fetch(`${API_URL}/orcamentos`)
      ])
      
      setProdutos(await resProd.json())
      setVendasRealizadas(await resVend.json())
      setClientes(await resCli.json())
      setContasReceber(await resConta.json())
      setOrcamentos(await resOrc.json())
    } catch (e) {
      console.error("Erro ao carregar dados:", e)
    }
  }

  async function carregarDashboard() {
    try {
      const res = await fetch(`${API_URL}/dashboard`);
      const dados = await res.json();
      setDashboard(dados);
    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    }
  }

  async function verificarStatusCaixa() {
    try {
      const res = await fetch(`${API_URL}/caixa/status`);
      const dados = await res.json();
      setCaixa(dados); // Objeto completo para o modal
      setCaixaAberto(dados); // Objeto para a barra de status
    } catch (erro) {
      console.error("Erro ao verificar caixa", erro);
    }
  }

  async function carregarEntregas() {
    try {
      const res = await fetch(`${API_URL}/entregas/pendentes`);
      const dados = await res.json();
      setListaEntregas(dados);
    } catch (error) {
      console.error("Erro ao carregar entregas");
    }
  }

  async function carregarHistorico() {
    try {
      const res = await fetch(`${API_URL}/caixas/historico`);
      if (res.ok) {
        const dados = await res.json();
        setHistoricoCaixas(dados);
        // O histórico é exibido na aba orçamentos ou num modal, vamos garantir que ele apareça
        // No código original, ele parece ser renderizado no final. Vamos manter.
      } else {
        alert("Erro ao buscar histórico.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  }

  // --- FUNÇÕES DE CAIXA ---

  async function realizarAberturaCaixa() {
    if (!valorAbertura) return alert("Digite o valor do troco inicial!");

    try {
      const res = await fetch(`${API_URL}/caixa/abrir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldoInicial: Number(valorAbertura.replace(',', '.')), observacoes: "Abertura pelo Front" })
      });

      if (res.ok) {
        alert("✅ Caixa Aberto com Sucesso!");
        verificarStatusCaixa();
        setModalCaixaVisivel(false);
        setModalAbrirCaixa(false);
      } else {
        alert("Erro: Já existe um caixa aberto ou deu falha.");
      }
    } catch (erro) {
      alert("Erro de conexão ao abrir caixa.");
    }
  }

  async function fecharCaixa() {
    if (!caixa) return;
    if (!confirm("Tem certeza que deseja FECHAR o caixa do dia?")) return;

    try {
        await fetch(`${API_URL}/caixa/fechar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caixaId: caixa.id })
        });
        alert("🔒 Caixa Fechado!");
        setCaixa(null);
        setCaixaAberto(null);
        setModalCaixaVisivel(false);
    } catch (e) {
        alert("Erro ao fechar");
    }
  }

  // --- MOVIMENTAÇÃO (SANGRIA/SUPRIMENTO) ---

  const salvarMovimentacao = () => {
    if (!valorMovimentacao || Number(valorMovimentacao) <= 0) return alert("Digite um valor válido!");
    const valor = Number(valorMovimentacao);

    if (tipoMovimentacao === 'SANGRIA' && usuarioLogado.cargo !== 'GERENTE') {
      setSangriaPendente({ valor, motivo: descMovimentacao });
      setModalMovimentacao(false);
      setModalAutorizacao(true);
      return; 
    }
    executarMovimentacao(valor, descMovimentacao, tipoMovimentacao);
  };

  const executarMovimentacao = async (valor: number, motivo: string, tipo: string) => {
    if (!caixaAberto) return;
    try {
      const res = await fetch(`${API_URL}/movimentacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caixaId: caixaAberto.id,
          tipo: tipo,
          valor: valor,
          motivo: motivo
        })
      });

      if (res.ok) {
        const caixaAtualizado = await res.json();
        setCaixaAberto({ ...caixaAberto, saldoAtual: caixaAtualizado.saldoAtual });
        setCaixa({ ...caixa, saldoAtual: caixaAtualizado.saldoAtual }); // Atualiza ambos
        
        setModalMovimentacao(false);
        setValorMovimentacao('');
        setDescMovimentacao('');
        setSangriaPendente(null);
        alert(`✅ ${tipo} realizada com sucesso!`);
      } else {
        alert("Erro ao salvar movimentação.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  };

  // --- VENDAS E CARRINHO ---

  function adicionarAoCarrinho(p: Produto) {
    if (Number(p.estoque) <= 0) {
      alert("Produto sem estoque!");
      return;
    }
    const qtd = qtdParaAdicionar > 0 ? qtdParaAdicionar : 1;
    setCarrinho(lista => {
      const existe = lista.find(item => item.produto.id === p.id);
      if (existe) {
        return lista.map(item => item.produto.id === p.id ? { ...item, quantidade: item.quantidade + qtd } : item);
      }
      return [...lista, { produto: p, quantidade: qtd }];
    });
    setQtdParaAdicionar(1); 
  }

  function removerItemCarrinho(index: number) {
    const novoCarrinho = [...carrinho];
    novoCarrinho.splice(index, 1);
    setCarrinho(novoCarrinho);
  }

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)
  const totalPago = listaPagamentos.reduce((acc, p) => acc + p.valor, 0)
  const faltaPagar = totalCarrinho - totalPago

  function adicionarPagamento() {
    // 🛑 TRAVA DE SEGURANÇA
    if (!caixaAberto) {
      return alert("⛔ O caixa está fechado! Abra o caixa para movimentar dinheiro.");
    }
    const valorNum = Number(valorPagamentoInput.replace(',', '.')); 
    if (!valorNum || valorNum <= 0) return alert("Digite um valor válido");

    const totalVenda = carrinho.reduce((acc: number, item: any) => acc + (item.quantidade * Number(item.produto.precoVenda)), 0);
    const totalJaPago = listaPagamentos.reduce((acc: number, p: any) => acc + Number(p.valor), 0);
    const falta = totalVenda - totalJaPago;
    const faltaArredondada = Number(falta.toFixed(2));

    let valorParaRegistrar = valorNum;

    if (valorNum > faltaArredondada) {
      if (formaPagamento === 'Dinheiro') { 
        const trocoCalculado = valorNum - faltaArredondada;
        setTroco(trocoCalculado);
        valorParaRegistrar = faltaArredondada;
      } else {
        return alert("Pagamento maior que o total só é permitido em DINHEIRO (para troco).");
      }
    }

    setListaPagamentos([...listaPagamentos, { forma: formaPagamento, valor: valorParaRegistrar }]);
    setValorPagamentoInput(""); 
  }

  async function prepararNotaFiscal() {
      // 1. Validação básica
      if (carrinho.length === 0) return alert("Carrinho vazio!");
      
      // 2. Calcula o total na hora (Resolve o erro 'totalVenda is not defined')
      const totalCalculado = carrinho.reduce((acc, item) => acc + (item.produto.precoVenda * item.quantidade), 0);
      
      // 3. Busca o cliente
      const cliente = clientes.find((c: any) => String(c.id) === String(clienteSelecionado));

      // 4. Monta o pacote (Resolve os erros de 'id' e 'preco')
      const dadosParaEnvio = {
        total: totalCalculado,
        pagamento: formaPagamento,
        cliente: cliente ? { nome: cliente.nome, cpf_cnpj: cliente.cpfCnpj } : undefined,
        
        itens: carrinho.map((item) => ({
          // 👇 AQUI MUDOU: Acessamos direto 'item.produto' que é onde os dados estão
          id: Number(item.produto.id), 
          quantidade: Number(item.quantidade),
          preco: Number(item.produto.precoVenda)
        }))
      };

      try {
        const response = await fetch(`${API_URL}/emitir-fiscal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosParaEnvio)
        });

        const resultado = await response.json();

        if (response.ok) {
          alert("✅ " + resultado.mensagem);
          if (resultado.url) window.open(resultado.url, '_blank');
          
          // 👇 MUDANÇA: Passa o objeto 'resultado' inteiro (que tem ID e Chave)
          await finalizarVendaNoBanco(resultado); 

        } else {
          alert("❌ Erro ao emitir: " + (resultado.erro || "Erro desconhecido"));
        }

      } catch (error) {
        console.error(error);
        alert("❌ Erro de conexão com o servidor.");
      }
    }

  async function finalizarVendaNoBanco(dadosFiscais: any = null) {
    // 🛑 TRAVA DE SEGURANÇA: Verifica se o caixa está aberto
    if (!caixaAberto) {
      alert("⛔ CAIXA FECHADO!\n\nVocê precisa abrir o caixa (Botão 'Abrir Caixa') antes de realizar vendas.");
      return; // Para tudo e não deixa continuar
    }

    if (carrinho.length === 0) return alert("Carrinho vazio!");

    try {
      const totalVenda = carrinho.reduce((acc: number, item: any) => acc + (Number(item.produto.precoVenda) * Number(item.quantidade)), 0);
      const itensFormatados = carrinho.map((item: any) => ({
        id: item.produto.id,
        quantidade: Number(item.quantidade),
        nome: item.produto.nome
      }));

      const corpoDaVenda = {
        itens: itensFormatados,
        total: totalVenda,
        pagamento: formaPagamento,
        pagamentos: listaPagamentos, // Envia lista detalhada se houver
        clienteId: clienteSelecionado ? Number(clienteSelecionado) : null,
        caixaId: caixaAberto.id,
        dadosFiscais: dadosFiscais
      };

      const resposta = await fetch(`${API_URL}/finalizar-venda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoDaVenda)
      });

      if (resposta.ok) {
        setCarrinho([]); 
        setListaPagamentos([]);
        setTroco(0);
        alert("💰 Venda Salva no Caixa!");
        carregarDados();
        verificarStatusCaixa();
      } else {
        const erro = await resposta.json();
        alert("Erro: " + (erro.erro || JSON.stringify(erro)));
      }
    } catch (erro) {
      alert("Erro de conexão.");
    }
  }

  async function tentarCancelarVenda(id: number) {
    if (usuarioLogado.cargo === 'GERENTE') {
       executarCancelamento(id);
    } else {
       setIdVendaParaCancelar(id);
       setSenhaGerente('');
       setModalAutorizacao(true);
    }
  }

  // --- FUNÇÃO NOVA: CANCELAR NFC-e ---
  async function cancelarNotaFiscal(vendaId: number) {
    const confirmacao = window.confirm("ATENÇÃO: Deseja cancelar esta Nota Fiscal na Receita?\n\nO prazo máximo é de 30 minutos após a emissão.");
    if (!confirmacao) return;

    const justificativa = prompt("Motivo do cancelamento (Mínimo 15 letras):", "Erro no lançamento dos itens");

    if (!justificativa || justificativa.length < 15) {
      return alert("❌ A justificativa precisa ter pelo menos 15 caracteres.");
    }

    try {
      const res = await fetch(`${API_URL}/cancelar-fiscal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendaId, justificativa })
      });

      const dados = await res.json();

      if (res.ok) {
        alert("✅ " + dados.mensagem);
        carregarDados(); // Recarrega a lista para mostrar que foi cancelada
      } else {
        alert("❌ Erro: " + (dados.erro || "Falha ao cancelar"));
      }
    } catch (error) {
      alert("Erro de conexão com o servidor.");
    }
  }

  async function executarCancelamento(id: number) {
    const vendaParaCancelar = vendasRealizadas.find((v: any) => v.id === id);
    const valorDaVenda = vendaParaCancelar ? Number(vendaParaCancelar.total) : 0;

    try {
      const res = await fetch(`${API_URL}/vendas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("✅ Venda cancelada e estoque estornado!");
        setVendasRealizadas(vendasRealizadas.filter((v: any) => v.id !== id));
        
        if (caixaAberto) {
            setCaixaAberto({
                ...caixaAberto,
                saldoAtual: Number(caixaAberto.saldoAtual) - valorDaVenda
            });
        }
        setModalAutorizacao(false);
        setSenhaGerente('');
      } else {
        alert("Erro ao cancelar venda.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  }

  async function validarAutorizacao() {
    try {
      const res = await fetch(`${API_URL}/verificar-gerente`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ senha: senhaGerente })
      });

      if (res.ok) {
        if (sangriaPendente) {
           executarMovimentacao(sangriaPendente.valor, sangriaPendente.motivo, 'SANGRIA');
        } else if (idVendaParaCancelar) {
           await executarCancelamento(idVendaParaCancelar);
        }
        setModalAutorizacao(false);
        setSenhaGerente('');
      } else {
        alert("Senha de gerente INVÁLIDA! 🚫");
      }
    } catch (error) {
      alert("Erro ao validar senha.");
    }
  }

  // --- ORÇAMENTOS ---

  async function salvarOrcamento() {
    if (carrinho.length === 0) return
    try {
      const res = await fetch(`${API_URL}/orcamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itens: carrinho.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade })), 
          clienteId: clienteSelecionado || null,
          total: totalCarrinho
        })
      })

      if (res.ok) {
        const orc = await res.json()
        const nome = clientes.find(c => c.id === Number(clienteSelecionado))?.nome || 'Consumidor'
        imprimirCupom({
          id: orc.id,
          data: new Date(),
          cliente: { nome: nome },
          itens: carrinho,
          total: orc.total,
          pagamentos: [] 
        });        
        setCarrinho([])
        setClienteSelecionado('')
        setListaPagamentos([])
        alert("Orçamento salvo com sucesso!")
        carregarDados()
      } else {
        alert("Erro ao salvar orçamento")
      }
    } catch (e) {
      alert("Erro de Conexão")
    }
  }

  function efetivarOrcamento(orc: any) {
    if (carrinho.length > 0) {
      if (!confirm("Seu carrinho atual será limpo para carregar este orçamento. Continuar?")) return;
    }
    const itensDoOrcamento = orc.itens.map((item: any) => ({
      produto: item.produto, 
      quantidade: Number(item.quantidade)
    }));
    setCarrinho(itensDoOrcamento);
    setClienteSelecionado(orc.clienteId ? String(orc.clienteId) : ""); 
    setAba('caixa'); 
    alert("Orçamento carregado no caixa!");
  }

  async function excluirOrcamento(id: number) {
    if(!confirm("Tem certeza que deseja excluir este orçamento?")) return
    await fetch(`${API_URL}/orcamentos/${id}`, { method: 'DELETE' })
    carregarDados()
  }

  // --- ENTREGAS ---

  async function baixarEntrega(id: number) {
    if (!confirm("Confirmar que a entrega foi realizada?")) return;
    try {
      await fetch(`${API_URL}/entregas/${id}/concluir`, { method: 'PATCH' });
      alert("Entrega confirmada! ✅");
      carregarEntregas(); 
    } catch (error) {
      alert("Erro ao baixar entrega.");
    }
  }

  // --- CLIENTES E PRODUTOS (CRUD) ---

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault()
    const payload = { 
      ...formProduto, 
      precoCusto: Number(formProduto.precoCusto), 
      precoVenda: Number(formProduto.precoVenda), 
      estoque: Number(formProduto.estoque),
      ipi: Number(formProduto.ipi || 0),
      icms: Number(formProduto.icms || 0),
      frete: Number(formProduto.frete || 0)
    }
    const url = produtoEmEdicao ?(`${API_URL}/produtos/${produtoEmEdicao.id}`):(`${API_URL}/produtos`)
    const metodo = produtoEmEdicao ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if(res.ok){
      setModalAberto(false)
      carregarDados()
      alert("Produto salvo com sucesso!")
    } else {
      alert("Erro ao salvar produto")
    }
  }

  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault()
    const url = clienteEmEdicao ?(`${API_URL}/clientes/${clienteEmEdicao.id}`):(`${API_URL}/clientes`)
    const metodo = clienteEmEdicao ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formCliente)
    })
    if(res.ok){
      setModalClienteAberto(false)
      carregarDados()
      alert("Cliente salvo com sucesso!")
    }
  }

  async function excluirProduto(id: number) {
    if(confirm("Tem certeza que deseja excluir?")) {
      await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' })
      carregarDados()
    }
  }

  async function excluirCliente(id: number) {
    if(confirm("Tem certeza que deseja excluir?")) {
      await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE' })
      carregarDados()
    }
  }

  async function verHistorico(c: Cliente) {
    const res = await fetch(`${API_URL}/clientes/${c.id}/vendas`)
    const vendas = await res.json()
    setHistoricoCliente(vendas)
    setClienteDoHistorico(c)
    setModalHistoricoCliente(true)
  }

  async function gerarHaver(c: Cliente) {
    const valorStr = prompt("Qual o valor da devolução?")
    if(valorStr) {
      const valor = parseFloat(valorStr.replace(',', '.'))
      await fetch(`${API_URL}/clientes/${c.id}/haver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor })
      })
      carregarDados()
      alert("Haver gerado!")
    }
  }

  async function receberConta(id: number) {
    if (!confirm("Confirmar recebimento deste valor? O dinheiro entrará no caixa.")) return;
    try {
      const res = await fetch(`${API_URL}/contas-receber/baixar/${id}`, { method: 'POST' });
      if (res.ok) {
        alert("Pagamento recebido com sucesso! 💰");
        carregarDados(); 
        verificarStatusCaixa(); 
      } else {
        const erro = await res.json();
        alert(erro.erro || "Erro ao receber.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  }

  // --- EXTRAS: BACKUP, IMPRESSÃO, ZAP ---

  const salvarBackup = () => {
    const dadosBackup = {
      data_backup: new Date(),
      produtos: produtos,
      clientes: clientes,
      vendas: vendasRealizadas,
      orcamentos: orcamentos,
      caixa: caixaAberto
    };
    const nomeArquivo = `BACKUP_VILA_VERDE_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    const blob = new Blob([JSON.stringify(dadosBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    alert(`✅ Backup salvo!`);
  };

  const enviarZap = (venda: any) => {
    let telefone = venda.cliente?.celular || '';
    telefone = telefone.replace(/\D/g, ''); 
    if (telefone.length < 10) {
      const novoNumero = prompt("Cliente sem celular! Digite o número (com DDD):");
      if (!novoNumero) return;
      telefone = novoNumero.replace(/\D/g, '');
    }
    const nomeCliente = encodeURIComponent(venda.cliente?.nome || 'Cliente');
    const totalTexto = Number(venda.total).toFixed(2);
    const itensTexto = venda.itens.map((i: any) => `%E2%96%AA%20${i.quantidade}x%20${encodeURIComponent(i.produto.nome)}`).join('%0A');
    const linkFinal = `https://wa.me/55${telefone}?text=` +
      `Ol%C3%A1%20*${nomeCliente}*,%20tudo%20bem%3F%20%F0%9F%8F%97%EF%B8%8F%0A%0A` +
      `Aqui%20%C3%A9%20da%20*Vila%20Verde*!%20Segue%20o%20resumo%20da%20sua%20compra:%0A%0A` +
      `${itensTexto}%0A%0A` +
      `*%F0%9F%92%B0%20TOTAL:%20R$%20${totalTexto}*%0A%0A` +
      `Obrigado%20pela%20prefer%C3%AAncia!%20%F0%9F%A4%9D`;
    window.open(linkFinal, '_blank');
  };

  function reimprimirVenda(v: Venda) {
    const itens = v.itens.map(i => ({ produto: i.produto, quantidade: Number(i.quantidade) }))
    const nome = v.cliente?.nome || 'Consumidor'
    imprimirCupom({
        id: v.id,
        data: v.data,
        cliente: { nome: nome },
        itens: itens,
        total: v.total,
        pagamentos: []
      });
  }

  function reimprimirOrcamento(o: Orcamento) {
    const itens = o.itens.map(i => ({ produto: i.produto, quantidade: Number(i.quantidade) }))
    const nome = o.cliente?.nome || 'Consumidor'
    imprimirCupom({
        id: o.id,
        data: o.data,
        cliente: { nome: nome },
        itens: itens,
        total: o.total,
        pagamentos: [] 
      });
  }

  function imprimirCupom(venda: any) {
    const janela = window.open('', '', 'width=350,height=600');
    const totalVenda = Number(venda.total).toFixed(2);
    const conteudo = `
      <html>
        <head>
          <title>Cupom Vila Verde</title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', monospace; font-weight: 900; color: #000; margin: 0; padding: 5px; width: 100%; font-size: 14px; }
            .loja { font-size: 20px; text-align: center; margin-bottom: 5px; }
            .info { font-size: 12px; text-align: center; margin-bottom: 10px; }
            .divisor { border-top: 3px dashed #000; margin: 10px 0; width: 100%; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 14px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            td { padding: 5px 0; vertical-align: top; }
            .col-qtd { width: 30px; }
            .col-preco { text-align: right; white-space: nowrap; }
            .total-area { font-size: 24px; text-align: right; margin-top: 10px; }
            .agradecimento { text-align: center; margin-top: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="loja">MAT. CONSTRUÇÃO<br>VILA VERDE 🏗️</div>
          <div class="info">Rua Jornalista Rubens Avila, 530 - CIC<br>Tel/Zap: (41) 98438-7167<br>CNPJ: 12.820.608/0001-41</div>
          <div class="divisor"></div>
          <div><strong>VENDA: #${venda.id}</strong></div>
          <div>Data: ${new Date(venda.data).toLocaleString()}</div>
          <div>Cliente: ${venda.cliente ? venda.cliente.nome : 'Consumidor Final'}</div>
          <div class="divisor"></div>
          <table>
            <thead><tr><th class="col-qtd">QTD</th><th class="col-nome">ITEM</th><th class="col-preco">TOTAL</th></tr></thead>
            <tbody>
              ${venda.itens.map((item: any) => `
                <tr>
                  <td class="col-qtd">${item.quantidade}x</td>
                  <td class="col-nome">${item.produto.nome}</td>
                  <td class="col-preco">R$ ${(item.quantidade * Number(item.produto.precoVenda)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divisor"></div>
          <div class="total-area">TOTAL: R$ ${totalVenda}</div>
          <div class="agradecimento">Obrigado pela preferência! 👍</div>
        </body>
      </html>
    `;
    janela?.document.write(conteudo);
    janela?.document.close();
    janela?.print();
  }

  // ==========================================================================
  // 5. RENDERIZAÇÃO DA TELA (JSX)
  // ==========================================================================

  // SE NÃO TIVER NINGUÉM LOGADO
  if (!usuarioLogado) {
    return <TelaLogin onLoginSucesso={(u) => setUsuarioLogado(u)} />;
  }

  // TELA PRINCIPAL
  const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0)
  const clienteObjSelecionado = clientes.find(c => c.id === Number(clienteSelecionado))

  return (
    <div style={{ 
      fontFamily: 'Segoe UI, sans-serif', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: modoEscuro ? '#1a202c' : '#f7fafc',
      color: modoEscuro ? '#f7fafc' : '#2d3748'
    }}>     
    
      {/* --- INÍCIO DA BARRA DE CAIXA (ADMIN) --- */}
      {(usuarioLogado.cargo === 'GERENTE' || usuarioLogado.cargo === 'VENDEDOR') && (
        <div style={{ 
          padding: '15px 20px', 
          backgroundColor: caixaAberto ? '#d4edda' : '#f8d7da', 
          color: caixaAberto ? '#155724' : '#721c24',
          borderBottom: '1px solid #ccc',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>{caixaAberto ? '✅' : '🔒'}</span>
            <div>
              <strong>STATUS DO CAIXA:</strong> {caixaAberto ? 'ABERTO' : 'FECHADO'}
              {caixaAberto && (
                <div style={{ fontSize: '0.85rem' }}>
                  Aberto às: {new Date(caixaAberto.dataAbertura).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          
          {(!caixaAberto || caixaAberto.status === 'FECHADO') ? (
            <button 
              onClick={() => setModalAbrirCaixa(true)}
              style={{ padding: '10px 20px', background: '#48bb78', color: 'white', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
            >
              ABRIR CAIXA 🔓
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              
              <button 
                onClick={carregarHistorico}
                style={{
                  backgroundColor: '#fff', color: '#1a1a1a', border: '1px solid #ddd', padding: '8px 15px', borderRadius: '8px',
                  fontWeight: '600', cursor: 'pointer', marginRight: '15px', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                  📜 Histórico de Caixa
              </button>

              <div style={{ background: '#fff', padding: '5px 10px', borderRadius: 5, border: '1px solid #c3e6cb', color: '#155724', display:'flex', alignItems:'center', gap: 10 }}>
                <strong>Saldo: R$ {Number(caixaAberto.saldoAtual).toFixed(2)}</strong>
                <div style={{display:'flex', gap:2}}>
                  <button 
                    onClick={() => { setTipoMovimentacao('SUPRIMENTO'); setModalMovimentacao(true); }}
                    title="Adicionar Dinheiro"
                    style={{ background: '#48bb78', color: 'white', border:'none', borderRadius:4, width:25, height:25, cursor:'pointer', fontWeight:'bold' }}
                  > + </button>
                  <button 
                    onClick={() => { setTipoMovimentacao('SANGRIA'); setModalMovimentacao(true); }}
                    title="Retirar Dinheiro"
                    style={{ background: '#e53e3e', color: 'white', border:'none', borderRadius:4, width:25, height:25, cursor:'pointer', fontWeight:'bold' }}
                  > - </button>
                </div>
              </div>
              <button 
                onClick={fecharCaixa}
                style={{ padding: '8px 15px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer' }}
              >
                FECHAR 🔒
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL PARA ABRIR O CAIXA --- */}
      {modalAbrirCaixa && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: 30, borderRadius: 10, width: 350, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h2 style={{ marginTop: 0, color: '#2d3748' }}>Abrir o Caixa 💰</h2>
            <p style={{ color: '#718096' }}>Quanto de dinheiro (troco) tem na gaveta agora?</p>
            <input 
              type="text" placeholder="Ex: 100,00" value={valorAbertura} onChange={(e) => setValorAbertura(e.target.value)}
              style={{ width: '100%', padding: 12, marginBottom: 15, fontSize: '1.2rem', border: '1px solid #cbd5e0', borderRadius: 5 }}
            />
            <button onClick={realizarAberturaCaixa} style={{ width: '100%', padding: 12, background: '#48bb78', color: 'white', border: 'none', borderRadius: 5, fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>
              CONFIRMAR ABERTURA
            </button>
            <button onClick={() => setModalAbrirCaixa(false)} style={{ width: '100%', marginTop: 10, background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div style={{ background: '#1a202c', padding: '10px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🏗️</span>
          <div>
            <h1 style={{ fontSize: 18, margin: 0, lineHeight: '1' }}>PDV Vila Verde</h1>
            <span style={{ background: '#4a5568', padding: '2px 6px', borderRadius: 4, fontSize: 10, textTransform: 'uppercase' }}>
              {usuarioLogado.cargo === 'GERENTE' ? '👤 MODO CHEFE' : usuarioLogado.cargo === 'VENDEDOR' ? '🛒 MODO VENDEDOR' : '🚚 MODO MOTORISTA'}
            </span>
          </div>
        </div>

        {usuarioLogado.cargo === 'GERENTE' && (
          <div style={{ display: 'flex', gap: 30 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#a0aec0' }}>CAIXA HOJE</div>
              <div style={{ fontWeight: 'bold', color: '#48bb78', fontSize: 18 }}>
                R$ {vendasRealizadas.filter(v => new Date(v.data).toLocaleDateString() === new Date().toLocaleDateString()).reduce((acc, v) => acc + Number(v.total), 0).toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#a0aec0' }}>A RECEBER</div>
              <div style={{ fontWeight: 'bold', color: '#ecc94b', fontSize: 18 }}>
                R$ {totalReceber.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button onClick={() => setModoEscuro(!modoEscuro)} style={{ background: 'transparent', border: '1px solid #4a5568', borderRadius: '50%', width: 35, height: 35, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            {modoEscuro ? '☀️' : '🌙'}
          </button>
          <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#cbd5e0' }}>
            Olá, <strong style={{ color: 'white' }}>{usuarioLogado.nome}</strong>
          </div>
          {usuarioLogado.cargo === 'GERENTE' && (
            <button onClick={salvarBackup} style={{ background: '#2b6cb0', color: 'white', border: 'none', padding: '8px 15px', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}>💾 BACKUP</button>
          )}
          <button onClick={() => setUsuarioLogado(null)} style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '8px 15px', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}>SAIR 🚪</button>
        </div>
      </div>

     {/* --- MENU DE NAVEGAÇÃO --- */}
      {usuarioLogado && (
        <div style={{ display: 'flex', background: modoEscuro ? '#2d3748' : 'white', padding: '0 30px', borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #e2e8f0', overflowX: 'auto' }}>          
          {(usuarioLogado.cargo === 'GERENTE' 
              ? ['caixa', 'clientes', 'financeiro', 'vendas', 'orcamentos', 'dashboard', 'entregas', 'equipe'] 
              : usuarioLogado.cargo === 'VENDEDOR'
                  ? ['caixa', 'clientes', 'vendas', 'orcamentos', 'entregas']
                  : ['entregas']
          ).map((menu) => (
            <button 
              key={menu}
              onClick={() => { 
                setAba(menu); 
                if(menu==='entregas') carregarEntregas(); 
                if(menu==='dashboard') carregarDashboard(); 
              }} 
              style={{
                padding: '20px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold',
                color: modoEscuro ? 'white' : '#4a5568', borderBottom: aba === menu ? '4px solid #2b6cb0' : 'none', whiteSpace: 'nowrap'
              }}
            >
              {menu === 'caixa' ? '🛒 CAIXA' : menu === 'clientes' ? '👥 CLIENTES' : menu === 'financeiro' ? '💲 FINANCEIRO' : menu === 'vendas' ? '📄 VENDAS' : menu === 'orcamentos' ? '📝 ORÇAMENTOS' : menu === 'dashboard' ? '📊 DASHBOARD' : menu === 'entregas'  ? '🚚 ENTREGAS' : '👥 EQUIPE'}
            </button>
          ))}
        </div>
      )}

      {/* --- CONTEÚDO PRINCIPAL (COM SCROLL ATIVADO) --- */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}> 
        
        {/* === ABA: CAIXA === */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', gap: 30, flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}>
            {/* COLUNA ESQUERDA: PRODUTOS */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '75vh' }}> 
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input type="number" min="1" value={qtdParaAdicionar} onChange={e => setQtdParaAdicionar(Number(e.target.value))} placeholder="Qtd" style={{ width: 80, padding: '15px', borderRadius: '10px', border: '1px solid #ddd', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }} />
                <input autoFocus type="text" placeholder="🔍 Digite o nome ou código..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ flex: 1, padding: '15px', fontSize: '1.2rem', borderRadius: '10px', border: '1px solid #ddd', outline: 'none' }} />
                <button
                  onClick={() => {
                    setProdutoEmEdicao(null);
                    setFormProduto({ nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral', ncm: '', cest: '', cfop: '5102', csosn: '102', origem: '0', fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '' });
                    setModalAberto(true);
                  }}
                  style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', width: '60px', fontSize: '24px', cursor: 'pointer' }}
                  title="Cadastrar Novo Produto"
                > + </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 5 }}>
                {busca === '' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6, color: '#888' }}>
                    <div style={{ fontSize: '80px', marginBottom: '20px' }}>🏪</div>
                    <h2>Vila Verde PDV</h2>
                    <p>Pesquise para vender.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {produtosFiltrados.map(produto => (
                      <div 
                        key={produto.id} 
                        onClick={() => adicionarAoCarrinho(produto)}
                        style={{
                          display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', cursor: 'pointer',
                          borderLeft: Number(produto.estoque) <= 0 ? '5px solid #e74c3c' : '5px solid #2ecc71', transition: 'transform 0.1s'
                        }}
                      >
                        <div style={{ width: '60px', height: '60px', backgroundColor: '#f4f6f8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '25px', marginRight: '15px' }}>📦</div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#2c3e50' }}>{produto.nome}</h3>
                          <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>Estoque: <strong>{produto.estoque}</strong> {produto.unidade}</div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#27ae60' }}>R$ {Number(produto.precoVenda).toFixed(2).replace('.', ',')}</div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={(e) => { e.stopPropagation(); setProdutoEmEdicao(produto); setFormProduto({ ...produto, precoCusto: String(produto.precoCusto), precoVenda: String(produto.precoVenda), estoque: String(produto.estoque), ncm: produto.ncm || '', cest: produto.cest || '', cfop: produto.cfop || '5102', csosn: produto.csosn || '102', origem: produto.origem || '0', unidade: produto.unidade || 'UN', fornecedor: produto.fornecedor || '', categoria: produto.categoria || '', localizacao: produto.localizacao || '', ipi: String(produto.ipi||''), icms: String(produto.icms||''), frete: String(produto.frete||'') } as any); setModalAberto(true); }} style={{ backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); excluirProduto(produto.id); }} style={{ backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: CARRINHO E PAGAMENTO */}
            <div style={{ width: 400, backgroundColor: modoEscuro ? '#2d3748' : 'white', borderRadius: 12, padding: 25, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 15px rgba(0,0,0,0.05)', color: modoEscuro ? 'white' : '#2d3748' }}>
              <h2 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #edf2f7', paddingBottom: 15 }}>🛒 Carrinho</h2>
              <div style={{ marginBottom: 15 }}>
                <label style={estiloLabel}>Cliente</label>
                {clienteSelecionado ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#e6fffa', border: '1px solid #b2f5ea', borderRadius: 8, color: '#285e61' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>👤</span>
                      <strong>{clientes.find(c => String(c.id) === String(clienteSelecionado))?.nome || 'Cliente'}</strong>
                    </div>
                    <button onClick={() => { setClienteSelecionado(''); setTermoCliente(''); }} style={{ background: 'transparent', border: 'none', color: '#e53e3e', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>Trocar ✖</button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input type="text" placeholder="🔍 Digite o nome do cliente..." value={termoCliente} onChange={e => setTermoCliente(e.target.value)} style={{ ...estiloInput, marginBottom: 0 }} />
                    {termoCliente.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: modoEscuro ? '#2d3748' : 'white', border: modoEscuro ? '1px solid #4a5568' : '1px solid #ccc', borderRadius: '0 0 8px 8px', maxHeight: '200px', overflowY: 'auto', zIndex: 100, color: modoEscuro ? 'white' : '#2d3748' }}>
                        {clientes.filter(c => c.nome.toLowerCase().includes(termoCliente.toLowerCase())).map(c => (
                            <div key={c.id} onClick={() => { setClienteSelecionado(String(c.id)); setTermoCliente(''); }} style={{ padding: '10px', borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #eee', cursor: 'pointer' }}>
                              <span>{c.nome}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {clienteObjSelecionado && Number(clienteObjSelecionado.saldoHaver) > 0 && (
                <div style={{ marginBottom: 15, padding: 10, backgroundColor: '#f0fff4', color: '#2f855a', borderRadius: 8 }}>💰 Haver Disponível: <b>R$ {Number(clienteObjSelecionado.saldoHaver).toFixed(2)}</b></div>
              )}
              
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #edf2f7', borderRadius: 8, padding: 10, marginBottom: 10, maxHeight: 200, minHeight: 100 }}>
                {carrinho.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div>{item.produto.nome} ({item.quantidade}x)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <b>R$ {(item.quantidade * Number(item.produto.precoVenda)).toFixed(2)}</b>
                      <button onClick={() => removerItemCarrinho(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: 0, color: modoEscuro ? '#fc8181' : 'inherit' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: 15, color: '#2d3748' }}>
                <span>Total</span><span>R$ {totalCarrinho.toFixed(2)}</span>
              </div>

              <div style={{ backgroundColor: modoEscuro ? '#1a202c' : '#f7fafc', padding: 15, borderRadius: 8, border: modoEscuro ? '1px solid #4a5568' : '1px solid #e2e8f0', marginBottom: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: faltaPagar > 0 ? '#e53e3e' : '#48bb78', fontWeight: 'bold' }}>
                  <span>Falta Pagar:</span><span>R$ {Math.max(0, faltaPagar).toFixed(2)}</span>
                </div>
                {troco > 0 && (<div style={{ marginTop: 10, padding: 10, backgroundColor: '#d4edda', color: '#155724', borderRadius: 5, textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>💰 TROCO: R$ {troco.toFixed(2)}</div>)}
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input type="number" placeholder="Valor" value={valorPagamentoInput} onChange={e => setValorPagamentoInput(e.target.value)} style={{ ...estiloInput, width: '100px', marginBottom: 0 }} />
                  <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} style={{ padding: 10, fontSize: 16, borderRadius: 5, flex: 1 }}>
                    <option value="Dinheiro">💵 Dinheiro</option><option value="Pix">💠 Pix</option><option value="Cartão Crédito">💳 Crédito</option><option value="Cartão Débito">💳 Débito</option><option value="A Prazo">📅 A Prazo</option><option value="Haver">🤝 Haver</option>
                  </select>
                  <button onClick={adicionarPagamento} disabled={faltaPagar <= 0.05} style={{ ...estiloBotao, background: faltaPagar <= 0.05 ? '#cbd5e0' : '#3182ce', color: 'white', padding: '0 15px' }}>+</button>
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  {listaPagamentos.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e0', padding: '4px 0' }}><span>{p.forma}: R$ {p.valor.toFixed(2)}</span><button onClick={() => setListaPagamentos(listaPagamentos.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', color: '#e53e3e', cursor: 'pointer' }}>✖</button></div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 15, background: '#f7fafc', padding: 10, borderRadius: 5, border: '1px solid #edf2f7' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 'bold', color: '#2d3748' }}>
                  <input type="checkbox" checked={entrega} onChange={(e) => setEntrega(e.target.checked)} style={{ transform: 'scale(1.5)' }} />🚛 É para entregar?
                </label>
                {entrega && (<input type="text" placeholder="Endereço..." value={endereco} onChange={(e) => setEndereco(e.target.value)} style={{ width: '100%', marginTop: 10, padding: 8, borderRadius: 4, border: '1px solid #cbd5e0', boxSizing: 'border-box' }} />)}
              </div>

              <button onClick={prepararNotaFiscal} style={{ width: '100%', marginBottom: 10, padding: 12, background: '#e67e22', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>📄 EMITIR NFC-e</button>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={salvarOrcamento} disabled={carrinho.length === 0} style={{ ...estiloBotao, flex: 1, backgroundColor: '#6b7280', color: 'white' }}>📝 ORÇAMENTO</button>
                <button onClick={() => finalizarVendaNoBanco()} disabled={carrinho.length === 0} style={{ ...estiloBotao, flex: 1, backgroundColor: '#22c55e', color: 'white' }}>✅ VENDER</button>
              </div>
            </div>
          </div>
        )}

        {/* === ABA: ORÇAMENTOS === */}
        {aba === 'orcamentos' && (
          <div style={{ backgroundColor: modoEscuro ? '#2d3748' : 'white', color: modoEscuro ? 'white' : '#2d3748', borderRadius: 12, padding: 30 }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#d69e2e' }}>📝 Orçamentos Salvos</h2>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left', color: modoEscuro ? '#cbd5e0' : '#718096', borderBottom: '2px solid #e2e8f0'}}>
                  <th style={{padding:15}}>ID</th>
                  <th style={{padding:15}}>Data</th>
                  <th style={{padding:15}}>Cliente</th>
                  <th style={{padding:15}}>Total</th>
                  <th style={{textAlign:'right', padding:15}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map(o => (
                  <tr key={o.id} style={{borderBottom: '1px solid #eee'}}>
                    <td style={{padding:15}}>#{o.id}</td>
                    <td style={{padding:15}}>{new Date(o.data).toLocaleDateString()}</td>
                    <td style={{padding:15}}><b>{o.cliente?.nome || 'Consumidor'}</b></td>
                    <td style={{padding:15}}>R$ {Number(o.total).toFixed(2)}</td>
                    <td style={{padding:15, textAlign:'right'}}>
                      <div style={{display:'flex', justifyContent:'flex-end', alignItems:'center', gap: 10}}>
                        <button onClick={() => efetivarOrcamento(o)} style={{ padding: '8px 12px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
                          Virar Venda 🛒
                        </button>
                        <button onClick={()=>reimprimirOrcamento(o)} title="Imprimir" style={{padding:'8px', background:'#718096', color:'white', border:'none', borderRadius:6, cursor:'pointer'}}>🖨️</button>
                        <button onClick={()=>excluirOrcamento(o.id)} title="Excluir" style={{padding:'8px', background:'#e53e3e', color:'white', border:'none', borderRadius:6, cursor:'pointer'}}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === ABA: CLIENTES === */}
        {aba === 'clientes' && (
          <div style={{ backgroundColor: modoEscuro ? '#2d3748' : 'white', color: modoEscuro ? 'white' : '#2d3748', borderRadius: 12, padding: 30 }}>
            <div style={{display:'flex',justifyContent:'space-between', marginBottom:20}}><h2>👥 Clientes</h2><button onClick={()=>{setModalClienteAberto(true);setClienteEmEdicao(null)}} style={{...estiloBotao,background:'#48bb78',color:'white'}}>+ Novo</button></div>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left', color: modoEscuro ? '#cbd5e0' : '#718096', borderBottom: '2px solid #e2e8f0'}}>
                  <th style={{padding:15}}>Nome</th>
                  <th style={{padding:15}}>CPF / Endereço</th>
                  <th style={{padding:15}}>Haver</th>
                  <th style={{textAlign:'right', padding:15}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} style={{borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #eee'}}>
                    <td style={{padding:15}}>
                      <div style={{fontWeight:'bold', fontSize:'1.05rem'}}>{c.nome}</div>
                      <div style={{fontSize:'0.85rem', color: modoEscuro ? '#a0aec0' : 'gray'}}>{c.celular}</div>
                    </td>
                    <td style={{padding:15}}>
                      <div>{c.cpfCnpj}</div>
                      <div style={{fontSize:'0.85rem', color: modoEscuro ? '#a0aec0' : 'gray'}}>{c.endereco}</div>
                    </td>
                    <td style={{padding:15}}>
                      {Number(c.saldoHaver) > 0 ? (
                        <span style={{fontWeight:'bold', color:'#2f855a', background:'#c6f6d5', padding:'4px 8px', borderRadius:6}}>
                          R$ {Number(c.saldoHaver).toFixed(2)}
                        </span>
                      ) : (
                        <span style={{color:'#a0aec0'}}>R$ 0.00</span>
                      )}
                    </td>
                    <td style={{padding:15, textAlign:'right'}}>
                      <div style={{display:'flex', justifyContent:'flex-end', gap: 5}}>
                        <button onClick={()=>gerarHaver(c)} title="Gerar Haver" style={{padding:'8px', background:'#38a169', color:'white', border:'none', borderRadius:6, cursor:'pointer'}}>💲</button> 
                        <button onClick={()=>verHistorico(c)} title="Ver Histórico" style={{padding:'8px', background:'#3182ce', color:'white', border:'none', borderRadius:6, cursor:'pointer'}}>📜</button> 
                        <button onClick={()=>{setClienteEmEdicao(c);setFormCliente({nome:c.nome,cpfCnpj:c.cpfCnpj||'',celular:c.celular||'',endereco:c.endereco||''});setModalClienteAberto(true)}} title="Editar" style={{padding:'8px', background:'#d69e2e', color:'white', border:'none', borderRadius:6, cursor:'pointer'}}>✏️</button> 
                        <button onClick={()=>excluirCliente(c.id)} title="Excluir" style={{padding:'8px', background:'#e53e3e', color:'white', border:'none', borderRadius:6, cursor:'pointer'}}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === ABA: FINANCEIRO === */}
        {aba === 'financeiro' && (
          <div style={{ backgroundColor: modoEscuro ? '#2d3748' : 'white', color: modoEscuro ? 'white' : '#2d3748', borderRadius: 12, padding: 30 }}>
            <h2>💲 A Receber</h2>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead><tr style={{textAlign:'left'}}><th style={{padding:15}}>Cliente</th><th style={{padding:15}}>Vencimento</th><th style={{padding:15}}>Valor</th><th>Status</th><th>Ação</th></tr></thead>
              <tbody>
                {contasReceber.map((conta: any) => (
                  <tr key={conta.id} style={{ borderBottom: '1px solid #ccc' }}>
                    <td style={{ padding: 10 }}>{conta.cliente?.nome}</td><td>{new Date(conta.dataVencimento).toLocaleDateString()}</td><td style={{ fontWeight: 'bold', color: '#c53030' }}>R$ {Number(conta.valor).toFixed(2)}</td><td>{conta.status}</td>
                    <td>{conta.status === 'PENDENTE' && (<button onClick={() => receberConta(conta.id)} style={{ padding: '5px 10px', background: '#28a745', color: 'white', border: 'none' }}>Receber</button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === ABA: VENDAS === */}
        {aba === 'vendas' && (
          <div style={{ backgroundColor: modoEscuro ? '#2d3748' : 'white', color: modoEscuro ? 'white' : '#2d3748', borderRadius: 12, padding: 30 }}>
            <h2>📜 Histórico de Vendas</h2>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left', color: modoEscuro ? '#cbd5e0' : '#718096', borderBottom: '2px solid #e2e8f0'}}>
                  <th style={{padding:15}}>ID</th>
                  <th style={{padding:15}}>Data</th>
                  <th style={{padding:15}}>Cliente</th>
                  <th style={{padding:15}}>Total</th>
                  <th style={{textAlign:'right', padding:15}}>Opções</th>
                </tr>
              </thead>
              <tbody>
                {vendasRealizadas.map((v: any) => (
                  <tr key={v.id} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:15, fontWeight:'bold'}}>#{v.id}</td>
                    <td style={{padding:15}}>{new Date(v.data).toLocaleString()}</td>
                    <td style={{padding:15}}>
                      <div>{v.cliente?.nome || 'Consumidor'}</div>
                      <small style={{color:'#718096'}}>{v.pagamentos?.map((p: any) => p.forma).join(', ')}</small>
                    </td>
                    <td style={{padding:15, fontWeight:'bold', color: modoEscuro ? '#68d391' : '#2f855a'}}>
                      R$ {Number(v.total).toFixed(2)}
                    </td>
                    {/* === CÓDIGO ATUALIZADO DOS BOTÕES DE AÇÃO === */}
                    <td style={{padding:15, textAlign:'right'}}>
                      <div style={{display:'flex', justifyContent:'flex-end', gap: 8}}>
                        
                        {/* 1. Botão VER NOTA (Só se tiver link) */}
                        {v.urlFiscal && (
                          <button 
                            onClick={() => window.open(v.urlFiscal, '_blank')} 
                            title="Ver Nota Fiscal (PDF)" 
                            style={{padding:'6px 12px', background:'#e67e22', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:'1.1rem'}}
                          >
                            📄
                          </button>
                        )}

                        {/* 2. Botão CANCELAR NOTA (Novo! Só aparece se tem nota e não foi cancelada) */}
                        {v.nota_emitida && !v.nota_cancelada && (
                          <button 
                            onClick={() => cancelarNotaFiscal(v.id)} 
                            title="CANCELAR NFC-e NA RECEITA" 
                            style={{padding:'6px 12px', background:'#c53030', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:'1.1rem', fontWeight:'bold'}}
                          >
                            🚫 NFC-e
                          </button>
                        )}

                        {/* 3. Aviso Visual se já foi cancelada */}
                        {v.nota_cancelada && (
                          <span style={{padding:'6px', color:'#c53030', fontWeight:'bold', border:'1px solid #c53030', borderRadius:6, fontSize:'0.8rem'}}>
                            CANCELADA
                          </span>
                        )}

                        {/* 4. Botão Imprimir Recibo Simples (Não Fiscal) */}
                        <button onClick={() => reimprimirVenda(v)} title="Imprimir Recibo Interno" style={{padding:'6px 12px', background:'#718096', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:'1.1rem'}}>🖨️</button> 
                        
                        {/* 5. Botão WhatsApp */}
                        <button onClick={() => enviarZap(v)} title="Enviar no Zap" style={{padding:'6px 12px', background:'#25D366', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:'1.1rem'}}>📱</button> 
                        
                        {/* 6. Botão Excluir do Sistema (Só gerente, apaga do banco) */}
                        {!v.nota_emitida && (
                           <button onClick={() => tentarCancelarVenda(v.id)} title="Excluir Venda (Interno)" style={{padding:'6px 12px', background:'#e53e3e', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontSize:'1.1rem'}}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === ABA: ENTREGAS === */}
        {aba === 'entregas' && (
          <div style={{ padding: 20 }}>
            <h2>🚚 Entregas Pendentes</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {listaEntregas.map((entrega: any) => (
                <div key={entrega.id} style={{ background: modoEscuro ? '#2d3748' : 'white', padding: 20, borderRadius: 10, color: modoEscuro ? 'white' : '#2d3748', borderLeft: '5px solid #ecc94b' }}>
                  <h3>#{entrega.id} - {entrega.cliente?.nome}</h3>
                  <p>📍 {entrega.enderecoEntrega}</p>
                  <ul>{entrega.itens.map((item: any) => <li key={item.id}>{item.quantidade}x {item.produto.nome}</li>)}</ul>
                  <button onClick={() => baixarEntrega(entrega.id)} style={{ width: '100%', padding: 10, background: '#48bb78', color: 'white', border: 'none' }}>✅ ENTREGUE</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === ABA: DASHBOARD === */}
        {aba === 'dashboard' && dashboard && (
          <div style={{ padding: 20 }}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h2 style={{margin:0}}>📊 Visão Geral do Negócio</h2>
                <button 
                  onClick={() => {
                    // Lógica para baixar Excel
                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.json_to_sheet(vendasRealizadas.map(v => ({
                        ID: v.id,
                        Data: new Date(v.data).toLocaleDateString(),
                        Cliente: v.cliente?.nome || 'Consumidor',
                        Total: Number(v.total),
                        Pagamento: v.pagamentos.map(p => p.forma).join(', '),
                        Nota_Emitida: v.nota_emitida ? 'SIM' : 'NÃO'
                    })));
                    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
                    XLSX.writeFile(wb, "Relatorio_Vendas_VilaVerde.xlsx");
                  }}
                  style={{...estiloBotao, background:'#2f855a', color:'white'}}
                >
                  📥 Baixar Relatório Excel
                </button>
             </div>

             {/* CARDS DE RESUMO */}
             <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: 20, marginBottom: 30 }}>
               <div style={{ background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)', padding: 20, borderRadius: 12, color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                 <div style={{fontSize:14, opacity:0.9}}>VENDAS HOJE</div>
                 <div style={{fontSize:28, fontWeight:'bold'}}>R$ {dashboard.totalHoje.toFixed(2)}</div>
               </div>
               <div style={{ background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)', padding: 20, borderRadius: 12, color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                 <div style={{fontSize:14, opacity:0.9}}>VENDAS MÊS</div>
                 <div style={{fontSize:28, fontWeight:'bold'}}>R$ {dashboard.totalMes.toFixed(2)}</div>
               </div>
               <div style={{ background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)', padding: 20, borderRadius: 12, color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                 <div style={{fontSize:14, opacity:0.9}}>TICKET MÉDIO</div>
                 <div style={{fontSize:28, fontWeight:'bold'}}>
                    R$ {(vendasRealizadas.length > 0 ? (vendasRealizadas.reduce((a,b)=>a+Number(b.total),0) / vendasRealizadas.length) : 0).toFixed(2)}
                 </div>
               </div>
               <div style={{ background: 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)', padding: 20, borderRadius: 12, color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                 <div style={{fontSize:14, opacity:0.9}}>TOTAL DE PEDIDOS</div>
                 <div style={{fontSize:28, fontWeight:'bold'}}>{vendasRealizadas.length}</div>
               </div>
             </div>

             {/* GRÁFICOS (Recharts) */}
             <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 20 }}>
                
                {/* GRÁFICO 1: VENDAS POR FORMA DE PAGAMENTO */}
                <div style={{ background: modoEscuro ? '#2d3748' : 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                   <h3 style={{marginTop:0, color:'#718096'}}>💰 Formas de Pagamento</h3>
                   <div style={{ height: 300, width: '100%' }}>
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie
                           data={[
                             { name: 'Dinheiro', value: vendasRealizadas.filter(v => v.pagamentos.some(p => p.forma === 'Dinheiro')).length },
                             { name: 'Pix', value: vendasRealizadas.filter(v => v.pagamentos.some(p => p.forma === 'Pix')).length },
                             { name: 'Cartão', value: vendasRealizadas.filter(v => v.pagamentos.some(p => p.forma.includes('Cartão'))).length },
                             { name: 'Haver', value: vendasRealizadas.filter(v => v.pagamentos.some(p => p.forma === 'Haver')).length },
                           ]}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           fill="#8884d8"
                           paddingAngle={5}
                           dataKey="value"
                           label
                         >
                           <Cell key="cell-0" fill="#48bb78" /> {/* Dinheiro - Verde */}
                           <Cell key="cell-1" fill="#3182ce" /> {/* Pix - Azul */}
                           <Cell key="cell-2" fill="#ed8936" /> {/* Cartão - Laranja */}
                           <Cell key="cell-3" fill="#805ad5" /> {/* Haver - Roxo */}
                         </Pie>
                         <Tooltip />
                         <Legend />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* LISTA: PRODUTOS MAIS VENDIDOS (Simples, sem gráfico pesado) */}
                <div style={{ background: modoEscuro ? '#2d3748' : 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowY:'auto', maxHeight: 360 }}>
                   <h3 style={{marginTop:0, color:'#718096'}}>🏆 Top Produtos</h3>
                   <table style={{width:'100%', borderCollapse:'collapse'}}>
                      <tbody>
                        {produtos
                          .map(p => ({
                             ...p, 
                             totalVendido: vendasRealizadas.reduce((acc, v) => acc + v.itens.filter(i => i.produto.id === p.id).reduce((a,i)=>a+Number(i.quantidade),0), 0)
                          }))
                          .sort((a,b) => b.totalVendido - a.totalVendido)
                          .slice(0, 5) // Pega só os top 5
                          .map((p, i) => (
                            <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                               <td style={{padding:10, fontWeight:'bold', color:'#718096'}}>#{i+1}</td>
                               <td style={{padding:10}}>{p.nome}</td>
                               <td style={{padding:10, fontWeight:'bold', color: modoEscuro ? '#68d391' : '#2f855a'}}>{p.totalVendido} un</td>
                            </tr>
                        ))}
                      </tbody>
                   </table>
                </div>

             </div>
          </div>
        )}

        {/* === ABA: EQUIPE === */}
        {aba === 'equipe' && <TelaEquipe />}

      </div> {/* FIM DO CONTEÚDO PRINCIPAL */}

      {/* =====================================================================
          MODAIS GLOBAIS (ESTÃO AQUI PARA EVITAR ERROS DE LAYOUT)
      ===================================================================== */}
      
      {/* 1. MODAL PRODUTO (RESTAURADO - DESIGN ORIGINAL) */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#f9fafb', padding: 30, borderRadius: 15, width: 800, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e2e8f0' }}>
            <h2 style={{marginTop: 0, color: '#2d3748', borderBottom: '1px solid #cbd5e0', paddingBottom: 10}}>
              {produtoEmEdicao ? '✏️ Editar Produto' : '✨ Novo Produto'}
            </h2>
            
            <form onSubmit={salvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              
              {/* LINHA 1: NOME E CÓDIGO */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 15 }}>
                <div>
                  <label style={estiloLabel}>Nome do Produto</label>
                  <input value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})} style={estiloInput} required />
                </div>
                <div>
                  <label style={estiloLabel}>Código Barras</label>
                  <input value={formProduto.codigoBarra} onChange={e => setFormProduto({...formProduto, codigoBarra: e.target.value})} style={estiloInput} />
                </div>
              </div>

              {/* LINHA 2: PREÇOS E ESTOQUE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 15 }}>
                 <div>
                    <label style={estiloLabel}>Preço Custo</label>
                    <input type="number" step="0.01" value={formProduto.precoCusto} onChange={e => setFormProduto({...formProduto, precoCusto: e.target.value})} style={estiloInput} />
                 </div>
                 <div>
                    <label style={estiloLabel}>Preço Venda</label>
                    <input type="number" step="0.01" value={formProduto.precoVenda} onChange={e => setFormProduto({...formProduto, precoVenda: e.target.value})} style={estiloInput} required />
                 </div>
                 <div>
                    <label style={estiloLabel}>Estoque</label>
                    <input type="number" value={formProduto.estoque} onChange={e => setFormProduto({...formProduto, estoque: e.target.value})} style={estiloInput} required />
                 </div>
                 <div>
                    <label style={estiloLabel}>Unidade</label>
                    <select value={formProduto.unidade} onChange={e => setFormProduto({...formProduto, unidade: e.target.value})} style={{...estiloInput, height: 45}}>
                       <option value="UN">UN</option><option value="KG">KG</option><option value="LT">LT</option><option value="CX">CX</option><option value="M">M</option><option value="M2">M²</option>
                    </select>
                 </div>
              </div>

              {/* LINHA 3: CATEGORIA, FORNECEDOR, LOCALIZAÇÃO */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15 }}>
                 <div>
                    <label style={estiloLabel}>Categoria</label>
                    <input value={formProduto.categoria} onChange={e => setFormProduto({...formProduto, categoria: e.target.value})} style={estiloInput} />
                 </div>
                 <div>
                    <label style={estiloLabel}>Fornecedor</label>
                    <input value={formProduto.fornecedor} onChange={e => setFormProduto({...formProduto, fornecedor: e.target.value})} style={estiloInput} />
                 </div>
                 <div>
                    <label style={estiloLabel}>Localização</label>
                    <input value={formProduto.localizacao} onChange={e => setFormProduto({...formProduto, localizacao: e.target.value})} style={estiloInput} />
                 </div>
              </div>

              {/* LINHA 4: DADOS FISCAIS */}
              <div style={{ marginTop: 10, border: '1px solid #cbd5e0', padding: 15, borderRadius: 8, backgroundColor: '#fff' }}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}>
                   <strong style={{color:'#4a5568'}}>🏛️ Dados Fiscais (NFC-e)</strong>
                   <button type="button" onClick={() => setModoFiscal(!modoFiscal)} style={{background:'none', border:'none', cursor:'pointer', color:'#2b6cb0'}}>{modoFiscal ? '🙈 Esconder' : '👁️ Mostrar'}</button>
                </div>
                
                {modoFiscal && (
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                      <div>
                         <label style={estiloLabel}>NCM (Obrigatório)</label>
                         <input value={formProduto.ncm} onChange={e => setFormProduto({...formProduto, ncm: e.target.value})} style={estiloInput} />
                      </div>
                      <div>
                         <label style={estiloLabel}>CEST</label>
                         <input value={formProduto.cest} onChange={e => setFormProduto({...formProduto, cest: e.target.value})} style={estiloInput} />
                      </div>
                      <div>
                         <label style={estiloLabel}>CFOP</label>
                         <input value={formProduto.cfop} onChange={e => setFormProduto({...formProduto, cfop: e.target.value})} style={estiloInput} />
                      </div>
                      <div>
                         <label style={estiloLabel}>CSOSN (Imposto)</label>
                         <select value={formProduto.csosn} onChange={e => setFormProduto({...formProduto, csosn: e.target.value})} style={{...estiloInput, height: 45}}>
                            <option value="102">102 - Tributado</option>
                            <option value="500">500 - Subst. Tributária</option>
                         </select>
                      </div>
                      <div style={{gridColumn: '1 / span 2'}}>
                         <label style={estiloLabel}>Origem</label>
                         <select value={formProduto.origem} onChange={e => setFormProduto({...formProduto, origem: e.target.value})} style={{...estiloInput, height: 45}}>
                            <option value="0">0 - Nacional</option><option value="1">1 - Importada</option>
                         </select>
                      </div>
                   </div>
                )}
              </div>

              <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop: 10}}>
                <button type="button" onClick={() => setModalAberto(false)} style={{...estiloBotao, background: '#cbd5e0', color: '#4a5568'}}>Cancelar</button>
                <button type="submit" style={{...estiloBotao, background: '#48bb78', color: 'white'}}>Salvar Produto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL CLIENTE (RESTAURADO) */}
      {modalClienteAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 450 }}>
            <h2 style={{marginTop:0, marginBottom:20, color:'#2d3748'}}>{clienteEmEdicao ? '✏️ Editar Cliente' : '👤 Novo Cliente'}</h2>
            <form onSubmit={salvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={estiloLabel}>Nome Completo</label>
                <input value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} style={estiloInput} required />
              </div>
              <div>
                <label style={estiloLabel}>CPF / CNPJ</label>
                <input value={formCliente.cpfCnpj} onChange={e => setFormCliente({...formCliente, cpfCnpj: e.target.value})} style={estiloInput} />
              </div>
              <div>
                <label style={estiloLabel}>Celular / WhatsApp</label>
                <input value={formCliente.celular} onChange={e => setFormCliente({...formCliente, celular: e.target.value})} style={estiloInput} />
              </div>
              <div>
                <label style={estiloLabel}>Endereço</label>
                <input value={formCliente.endereco} onChange={e => setFormCliente({...formCliente, endereco: e.target.value})} style={estiloInput} />
              </div>
              <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:10}}>
                <button type="button" onClick={() => setModalClienteAberto(false)} style={{...estiloBotao, background: '#cbd5e0', color: '#4a5568'}}>Cancelar</button>
                <button type="submit" style={{...estiloBotao, background: '#48bb78', color: 'white'}}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL HISTÓRICO CLIENTE */}
      {modalHistoricoCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 600, maxHeight: '80vh', overflowY: 'auto' }}>
            <h3>Histórico: {clienteDoHistorico?.nome}</h3>
            {historicoCliente.map((v: any) => (
               <div key={v.id} style={{borderBottom:'1px solid #ccc', padding:10}}>
                  Data: {new Date(v.data).toLocaleDateString()} - R$ {Number(v.total).toFixed(2)}
               </div>
            ))}
            <button onClick={() => setModalHistoricoCliente(false)}>Fechar</button>
          </div>
        </div>
      )}

      {/* 4. MODAL AUTORIZAÇÃO */}
      {modalAutorizacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 10, width: 350, textAlign: 'center' }}>
            <h3>Autorização Necessária</h3>
            <input type="password" placeholder="Senha Gerente" value={senhaGerente} onChange={e => setSenhaGerente(e.target.value)} style={{...estiloInput, marginBottom: 15}} />
            <button onClick={validarAutorizacao} style={{...estiloBotao, background:'#c53030', color:'white', width:'100%'}}>CONFIRMAR</button>
            <button onClick={() => setModalAutorizacao(false)} style={{marginTop:10, border:'none', background:'none'}}>Voltar</button>
          </div>
        </div>
      )}

      {/* 5. MODAL MOVIMENTAÇÃO */}
      {modalMovimentacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: 'white', padding: 25, borderRadius: 10, width: 400, textAlign: 'center' }}>
             <h2 style={{color: tipoMovimentacao === 'SANGRIA' ? '#e53e3e' : '#48bb78'}}>{tipoMovimentacao}</h2>
             <input type="number" value={valorMovimentacao} onChange={e => setValorMovimentacao(e.target.value)} placeholder="Valor R$" style={estiloInput} />
             <input type="text" value={descMovimentacao} onChange={e => setDescMovimentacao(e.target.value)} placeholder="Motivo" style={estiloInput} />
             <button onClick={salvarMovimentacao} style={{...estiloBotao, background: tipoMovimentacao === 'SANGRIA' ? '#e53e3e' : '#48bb78', color:'white', width:'100%'}}>CONFIRMAR</button>
             <button onClick={() => setModalMovimentacao(false)} style={{marginTop:10, border:'none', background:'none'}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* 6. MODAL GERENCIAR CAIXA (Onde aparece o Histórico) */}
      {modalCaixaVisivel && caixa && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 12, width: 500, maxHeight:'90vh', overflowY:'auto', textAlign: 'center' }}>
            <h2>Gerenciar Caixa</h2>
            <h3>Saldo: R$ {caixa.saldoAtual.toFixed(2)}</h3>
            
            <h4 style={{textAlign:'left', marginTop:20}}>Histórico Recente</h4>
            <table style={{width:'100%', fontSize:12, textAlign:'left'}}>
              <thead><tr><th>Hora</th><th>Tipo</th><th>Valor</th></tr></thead>
              <tbody>
                {historicoCaixas.slice(0,5).map((h:any) => (
                  <tr key={h.id}>
                    <td>{new Date(h.dataAbertura).toLocaleTimeString()}</td>
                    <td>{h.status}</td>
                    <td>R$ {h.saldoAtual?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={fecharCaixa} style={{...estiloBotao, background:'#ef4444', color:'white', width:'100%', marginTop:20}}>FECHAR CAIXA</button>
            <button onClick={() => setModalCaixaVisivel(false)} style={{marginTop: 15, background: 'transparent', border: 'none'}}>Voltar</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;