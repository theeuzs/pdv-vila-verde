import { useState, useEffect, useMemo } from 'react'
import { TelaLogin } from './TelaLogin';
import { TelaEquipe } from './TelaEquipe';

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

// Tipo para suportar múltiplos pagamentos na mesma venda
interface PagamentoVenda {
  forma: string
  valor: number
}

interface Venda {
  id: number
  data: string
  total: string
  cliente?: Cliente
  // Lista de pagamentos realizados nessa venda
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
  
// --- ESTADOS DO CAIXA (Cole logo no início da função App) ---
  const [caixaAberto, setCaixaAberto] = useState<any>(null);
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [valorAbertura, setValorAbertura] = useState("");
  const [dashboard, setDashboard] = useState<any>(null);
  const [termoCliente, setTermoCliente] = useState('');
  // Estados para autorização de gerente
  const [modalAutorizacao, setModalAutorizacao] = useState(false);
  const [senhaGerente, setSenhaGerente] = useState('');
  const [idVendaParaCancelar, setIdVendaParaCancelar] = useState<number | null>(null);
  // ... outros useStates ...
  const [entrega, setEntrega] = useState(false);
  const [endereco, setEndereco] = useState('');
  // --- DETECTOR DE CELULAR ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);  
  // Estado para controlar o tema
  const [modoEscuro, setModoEscuro] = useState(false);
  // Estado para controlar a quantidade da próxima adição
  const [qtdParaAdicionar, setQtdParaAdicionar] = useState(1);
  // --- NOVOS ESTADOS PARA SANGRIA/SUPRIMENTO ---
  const [modalMovimentacao, setModalMovimentacao] = useState(false);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA');
  const [valorMovimentacao, setValorMovimentacao] = useState('');
  const [descMovimentacao, setDescMovimentacao] = useState('');
  // Estado para guardar os dados da sangria enquanto pede a senha
  const [sangriaPendente, setSangriaPendente] = useState<{valor: number, motivo: string} | null>(null);
  const [historicoCaixas, setHistoricoCaixas] = useState<any[]>([]);
  const [vendoHistorico, setVendoHistorico] = useState(false);

  // --- FUNÇÃO 1: SALVAR BACKUP (SEGURANÇA TOTAL) ---
  const salvarBackup = () => {
    const dadosBackup = {
      data_backup: new Date(),
      produtos: produtosFiltrados,
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
    
    alert(`✅ Backup salvo na sua pasta de Downloads!\nNome: ${nomeArquivo}\nGuarde esse arquivo com carinho!`);
  };

  // --- FUNÇÃO 2: REGISTRAR MOVIMENTAÇÃO (COM SEGURANÇA 👮‍♂️) ---
  const salvarMovimentacao = () => {
    if (!valorMovimentacao || Number(valorMovimentacao) <= 0) return alert("Digite um valor válido!");
    
    const valor = Number(valorMovimentacao);

    // REGRA DE OURO: Se for SANGRIA e não for GERENTE, pede senha!
    if (tipoMovimentacao === 'SANGRIA' && usuarioLogado.cargo !== 'GERENTE') {
      // 1. Guarda os dados pra usar depois da senha
      setSangriaPendente({ valor, motivo: descMovimentacao });
      // 2. Fecha o modal da Sangria
      setModalMovimentacao(false);
      // 3. Abre o modal da Senha
      setModalAutorizacao(true);
      return; // Para tudo por aqui e espera a senha
    }
    
    // Se chegou aqui, é porque é Gerente OU é Suprimento (que não precisa de senha)
    executarMovimentacao(valor, descMovimentacao, tipoMovimentacao);
  };

  // Função auxiliar que faz a conta (chamada direto ou após a senha)
  // Função que salva no banco e atualiza a tela
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
        
        // Atualiza a tela com o valor que veio do banco (garantia de sincronia)
        setCaixaAberto({ ...caixaAberto, saldoAtual: caixaAtualizado.saldoAtual });
        
        // Limpa os campos
        setModalMovimentacao(false);
        setValorMovimentacao('');
        setDescMovimentacao('');
        setSangriaPendente(null);

        console.log(`MOVIMENTAÇÃO SALVA: ${tipo} de R$ ${valor}`);
        alert(`✅ ${tipo} realizada com sucesso!`);
      } else {
        alert("Erro ao salvar movimentação no sistema.");
      }
    } catch (error) {
      alert("Erro de conexão com o servidor.");
    }
  };

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // --- CONTROLE DE ACESSO ---
  // Pode ser 'admin' (você), 'motorista', ou null (ninguém logado ainda)
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);

  // --- CONTROLE DE ENTREGAS ---
  const [listaEntregas, setListaEntregas] = useState<any[]>([]);

  // --- REDIRECIONAMENTO INTELIGENTE ---
  // Se for motorista, joga direto pra tela de entregas e sai do caixa
  useEffect(() => {
    if (usuarioLogado?.cargo === 'MOTORISTA') {
      setAba('entregas');
      carregarEntregas();
    }
  }, [usuarioLogado]);

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
        setVendoHistorico(true); // Abre a janela
      } else {
        alert("Erro ao buscar histórico.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  }

  async function baixarEntrega(id: number) {
    if (!confirm("Confirmar que a entrega foi realizada?")) return;
    
    try {
      await fetch(`${API_URL}/entregas/${id}/concluir`, { method: 'PATCH' });
      alert("Entrega confirmada! ✅");
      carregarEntregas(); // Atualiza a lista na hora
    } catch (error) {
      alert("Erro ao baixar entrega.");
    }
  }

  // --- FUNÇÃO 1: Verificar se o caixa está aberto ---
  async function verificarStatusCaixa() {
    try {
      const res = await fetch(`${API_URL}/caixa/status`);
      const dados = await res.json();
      // 👇 TROQUE O IF ANTIGO POR ESTE 👇
      if (dados && dados.status === 'ABERTO') {
        setCaixaAberto(dados);
      } else {
        setCaixaAberto(null);
      }
    } catch (error) {
      console.error("Erro ao verificar caixa:", error);
    }
  }

  // --- FUNÇÃO 2: Abrir o Caixa ---
  async function abrirCaixa() {
    if (!valorAbertura) return alert("Digite o valor de troco inicial!");

    try {
      const res = await fetch(`${API_URL}/caixa/abrir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldoInicial: Number(valorAbertura.replace(',', '.')) })
      });

      if (res.ok) {
        alert("Caixa ABERTO com sucesso! Boas vendas. 🚀");
        setModalAbrirCaixa(false);
        verificarStatusCaixa(); // Atualiza a barra para Verde
      } else {
        alert("Erro ao abrir caixa.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  }

// Função para Fechar o Caixa
  const fecharCaixa = async () => {
    if (!caixaAberto) return;

    // Pergunta de segurança
    const confirmacao = window.confirm(
      `Deseja realmente FECHAR o caixa?\n\nSaldo Final: R$ ${Number(caixaAberto.saldoAtual).toFixed(2)}`
    );

    if (!confirmacao) return;

    try {
      const res = await fetch(`${API_URL}/caixa/fechar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caixaId: caixaAberto.id })
      });

      if (res.ok) {
        alert("🔒 Caixa fechado com sucesso!");
        setCaixaAberto(null); // Isso faz a tela voltar para "Abrir Caixa"
        // Se tiver carrinho ou pagamentos pendentes, é bom limpar também:
        setCarrinho([]);
        setListaPagamentos([]);
      } else {
        alert("Erro ao fechar o caixa.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  };

  // ==========================================================================
  // 3. ESTADOS (STATES)
  // ==========================================================================
  
  // Navegação entre Abas
  const [aba, setAba] = useState<string>('caixa');

  // Listas de Dados
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])

  // Caixa e Carrinho
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('') 
  const [clienteSelecionado, setClienteSelecionado] = useState('') 
  // Adicione junto com os outros estados
  const [troco, setTroco] = useState(0);
  
  // --- OTIMIZAÇÃO DE PERFORMANCE 🚀 ---
  // Isso aqui garante que só calculamos a lista quando necessário
  // e mostramos no máximo 30 itens para não travar o PC.
  const produtosFiltrados = useMemo(() => {
    if (!busca) return []; // Se não tem busca, não retorna nada (tela limpa)

    const termo = busca.toLowerCase();
    
    return produtos
      .filter(p => 
        p.nome.toLowerCase().includes(termo) || 
        (p.codigoBarra && p.codigoBarra.includes(termo))
      )
      .slice(0, 30); // <--- O SEGREDO ESTÁ AQUI! (Pega só os 30 primeiros)
  }, [busca, produtos]);
  
  // Sistema de Pagamento Misto
  const [listaPagamentos, setListaPagamentos] = useState<PagamentoVenda[]>([])
  const [valorPagamentoInput, setValorPagamentoInput] = useState('')
  const [formaPagamentoInput, setFormaPagamentoInput] = useState('DINHEIRO')
  // MONITOR DE LIMPEZA: Se o carrinho esvaziar, zera o financeiro
  useEffect(() => {
    if (carrinho.length === 0) {
      setTroco(0);            // Zera o troco visual
      setListaPagamentos([]); // Remove pagamentos antigos para não dar erro na próxima venda
    }
  }, [carrinho]); // Esse comando roda toda vez que o "carrinho" mudar

  // Controle dos Modais (Janelas)
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null)
  
  const [modalHistoricoCliente, setModalHistoricoCliente] = useState(false)
  const [historicoCliente, setHistoricoCliente] = useState<Venda[]>([])
  const [clienteDoHistorico, setClienteDoHistorico] = useState<Cliente | null>(null)

  // Formulários de Cadastro
  const [formProduto, setFormProduto] = useState({
    nome: '', 
    codigoBarra: '', 
    precoCusto: '', 
    precoVenda: '', 
    estoque: '', 
    unidade: 'UN',       // Padrão UN
    categoria: 'Geral',
    fornecedor: '', 
    localizacao: '', 
    ipi: '', 
    icms: '', 
    frete: '', 
    ncm: '', 
    cest: '', 
    cfop: '5102',        // Padrão Venda
    csosn: '102',        // Padrão Simples Nacional (Novo)
    origem: '0'          // Padrão Nacional (Novo)
  });

  // 👇 ADICIONE ESTA LINHA NOVA (Define se mostra os campos fiscais)
  const [modoFiscal, setModoFiscal] = useState(true);
  
  const [formCliente, setFormCliente] = useState({ 
    nome: '', cpfCnpj: '', celular: '', endereco: '' 
  })

  // ==========================================================================
  // 4. FUNÇÕES DE LOGIN E CARREGAMENTO
  // ==========================================================================

async function carregarDashboard() {
    try {
      const res = await fetch(`${API_URL}/dashboard`);
      const dados = await res.json();
      setDashboard(dados);
    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    }
  }

  // E adicione isso dentro do useEffect inicial (aquele lá da linha 130+-)
  useEffect(() => {
    carregarDados();
    carregarDashboard(); // <--- ADICIONE AQUI
    verificarStatusCaixa();
  }, []);

  async function carregarDados() {
    try {
      const [resProd, resVend, resCli, resConta, resOrc] = await Promise.all([
        fetch(`${API_URL}/produtos`),
        fetch(`${API_URL}/vendas`),
        fetch(`${API_URL}/clientes`),
        fetch(`${API_URL}/contas-receber`),
        fetch(`${API_URL}/orcamentos`)
      ])
      // Dentro da função carregarDados()
const resContas = await fetch(`${API_URL}/contas-receber`);
setContasReceber(await resContas.json());
      
      setProdutos(await resProd.json())
      setVendasRealizadas(await resVend.json())
      setClientes(await resCli.json())
      setContasReceber(await resConta.json())
      setOrcamentos(await resOrc.json())
    } catch (e) {
      console.error("Erro ao carregar dados:", e)
    }
  }

  // --- CARREGAMENTO INICIAL E ATUALIZAÇÃO AUTOMÁTICA ---
  useEffect(() => {
    // 1. Carrega tudo assim que abre a tela
    carregarDados();
    verificarStatusCaixa(); // Garante que a barra do caixa apareça

    // 2. Configura o "Robô" para atualizar tudo a cada 5 segundos
    const relogio = setInterval(() => {
      // Chama a função principal que atualiza TUDO (Produtos, Clientes, Vendas)
      carregarDados(); 
      
      // Se estiver na tela de entregas, atualiza elas também
      if (aba === 'entregas') {
        carregarEntregas();
      }
    }, 5000); // 5000 milissegundos = 5 segundos

    // 3. Limpeza (Desliga o robô ao fechar)
    return () => clearInterval(relogio);
  }, [aba]);

  // ==========================================================================
  // 5. FUNÇÕES DE ORÇAMENTO
  // ==========================================================================

  async function salvarOrcamento() {
    if (carrinho.length === 0) return

    try {
      const res = await fetch(`${API_URL}/orcamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itens: carrinho.map(i => ({ 
            produtoId: i.produto.id, 
            quantidade: i.quantidade 
            
          })), 
          clienteId: clienteSelecionado || null 
        })
      })

      if (res.ok) {
        const orc = await res.json()
        const nome = clientes.find(c => c.id === Number(clienteSelecionado))?.nome || 'Consumidor'
        
        // Imprime como Orçamento
imprimirCupom({
          id: orc.id,
          data: new Date(),
          cliente: { nome: nome || 'Consumidor' },
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

  // --- TRANSFORMAR ORÇAMENTO EM VENDA ---
  function efetivarOrcamento(orc: any) {
    // 1. Segurança: Se já tiver coisa no carrinho, avisa
    if (carrinho.length > 0) {
      if (!confirm("Seu carrinho atual será limpo para carregar este orçamento. Continuar?")) return;
    }

    // 2. Mágica: Converte os itens do orçamento para o formato do carrinho
    // Importante: Estamos assumindo que o produto ainda existe no banco
    const itensDoOrcamento = orc.itens.map((item: any) => ({
      produto: item.produto, // O objeto produto completo que veio do banco
      quantidade: Number(item.quantidade)
    }));

    // 3. Atualiza o estado do sistema
    setCarrinho(itensDoOrcamento);
    setClienteSelecionado(orc.clienteId ? String(orc.clienteId) : ""); // Já seleciona o cliente do orçamento
    
    // 4. Leva o usuário para a tela de vendas
    setAba('caixa'); 

    alert("Orçamento carregado no caixa! 🛒\nConfira se o estoque ainda está disponível e finalize a venda.");
  }

  async function excluirOrcamento(id: number) {
    if(!confirm("Tem certeza que deseja excluir este orçamento?")) return
    await fetch(`${API_URL}/orcamentos/${id}`, { method: 'DELETE' })
    carregarDados()
  }

  // ==========================================================================
  // 6. FUNÇÕES DO CAIXA E PAGAMENTO
  // ==========================================================================

  function adicionarAoCarrinho(p: Produto) {
    if (Number(p.estoque) <= 0) {
      alert("Produto sem estoque!");
      return;
    }

    // 1. Pega o número que você digitou na caixinha (ou usa 1 se estiver vazio)
    const qtd = qtdParaAdicionar > 0 ? qtdParaAdicionar : 1;

    setCarrinho(lista => {
      // Verifica se o produto já está no carrinho
      const existe = lista.find(item => item.produto.id === p.id);

      if (existe) {
        // 2. Se já existe, soma a quantidade escolhida (+ qtd)
        return lista.map(item => 
          item.produto.id === p.id 
            ? { ...item, quantidade: item.quantidade + qtd } 
            : item
        );
      }

      // 3. Se é novo, adiciona com a quantidade escolhida
      return [...lista, { produto: p, quantidade: qtd }];
    });

    // 4. (Opcional) Volta a caixinha para 1 depois de adicionar
    setQtdParaAdicionar(1); 
  }

  // Cálculos do Carrinho
  const totalCarrinho = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)
  const totalPago = listaPagamentos.reduce((acc, p) => acc + p.valor, 0)
  const faltaPagar = totalCarrinho - totalPago

  function adicionarPagamento() {
    // 1. Correção: Usando 'valorPagamentoInput' (o nome que existe no seu código)
    const valorNum = Number(valorPagamentoInput.replace(',', '.')); 
    
    if (!valorNum || valorNum <= 0) return alert("Digite um valor válido");

    // Cálculo do total e falta
    const totalVenda = carrinho.reduce((acc: number, item: any) => acc + (item.quantidade * Number(item.produto.precoVenda)), 0);
    const totalJaPago = listaPagamentos.reduce((acc: number, p: any) => acc + Number(p.valor), 0);
    const falta = totalVenda - totalJaPago;

    // Arredonda para 2 casas decimais
    const faltaArredondada = Number(falta.toFixed(2));

    let valorParaRegistrar = valorNum;

    // LÓGICA DO TROCO
    if (valorNum > faltaArredondada) {
      // 2. Correção: Tentei adivinhar que o nome é 'formaPagamentoInput'. 
      // Se der erro aqui, verifique se o nome lá em cima é 'formaSelecionada' ou 'metodoPagamento'.
      if (formaPagamentoInput === 'DINHEIRO') { 
        const trocoCalculado = valorNum - faltaArredondada;
        setTroco(trocoCalculado); // Guarda o troco
        valorParaRegistrar = faltaArredondada; // Registra só o que faltava
      } else {
        return alert("Pagamento maior que o total só é permitido em DINHEIRO (para troco).");
      }
    }

    // 3. Adiciona na lista usando os nomes corretos
    setListaPagamentos([...listaPagamentos, { forma: formaPagamentoInput, valor: valorParaRegistrar }]);
    
    // 4. Limpa o campo usando o nome correto do 'set'
    setValorPagamentoInput(""); 
  }

// Cole isso antes de "async function finalizarVenda() {"
  async function prepararNotaFiscal() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    
    // Pega o cliente selecionado
    const cliente = clientes.find(c => String(c.id) === String(clienteSelecionado));

    // Monta o pacote
    const pacoteNFCe = {
      tipo: "NFC-e",
      cliente: cliente ? { nome: cliente.nome, cpf: cliente.cpfCnpj } : "Consumidor",
      itens: carrinho.map((item, i) => ({
        nItem: i + 1,
        prod: item.produto.nome,
        ncm: item.produto.ncm || '00000000',
        cfop: item.produto.cfop || '5102',
        csosn: item.produto.csosn || '102',
        valor: item.produto.precoVenda,
        qtd: item.quantidade
      }))
    };

    // 3. Envia para o seu Servidor
    try {
      const resposta = await fetch(`${API_URL}/emitir-fiscal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacoteNFCe)
      });

      const resultado = await resposta.json();

      if (resposta.ok) {
        alert("✅ " + resultado.mensagem);
        if (resultado.url) {
            window.open(resultado.url, '_blank');
        }
        // Se deu certo, aqui a gente limparia o carrinho ou abriria o PDF
      } else {
        alert("❌ Erro ao emitir: " + resultado.erro);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão com o servidor (Verifique se o backend está rodando).");
    }
  }

async function finalizarVenda() {
  console.log("🕵️ O QUE TEM NO CARRINHO??", carrinho);
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    if (!clienteSelecionado && !confirm("Vender sem cliente identificado?")) return;

    // Monta os dados para enviar ao backend
    const dadosVenda = {
      clienteId: clienteSelecionado ? Number(clienteSelecionado) : null,
      entrega: entrega,            // Usa o estado que você já tem
      enderecoEntrega: endereco,   // Usa o estado que você já tem
      itens: carrinho.map((item: any) => ({
        produtoId: item.produto.id,
        quantidade: Number(item.quantidade),
        precoUnit: Number(item.produto.precoVenda)
      })),
      pagamentos: listaPagamentos.map((p: any) => ({
        forma: p.forma,
        valor: Number(p.valor)
      })),
      total: totalCarrinho,        // ⬅️ FALTAVA ISSO
      caixaId: caixaAberto?.id     // ⬅️ FALTAVA ISSO (Vital para o saldo!)
    };
console.log("📦 DADOS ENVIADOS:", JSON.stringify(dadosVenda, null, 2));
    try {
      // 2. Envia o pacote 'dadosVenda' para o servidor
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosVenda) // ⬅️ AQUI ESTÁ A MÁGICA (Usando a variável)
      });

      const vendaCriada = await res.json();
      
      if (res.ok) {
        alert("Venda realizada com sucesso! 🎉");

        if (confirm("Deseja imprimir o cupom? 🧾")) {
          // Agora temos certeza que vendaCriada.id existe
          imprimirCupom({
              id: vendaCriada.id,
              data: new Date(),
              cliente: { nome: clienteObjSelecionado?.nome || 'Consumidor Final' },
              itens: carrinho,
              total: totalCarrinho,
              pagamentos: listaPagamentos
            });
        }

        // Limpa tudo para a próxima venda
        setCarrinho([]);
        setTroco(0);
        setListaPagamentos([]);
        setClienteSelecionado("");
        carregarDados();
        verificarStatusCaixa(); // Atualiza o saldo lá em cima
      } else {
        alert(`Erro: ${vendaCriada.erro || "Verifique o estoque ou pagamentos"}`);
      }
    } catch (error) {
      console.error("Erro ao vender:", error);
      alert("Erro de conexão com o servidor.");
    }
  }
  // ==========================================================================
  // 7. FUNÇÕES DE IMPRESSÃO
  // ==========================================================================

  function reimprimirVenda(v: Venda) {
    const itens = v.itens.map(i => ({ produto: i.produto, quantidade: Number(i.quantidade) }))
    const nome = v.cliente?.nome || 'Consumidor'
    
    // Correção 3: Usa as variáveis 'itens' e 'nome' que você já criou nas linhas acima
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
        pagamentos: [] // Orçamento não tem pagamento
      });
  }

  // --- FUNÇÃO DE IMPRESSÃO (AGORA COM TÍTULO E CORREÇÃO DE PREÇO) ---
  function imprimirCupom(venda: any) {
    const janela = window.open('', '', 'width=350,height=600');
    
    // Calcula o total dos itens caso não venha pronto
    const totalVenda = Number(venda.total).toFixed(2);

    const conteudo = `
      <html>
        <head>
          <title>Cupom Vila Verde</title>
          <style>
            /* CONFIGURAÇÕES GERAIS PARA FICAR PRETO E FORTE */
            @page { margin: 0; }
            body {
              font-family: 'Courier New', Courier, monospace; /* Fonte alinhada */
              font-weight: 900; /* NEGRITO EXTREMO */
              color: #000;      /* Preto absoluto */
              margin: 0;
              padding: 5px;
              width: 100%;
              font-size: 14px;  /* Tamanho base maior */
            }
            
            /* Títulos */
            .loja { font-size: 20px; text-align: center; margin-bottom: 5px; }
            .info { font-size: 12px; text-align: center; margin-bottom: 10px; }
            
            /* Linhas Divisórias */
            .divisor { 
              border-top: 3px dashed #000; 
              margin: 10px 0; 
              width: 100%;
            }

            /* Tabela de Produtos */
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 14px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            td { padding: 5px 0; vertical-align: top; }
            .col-qtd { width: 30px; }
            .col-nome { }
            .col-preco { text-align: right; white-space: nowrap; }

            /* Totais */
            .total-area { 
              font-size: 24px; /* BEM GRANDE */
              text-align: right; 
              margin-top: 10px;
            }
            .agradecimento { text-align: center; margin-top: 20px; font-size: 14px; }
          </style>
        </head>
        <body>
          
          <div class="loja">MAT. CONSTRUÇÃO<br>VILA VERDE 🏗️</div>
          <div class="info">
            Rua Jornalista Rubens Avila, 530 - CIC<br>
            Tel/Zap: (41) 98438-7167<br>
            CNPJ: 12.820.608/0001-41
          </div>

          <div class="divisor"></div>

          <div><strong>VENDA: #${venda.id}</strong></div>
          <div>Data: ${new Date(venda.data).toLocaleString()}</div>
          <div>Cliente: ${venda.cliente ? venda.cliente.nome : 'Consumidor Final'}</div>

          <div class="divisor"></div>

          <table>
            <thead>
              <tr>
                <th class="col-qtd">QTD</th>
                <th class="col-nome">ITEM</th>
                <th class="col-preco">TOTAL</th>
              </tr>
            </thead>
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

          <div class="total-area">
            TOTAL: R$ ${totalVenda}
          </div>

          <div style="text-align: right; font-size: 12px; margin-top: 5px;">
            Pagamento: ${venda.pagamentos ? venda.pagamentos.map((p:any) => p.forma).join(' + ') : 'Dinheiro'}
          </div>

          <div class="divisor"></div>

          <div class="agradecimento">
            Obrigado pela preferência! 👍<br>
            Sistema PDV Vila Verde
          </div>
          
          <br><br>.
        </body>
      </html>
    `;

    janela?.document.write(conteudo);
    janela?.document.close();
    janela?.print();
  }
  
  // ==========================================================================
  // 8. FUNÇÕES CRUD E AUXILIARES
  // ==========================================================================

 
function removerItemCarrinho(index: number) {
  const novoCarrinho = [...carrinho];
  novoCarrinho.splice(index, 1);
  setCarrinho(novoCarrinho);
}

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault()
    
    // Converte todos os campos numéricos corretamente antes de enviar
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
  
// Função inteligente: Se for gerente, cancela. Se for vendedor, pede senha.
  async function tentarCancelarVenda(id: number) {
    // Se quem está logado JÁ É O GERENTE, cancela direto
    if (usuarioLogado.cargo === 'GERENTE') {
       executarCancelamento(id);
    } else {
       // Se for VENDEDOR, abre o modal pedindo senha
       setIdVendaParaCancelar(id);
       setSenhaGerente('');
       setModalAutorizacao(true);
    }
  }

  // Essa é a função que realmente vai no servidor e apaga (executada após a senha ou direto pelo gerente)
  async function executarCancelamento(id: number) {
    
    // 1. Pega o valor da venda na lista ANTES de apagar ela
    const vendaParaCancelar = vendasRealizadas.find((v: any) => v.id === id);
    const valorDaVenda = vendaParaCancelar ? Number(vendaParaCancelar.total) : 0;

    try {
      const res = await fetch(`${API_URL}/vendas/${id}`, { method: 'DELETE' });

      if (res.ok) {
        alert("✅ Venda cancelada e estoque estornado!");

        // 2. Remove da lista visual de vendas
        setVendasRealizadas(vendasRealizadas.filter((v: any) => v.id !== id));

        // 👇 3. ATUALIZA O SALDO VERDE NA HORA 👇
        if (caixaAberto) {
            setCaixaAberto({
                ...caixaAberto,
                // Pega o saldo atual e TIRA o valor da venda cancelada
                saldoAtual: Number(caixaAberto.saldoAtual) - valorDaVenda
            });
        }

        // Fecha os modais de senha (caso estejam abertos)
        setModalAutorizacao(false);
        setSenhaGerente('');

      } else {
        alert("Erro ao cancelar venda.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  }
  // Função chamada pelo botão do Modal de Senha
  async function validarAutorizacao() {
    try {
      const res = await fetch(`${API_URL}/verificar-gerente`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ senha: senhaGerente })
      });

      if (res.ok) {
        // --- NOVO: Se tiver uma Sangria pendente, executa ela ---
        if (sangriaPendente) {
           executarMovimentacao(sangriaPendente.valor, sangriaPendente.motivo, 'SANGRIA');
        } 
        // --- ANTIGO: Se não, segue a vida com o Cancelamento ---
        else if (idVendaParaCancelar) {
           await executarCancelamento(idVendaParaCancelar);
        }

        // Fecha o modal e limpa a senha
        setModalAutorizacao(false);
        setSenhaGerente('');
      } else {
        alert("Senha de gerente INVÁLIDA! 🚫");
      }
    } catch (error) {
      alert("Erro ao validar senha.");
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
        // Atualiza as listas para sumir o pendente e atualizar o saldo
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

  if (!usuarioLogado) {
    return <TelaLogin onLoginSucesso={(u) => setUsuarioLogado(u)} />;
  }

  // ==========================================================================
  // 9. CÁLCULOS DO DASHBOARD
  // ==========================================================================

  const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0)
    
  const clienteObjSelecionado = clientes.find(c => c.id === Number(clienteSelecionado))


  // ==========================================================================
  // 10. RENDERIZAÇÃO DA TELA (JSX)
  // ==========================================================================
  
  // SE NÃO TIVER NINGUÉM LOGADO, MOSTRA A TELA DE ESCOLHA
  if (!usuarioLogado) {
    return <TelaLogin onLoginSucesso={(u) => setUsuarioLogado(u)} />;
  }
  // Função para abrir o WhatsApp com o resumo da venda
  const enviarZap = (venda: any) => {
    // 1. Tenta pegar o celular do cliente
    let telefone = venda.cliente?.celular || '';
    telefone = telefone.replace(/\D/g, ''); // Limpa tudo que não é número

    if (telefone.length < 10) {
      const novoNumero = prompt("Cliente sem celular cadastrado! Digite o número (com DDD):");
      if (!novoNumero) return;
      telefone = novoNumero.replace(/\D/g, '');
    }

    // 2. Prepara os dados (Codifica textos para URL, mas deixa emojis manuais)
    const nomeCliente = encodeURIComponent(venda.cliente?.nome || 'Cliente');
    const totalTexto = Number(venda.total).toFixed(2);
    
    // Lista de Itens (Usa %E2%96%AA para o quadradinho ▪️ e %0A para pular linha)
    const itensTexto = venda.itens.map((i: any) => 
      `%E2%96%AA%20${i.quantidade}x%20${encodeURIComponent(i.produto.nome)}`
    ).join('%0A');

    // 3. Monta a URL Manualmente (Usando códigos % diretos para os emojis)
    // 🏗️ = %F0%9F%8F%97%EF%B8%8F
    // 💰 = %F0%9F%92%B0
    // 🤝 = %F0%9F%A4%9D
    const linkFinal = `https://wa.me/55${telefone}?text=` +
      `Ol%C3%A1%20*${nomeCliente}*,%20tudo%20bem%3F%20%F0%9F%8F%97%EF%B8%8F%0A%0A` +
      `Aqui%20%C3%A9%20da%20*Vila%20Verde*!%20Segue%20o%20resumo%20da%20sua%20compra:%0A%0A` +
      `${itensTexto}%0A%0A` +
      `*%F0%9F%92%B0%20TOTAL:%20R$%20${totalTexto}*%0A%0A` +
      `Obrigado%20pela%20prefer%C3%AAncia!%20%F0%9F%A4%9D`;

    // 4. Abre o link
    window.open(linkFinal, '_blank');
  };

  return (
    <div style={{ 
      fontFamily: 'Segoe UI, sans-serif', 
      minHeight: '100vh', // Mudei de height para minHeight (permite crescer)
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
          flexWrap: 'wrap', // Permite quebrar linha se a tela for pequena
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
              
          {/* 👇 BOTÃO HISTÓRICO (Ao lado do saldo) 👇 */}
          <button 
            onClick={carregarHistorico}
            style={{
              backgroundColor: '#fff',
              color: '#1a1a1a',
              border: '1px solid #ddd',
              padding: '8px 15px',
              borderRadius: '8px', // Borda arredondada
              fontWeight: '600',
              cursor: 'pointer',
              marginRight: '15px', // Empurra o saldo para a direita
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)', // Sombra suave
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
             📜 Histórico de Caixa
          </button>
              <div style={{ background: '#fff', padding: '5px 10px', borderRadius: 5, border: '1px solid #c3e6cb', color: '#155724', display:'flex', alignItems:'center', gap: 10 }}>
                <strong>Saldo: R$ {Number(caixaAberto.saldoAtual).toFixed(2)}</strong>
                
                <div style={{display:'flex', gap:2}}>
                  <button 
                    onClick={() => { setTipoMovimentacao('SUPRIMENTO'); setModalMovimentacao(true); }}
                    title="Adicionar Dinheiro (Troco/Aporte)"
                    style={{ background: '#48bb78', color: 'white', border:'none', borderRadius:4, width:25, height:25, cursor:'pointer', fontWeight:'bold' }}
                  >
                    +
                  </button>
                  <button 
                    onClick={() => { setTipoMovimentacao('SANGRIA'); setModalMovimentacao(true); }}
                    title="Retirar Dinheiro (Sangria/Pagamentos)"
                    style={{ background: '#e53e3e', color: 'white', border:'none', borderRadius:4, width:25, height:25, cursor:'pointer', fontWeight:'bold' }}
                  >
                    -
                  </button>
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
            <button onClick={abrirCaixa} style={{ width: '100%', padding: 12, background: '#48bb78', color: 'white', border: 'none', borderRadius: 5, fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>
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
              {usuarioLogado.cargo === 'GERENTE' ? '👤 MODO CHEFE' : 
               usuarioLogado.cargo === 'VENDEDOR' ? '🛒 MODO VENDEDOR' : 
               '🚚 MODO MOTORISTA'}
            </span>
          </div>
        </div>

        {usuarioLogado.cargo === 'GERENTE' && (
          <div style={{ display: 'flex', gap: 30 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#a0aec0' }}>CAIXA HOJE</div>
              <div style={{ fontWeight: 'bold', color: '#48bb78', fontSize: 18 }}>
                R$ {vendasRealizadas
                  .filter(v => new Date(v.data).toLocaleDateString() === new Date().toLocaleDateString())
                  .reduce((acc, v) => acc + Number(v.total), 0)
                  .toFixed(2)}
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
        {/* LADO DIREITO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          {/* BOTÃO MODO ESCURO */}
          <button 
            onClick={() => setModoEscuro(!modoEscuro)} 
            style={{ 
              background: 'transparent', 
              border: '1px solid #4a5568', 
              borderRadius: '50%', 
              width: 35, 
              height: 35, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}
            title="Alternar Tema"
          >
            {modoEscuro ? '☀️' : '🌙'}
          </button>

          <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#cbd5e0' }}>
            Olá, <strong style={{ color: 'white' }}>{usuarioLogado.nome}</strong>
          </div>

{/* BOTÃO BACKUP DE SEGURANÇA */}
          {usuarioLogado.cargo === 'GERENTE' && (
            <button 
              onClick={salvarBackup}
              style={{ 
                background: '#2b6cb0', 
                color: 'white', 
                border: 'none', 
                padding: '8px 15px', 
                borderRadius: 5, 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 5,
                marginRight: 10 
              }} 
              title="Salvar todos os dados no computador"
            >
              💾 BACKUP
            </button>
          )}

          {/* Botão Sair (Mantenha o seu botão sair aqui) */}

          <button 
            onClick={() => setUsuarioLogado(null)}
            style={{ background: '#e53e3e', color: 'white', border: 'none', padding: '8px 15px', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }} 
          >
            SAIR 🚪
          </button>
        </div>
      </div>
      </div>

     {/* --- MENU DE NAVEGAÇÃO --- */}
      {usuarioLogado && (
        <div style={{ 
          display: 'flex', 
          background: modoEscuro ? '#2d3748' : 'white',
          padding: '0 30px', 
          borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #e2e8f0',
          overflowX: 'auto' 
        }}>          
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
                padding: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                color: modoEscuro ? 'white' : '#4a5568',
                borderBottom: aba === menu ? '4px solid #2b6cb0' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {
                menu === 'caixa' ? '🛒 CAIXA' : 
                menu === 'clientes' ? '👥 CLIENTES' :
                menu === 'financeiro' ? '💲 FINANCEIRO' :
                menu === 'vendas' ? '📄 VENDAS' :
                menu === 'orcamentos' ? '📝 ORÇAMENTOS' :
                menu === 'dashboard' ? '📊 DASHBOARD' :
                menu === 'entregas'  ? '🚚 ENTREGAS' :
                '👥 EQUIPE'
              }
            </button>
          ))}
        </div>
      )}

      {/* --- CONTEÚDO PRINCIPAL (COM SCROLL ATIVADO) --- */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}> 
        {/* AQUI ESTAVA O PROBLEMA: "overflow: hidden" cortava a tela. Mudei para "auto". */}
        
        {/* === ABA: CAIXA === */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', gap: 30, flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}>
            {/* Removi height: 100% daqui para deixar o carrinho crescer se precisar */}
            
            {/* COLUNA ESQUERDA: PRODUTOS */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '75vh' }}> 
              {/* Fixei height 75vh AQUI para a lista de produtos ter seu próprio scroll, mas a página toda rolar se precisar */}
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  type="number" 
                  min="1"
                  value={qtdParaAdicionar}
                  onChange={e => setQtdParaAdicionar(Number(e.target.value))}
                  placeholder="Qtd"
                  style={{ 
                    width: 80, 
                    padding: '15px', 
                    borderRadius: '10px', 
                    border: '1px solid #ddd', 
                    textAlign: 'center', 
                    fontSize: '1.2rem', 
                    fontWeight: 'bold'
                  }} 
                />
                <input
                  autoFocus
                  type="text"
                  placeholder="🔍 Digite o nome ou código..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  style={{ flex: 1, padding: '15px', fontSize: '1.2rem', borderRadius: '10px', border: '1px solid #ddd', outline: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                />
                <button
                  onClick={() => {
                    setProdutoEmEdicao(null);
                    setFormProduto({ nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral' } as any);
                    setModalAberto(true);
                  }}
                  style={{ backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '10px', width: '60px', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Cadastrar Novo Produto"
                >
                  +
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 5 }}>
              {/* Scroll interno dos produtos */}
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
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <div style={{ width: '60px', height: '60px', backgroundColor: '#f4f6f8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '25px', marginRight: '15px' }}>📦</div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#2c3e50' }}>{produto.nome}</h3>
                          <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>Estoque: <strong>{produto.estoque}</strong> {produto.unidade}</div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#27ae60' }}>R$ {Number(produto.precoVenda).toFixed(2).replace('.', ',')}</div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
  onClick={(e) => { 
    e.stopPropagation(); 
    setProdutoEmEdicao(produto); 
    
    // 👇 O SEGREDO ESTÁ AQUI: Carrega os dados fiscais do banco para o formulário
    setFormProduto({
        ...produto, 
        precoCusto: String(produto.precoCusto), 
        precoVenda: String(produto.precoVenda), 
        estoque: String(produto.estoque),
        // Força o carregamento dos fiscais (se vier vazio, usa o padrão)
        ncm: produto.ncm || '',
        cest: produto.cest || '',
        cfop: produto.cfop || '5102',
        csosn: produto.csosn || '102',   // <--- Garante que o 500 venha!
        origem: produto.origem || '0',
        unidade: produto.unidade || 'UN'
    } as any); 
    
    setModalAberto(true); 
  }} 
  style={{ backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', marginRight: 5 }}
>
  ✏️
</button>
                            <button onClick={(e) => { e.stopPropagation(); excluirProduto(produto.id); }} style={{ backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {produtosFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Nenhum produto encontrado.</div>}
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: CARRINHO E PAGAMENTO */}
<div style={{ 
              width: 400, 
              // MUDANÇA AQUI: Fundo escuro se estiver no modo escuro
              backgroundColor: modoEscuro ? '#2d3748' : 'white', 
              borderRadius: 12, 
              padding: 25, 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: '0 10px 15px rgba(0,0,0,0.05)',
              // MUDANÇA AQUI: Texto branco se estiver no modo escuro
              color: modoEscuro ? 'white' : '#2d3748' 
            }}>
                            <h2 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #edf2f7', paddingBottom: 15 }}>🛒 Carrinho</h2>
              
              <div style={{ marginBottom: 15 }}>
                <label style={estiloLabel}>Cliente</label>
                {/* CENÁRIO 1: CLIENTE JÁ SELECIONADO */}
                {clienteSelecionado ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#e6fffa', border: '1px solid #b2f5ea', borderRadius: 8, color: '#285e61' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>👤</span>
                      <strong>
                        {clientes.find(c => String(c.id) === String(clienteSelecionado))?.nome || 'Cliente'}
                      </strong>
                    </div>
                    <button 
                      onClick={() => { setClienteSelecionado(''); setTermoCliente(''); }} 
                      style={{ background: 'transparent', border: 'none', color: '#e53e3e', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      Trocar ✖
                    </button>
                  </div>
                ) : (
                  /* CENÁRIO 2: NINGUÉM SELECIONADO */
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="🔍 Digite o nome do cliente..."
                      value={termoCliente}
                      onChange={e => setTermoCliente(e.target.value)}
                      style={{ ...estiloInput, marginBottom: 0 }} 
                    />
                    
                    {termoCliente.length > 0 && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        // MUDANÇA 1: Fundo e Borda reagem ao Modo Escuro
                        backgroundColor: modoEscuro ? '#2d3748' : 'white', 
                        border: modoEscuro ? '1px solid #4a5568' : '1px solid #ccc',
                        borderRadius: '0 0 8px 8px', 
                        maxHeight: '200px', 
                        overflowY: 'auto', 
                        zIndex: 100, 
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        // MUDANÇA 2: Cor do Texto
                        color: modoEscuro ? 'white' : '#2d3748'
                      }}>
                        {clientes
                          .filter(c => c.nome.toLowerCase().includes(termoCliente.toLowerCase()))
                          .map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => { setClienteSelecionado(String(c.id)); setTermoCliente(''); }}
                              style={{ padding: '10px', borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                              // Efeito Hover simples (Muda a opacidade pra não brigar com as cores)
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              <span>{c.nome}</span>
                              <small style={{ color: modoEscuro ? '#a0aec0' : '#aaa' }}>{c.cpfCnpj || 'Sem Doc'}</small>
                            </div>
                          ))
                        }
                        {clientes.filter(c => c.nome.toLowerCase().includes(termoCliente.toLowerCase())).length === 0 && (
                          <div style={{ padding: 10, color: '#999', fontStyle: 'italic' }}>Nenhum cliente encontrado.</div>
                        )}
                      </div>
                    )}
                    
                    {termoCliente.length === 0 && (
                      <div style={{ marginTop: 5, fontSize: '0.85rem', color: '#718096' }}>
                        Ou mantenha vazio para <b>Consumidor Final</b>.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {clienteObjSelecionado && Number(clienteObjSelecionado.saldoHaver) > 0 && (
                <div style={{ marginBottom: 15, padding: 10, backgroundColor: '#f0fff4', color: '#2f855a', borderRadius: 8 }}>
                  💰 Haver Disponível: <b>R$ {Number(clienteObjSelecionado.saldoHaver).toFixed(2)}</b>
                </div>
              )}
              
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #edf2f7', borderRadius: 8, padding: 10, marginBottom: 10, maxHeight: 200, minHeight: 100 }}>
                {carrinho.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div>{item.produto.nome} ({item.quantidade}x)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <b>R$ {(item.quantidade * Number(item.produto.precoVenda)).toFixed(2)}</b>
                      <button 
  onClick={() => removerItemCarrinho(i)} 
  style={{ 
    background: 'none', 
    border: 'none', 
    cursor: 'pointer', 
    fontSize: '1.1rem', 
    padding: 0,
    // ADICIONE ISSO 👇
    color: modoEscuro ? '#fc8181' : 'inherit' // Vermelho claro no modo escuro
  }} 
  title="Remover item"
>
  🗑️
</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: 15, color: '#2d3748' }}>
                <span>Total</span>
                <span>R$ {totalCarrinho.toFixed(2)}</span>
              </div>

              {/* Área de Pagamento */}
<div style={{ 
                // MUDANÇA AQUI: Fundo mais escuro no modo noturno para destacar
                backgroundColor: modoEscuro ? '#1a202c' : '#f7fafc', 
                padding: 15, 
                borderRadius: 8, 
                border: modoEscuro ? '1px solid #4a5568' : '1px solid #e2e8f0', 
                marginBottom: 15 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: faltaPagar > 0 ? '#e53e3e' : '#48bb78', fontWeight: 'bold' }}>
                  <span>Falta Pagar:</span>
                  <span>R$ {Math.max(0, faltaPagar).toFixed(2)}</span>
                </div>
                {troco > 0 && (
                  <div style={{ marginTop: 10, padding: 10, backgroundColor: '#d4edda', color: '#155724', borderRadius: 5, border: '1px solid #c3e6cb', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    💰 TROCO: R$ {troco.toFixed(2)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input type="number" placeholder="Valor" value={valorPagamentoInput} onChange={e => setValorPagamentoInput(e.target.value)} style={{ ...estiloInput, width: '100px', marginBottom: 0 }} />
                  <select value={formaPagamentoInput} onChange={e => setFormaPagamentoInput(e.target.value)} style={{ ...estiloInput, flex: 1, marginBottom: 0 }}>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">Pix</option>
                    <option value="CARTAO">Cartão</option>
                    <option value="A PRAZO">A prazo</option>
                    <option value="HAVER">Haver</option>
                  </select>
                  <button onClick={adicionarPagamento} disabled={faltaPagar <= 0.05} style={{ ...estiloBotao, background: faltaPagar <= 0.05 ? '#cbd5e0' : '#3182ce', color: 'white', padding: '0 15px' }}>+</button>
                </div>
                
                <div style={{ fontSize: '0.9rem' }}>
                  {listaPagamentos.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e0', padding: '4px 0' }}>
                      <span>{p.forma}: R$ {p.valor.toFixed(2)}</span>
                      <button onClick={() => setListaPagamentos(listaPagamentos.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', color: '#e53e3e', cursor: 'pointer' }}>✖</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- ÁREA DE ENTREGA --- */}
              <div style={{ marginBottom: 15, background: '#f7fafc', padding: 10, borderRadius: 5, border: '1px solid #edf2f7' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 'bold', color: '#2d3748' }}>
                  <input type="checkbox" checked={entrega} onChange={(e) => setEntrega(e.target.checked)} style={{ transform: 'scale(1.5)' }} />
                  🚛 É para entregar?
                </label>
                {entrega && (
                  <input 
                    type="text" 
                    placeholder="Digite o endereço de entrega..." 
                    value={endereco} 
                    onChange={(e) => setEndereco(e.target.value)} 
                    style={{ 
                      width: '100%', 
                      marginTop: 10, 
                      padding: 8, 
                      borderRadius: 4, 
                      border: '1px solid #cbd5e0',
                      // MUDANÇA AQUI: Isso impede que a caixa estoure o tamanho 👇
                      boxSizing: 'border-box' 
                    }} 
                  />
                )}
              </div>

              <button 
                 onClick={prepararNotaFiscal}
                 style={{
                   width: '100%', 
                   marginBottom: 10, 
                   padding: 12, 
                   background: '#e67e22', // Laranja
                   color: 'white', 
                   border: 'none', 
                   borderRadius: 8, 
                   fontWeight: 'bold', 
                   cursor: 'pointer',
                   display: 'flex', 
                   justifyContent: 'center', 
                   alignItems: 'center', 
                   gap: 10,
                   fontSize: '1rem'
                 }}
               >
                 📄 EMITIR NFC-e (Fiscal)
               </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={salvarOrcamento} disabled={carrinho.length === 0} style={{ ...estiloBotao, flex: 1, backgroundColor: carrinho.length > 0 ? '#d69e2e' : '#cbd5e0', color: 'white' }}>📝 ORÇAMENTO</button>
                <button onClick={finalizarVenda} disabled={carrinho.length === 0 || faltaPagar > 0.05} style={{ ...estiloBotao, flex: 1, backgroundColor: (faltaPagar <= 0.05 && carrinho.length > 0) ? '#48bb78' : '#cbd5e0', color: 'white' }}>✅ VENDER</button>
              </div>
            </div>
          </div>
        )}

        {/* === ABA: ORÇAMENTOS === */}
        {aba === 'orcamentos' && (
          <div style={{ 
            // MUDANÇA: Fundo e Cor do texto reagem ao tema
            backgroundColor: modoEscuro ? '#2d3748' : 'white', 
            color: modoEscuro ? 'white' : '#2d3748',
            borderRadius: 12, padding: 30, height: '100%', overflowY: 'auto' 
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#d69e2e' }}>📝 Orçamentos Salvos</h2>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left', color: modoEscuro ? '#cbd5e0' : '#718096'}}>
                  <th style={{padding:15}}>ID</th>
                  <th style={{padding:15}}>Data</th>
                  <th style={{padding:15}}>Cliente</th>
                  <th style={{padding:15}}>Itens</th>
                  <th style={{padding:15}}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map(o => (
                  <tr key={o.id} style={{borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #eee'}}>
                    <td style={{padding:15}}>#{o.id}</td>
                    <td style={{padding:15}}>{new Date(o.data).toLocaleDateString()}</td>
                    <td style={{padding:15}}><b>{o.cliente?.nome || 'Consumidor'}</b></td>
                    <td style={{padding:15}}>{o.itens.length} itens</td>
                    <td style={{padding:15, fontWeight:'bold'}}>R$ {Number(o.total).toFixed(2)}</td>
                    <td style={{padding:15}}>
                      <button onClick={() => efetivarOrcamento(o)} title="Transformar em Venda" style={{ marginRight: 10, padding: '5px 10px', backgroundColor: '#2b6cb0', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Virar Venda 🛒</button>
                      <button onClick={()=>reimprimirOrcamento(o)} style={{marginRight:10, cursor:'pointer', border:'none', background:'none', fontSize:'1.2rem', color: modoEscuro ? 'white' : 'black'}}>🖨️</button>
                      <button onClick={()=>excluirOrcamento(o.id)} style={{color:'red', cursor:'pointer', border:'none', background:'none', fontSize:'1.2rem'}}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === ABA: CLIENTES === */}
        {aba === 'clientes' && (
          <div style={{ 
            // MUDANÇA: Fundo e Cor do texto reagem ao tema
            backgroundColor: modoEscuro ? '#2d3748' : 'white', 
            color: modoEscuro ? 'white' : '#2d3748',
            borderRadius: 12, padding: 30, height: '100%', overflowY: 'auto' 
          }}>
            <div style={{display:'flex',justifyContent:'space-between', marginBottom:20}}>
              <h2>👥 Clientes</h2>
              <button onClick={()=>{setModalClienteAberto(true);setClienteEmEdicao(null)}} style={{...estiloBotao,background:'#48bb78',color:'white'}}>+ Novo</button>
            </div>
            <table style={{width:'100%'}}>
              <thead>
                <tr style={{textAlign:'left', color: modoEscuro ? '#cbd5e0' : '#718096'}}>
                  <th style={{padding:15}}>Nome</th>
                  <th style={{padding:15}}>CPF / Endereço</th>
                  <th style={{padding:15}}>Haver</th>
                  <th style={{textAlign:'right', padding:15}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} style={{borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #eee'}}>
                    <td style={{padding:15}}><b>{c.nome}</b><br/><small style={{color: modoEscuro ? '#a0aec0' : 'gray'}}>{c.celular}</small></td>
                    <td style={{padding:15}}>{c.cpfCnpj}<br/><small style={{color: modoEscuro ? '#a0aec0' : 'gray'}}>{c.endereco}</small></td>
                    <td style={{padding:15}}>
                      <span style={{fontWeight:'bold', color:Number(c.saldoHaver)>0?'#2f855a':'#a0aec0', background:Number(c.saldoHaver)>0?'#f0fff4':'#edf2f7', padding:'5px 10px', borderRadius:20}}>
                        R$ {Number(c.saldoHaver).toFixed(2)}
                      </span>
                    </td>
                    <td style={{padding:15, textAlign:'right'}}>
                      <button onClick={()=>gerarHaver(c)} style={{marginRight:5, cursor:'pointer', border:'none', background:'none', fontSize:'1.2rem'}} title="Gerar Haver">💰</button> 
                      <button onClick={()=>verHistorico(c)} style={{marginRight:5, cursor:'pointer', border:'none', background:'none', fontSize:'1.2rem'}} title="Ver Histórico">📜</button> 
                      <button onClick={()=>{setClienteEmEdicao(c);setFormCliente({nome:c.nome,cpfCnpj:c.cpfCnpj||'',celular:c.celular||'',endereco:c.endereco||''});setModalClienteAberto(true)}} style={{marginRight:5, cursor:'pointer', border:'none', background:'none', fontSize:'1.2rem'}} title="Editar">✏️</button>
                      <button onClick={()=>excluirCliente(c.id)} style={{cursor:'pointer', border:'none', background:'none', fontSize:'1.2rem'}} title="Excluir">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === ABA: FINANCEIRO === */}
        {aba === 'financeiro' && (
          <div style={{ 
            // MUDANÇA: Fundo e Cor do texto reagem ao tema
            backgroundColor: modoEscuro ? '#2d3748' : 'white', 
            color: modoEscuro ? 'white' : '#2d3748',
            borderRadius: 12, padding: 30, height: '100%', overflowY: 'auto' 
          }}>
            <h2>💲 A Receber (A prazo)</h2>
            {contasReceber.length===0 ? <p>Nada pendente.</p> : (
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{textAlign:'left', color: modoEscuro ? '#cbd5e0' : '#718096'}}>
                    <th style={{padding:15}}>Cliente</th>
                    <th style={{padding:15}}>Data</th>
                    <th style={{padding:15}}>Valor</th>
                    <th style={{padding:15}}>Status</th>
                    <th style={{padding:15}}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {contasReceber.map((conta: any) => (
                    <tr key={conta.id} style={{ borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #ccc' }}>
                      <td style={{ padding: 10 }}>{conta.cliente?.nome || 'Cliente Excluído'}</td>
                      <td>{new Date(conta.dataVencimento).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 'bold', color: '#c53030' }}>R$ {Number(conta.valor).toFixed(2)}</td>
                      <td>{conta.status}</td>
                      <td>
                        {conta.status === 'PENDENTE' && (
                          <button onClick={() => receberConta(conta.id)} style={{ padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Receber 💵</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* === ABA: HISTÓRICO VENDAS === */}
        {aba === 'vendas' && (
          <div style={{ 
            // MUDANÇA: Fundo e Cor do texto reagem ao tema
            backgroundColor: modoEscuro ? '#2d3748' : 'white', 
            color: modoEscuro ? 'white' : '#2d3748',
            borderRadius: 12, padding: 30, height: '100%', overflowY: 'auto' 
          }}>
            <h2>📜 Histórico de Vendas</h2>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left', color: modoEscuro ? '#cbd5e0' : '#718096'}}>
                  <th style={{padding:15}}>ID</th>
                  <th style={{padding:15}}>Data</th>
                  <th style={{padding:15}}>Cliente</th>
                  <th style={{padding:15}}>Pagamento</th>
                  <th style={{padding:15}}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vendasRealizadas.map((v: any) => (
                  <tr key={v.id} style={{borderBottom: modoEscuro ? '1px solid #4a5568' : '1px solid #eee'}}>
                    <td style={{padding:15}}>#{v.id}</td>
                    <td style={{padding:15}}>{new Date(v.data).toLocaleString()}</td>
                    <td style={{padding:15}}><b>{v.cliente?.nome||'Consumidor'}</b></td>
                    <small>{v.pagamentos?.map((p: any) => p.forma).join(' + ')}</small>
                    <td style={{padding:15,fontWeight:'bold'}}>R$ {Number(v.total).toFixed(2)}</td>
                    <td style={{padding:15}}>
                      <button onClick={() => reimprimirVenda(v)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem', color: modoEscuro ? 'white' : 'black' }}>🖨️</button>
                      <button onClick={() => enviarZap(v)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem', marginRight: 5 }} title="Enviar no WhatsApp">📱</button>
                      <button onClick={() => tentarCancelarVenda(v.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem', marginLeft: 10 }} title="Estornar Venda">🚫</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* === ABA ENTREGAS === */}
        {aba === 'entregas' && (
          <div style={{ padding: 20 }}>
            <h2>🚚 Entregas Pendentes</h2>
            {listaEntregas.length === 0 ? (
              <p style={{ color: modoEscuro ? '#cbd5e0' : '#718096' }}>Nenhuma entrega pendente no momento. Tudo limpo! ✨</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {listaEntregas.map((entrega: any) => (
                  <div key={entrega.id} style={{ 
                    // MUDANÇA 1: Fundo do cartão cinza escuro no modo noturno
                    background: modoEscuro ? '#2d3748' : 'white', 
                    padding: 20, 
                    borderRadius: 10, 
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)', 
                    borderLeft: '5px solid #ecc94b',
                    // MUDANÇA 2: Texto branco no modo noturno
                    color: modoEscuro ? 'white' : '#2d3748' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 18 }}>#{entrega.id} - {entrega.cliente?.nome || 'Consumidor'}</span>
                      <span style={{ background: '#ecc94b', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 'bold', color: 'black' }}>PENDENTE</span>
                    </div>
                    <div style={{ marginBottom: 15, color: modoEscuro ? '#cbd5e0' : '#4a5568' }}><strong>📍 Destino:</strong> {entrega.enderecoEntrega}</div>
                    <div style={{ 
                      // MUDANÇA 3: Fundo da listinha de produtos ainda mais escuro para contraste
                      background: modoEscuro ? '#1a202c' : '#f7fafc', 
                      padding: 10, 
                      borderRadius: 5, 
                      marginBottom: 15 
                    }}>
                      <strong>📦 Levar:</strong>
                      <ul style={{ paddingLeft: 20, margin: '5px 0' }}>
                        {entrega.itens.map((item: any) => (
                          <li key={item.id}>{item.quantidade}x {item.produto.nome}</li>
                        ))}
                      </ul>
                    </div>
                    <button onClick={() => baixarEntrega(entrega.id)} style={{ width: '100%', padding: 10, background: '#48bb78', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}>✅ MARCAR COMO ENTREGUE</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === ABA DASHBOARD (PAINEL DO CHEFE) === */}
        {aba === 'dashboard' && dashboard && (
          <div style={{ padding: 20 }}>
            <h2>📊 Visão Geral do Negócio</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
              <div style={{ background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)', padding: 20, borderRadius: 10, color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: 14, opacity: 0.9 }}>VENDAS HOJE</div>
                <div style={{ fontSize: 32, fontWeight: 'bold' }}>R$ {dashboard.totalHoje.toFixed(2)}</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)', padding: 20, borderRadius: 10, color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: 14, opacity: 0.9 }}>ACUMULADO DO MÊS</div>
                <div style={{ fontSize: 32, fontWeight: 'bold' }}>R$ {dashboard.totalMes.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 10 }}>🏆 Top 5 Produtos</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {dashboard.topProdutos.map((p: any, i: number) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #eee' }}>
                      <span>{i+1}. {p.nome}</span>
                      <strong>{p.qtd} un</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ background: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 10 }}>💰 Formas de Pagamento (Mês)</h3>
                {Object.entries(dashboard.porPagamento).map(([forma, valor]: any) => (
                  <div key={forma} style={{ marginBottom: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}>
                      <span>{forma}</span>
                      <strong>R$ {Number(valor).toFixed(2)}</strong>
                    </div>
                    <div style={{ width: '100%', background: '#edf2f7', height: 10, borderRadius: 5 }}>
                      <div style={{ width: `${(valor / dashboard.totalMes) * 100}%`, background: forma === 'PIX' ? '#38a169' : forma === 'DINHEIRO' ? '#d69e2e' : '#3182ce', height: '100%', borderRadius: 5 }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === ABA: EQUIPE === */}
        {aba === 'equipe' && <TelaEquipe />}

      </div> {/* <--- FIM DO CONTEÚDO PRINCIPAL */}

      {/* =====================================================================
          MODAIS (JANELAS FLUTUANTES)
      ===================================================================== */}
      
      {/* =================================================================================
          INÍCIO DO MODAL DE PRODUTOS (COM DADOS FISCAIS) - COLE ISTO NO LUGAR DO ANTIGO
         ================================================================================= */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: isMobile ? 15 : 30, borderRadius: 15, width: isMobile ? '95%' : '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <h2 style={{ marginTop: 0, marginBottom: 10, color: '#2d3748' }}>
              {produtoEmEdicao ? '✏️ Editar Produto' : '✨ Novo Produto'}
            </h2>

            <form onSubmit={salvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              
              {/* LINHA 1: NOME E CÓDIGO */}
              <div style={{ display: 'flex', gap: 15, flexDirection: isMobile ? 'column' : 'row' }}>
                 <div style={{ flex: 2 }}>
                   <label style={estiloLabel}>Nome do Produto</label>
                   <input value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})} style={estiloInput} required />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={estiloLabel}>Código Barras</label>
                   <input value={formProduto.codigoBarra} onChange={e => setFormProduto({...formProduto, codigoBarra: e.target.value})} style={estiloInput} />
                 </div>
              </div>

              {/* LINHA 2: PREÇOS E ESTOQUE */}
              <div style={{ display: 'flex', gap: 15, background: '#f7fafc', padding: 15, borderRadius: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                 <div style={{ flex: 1 }}>
                   <label style={estiloLabel}>Preço Custo</label>
                   <input type="number" step="0.01" value={formProduto.precoCusto} onChange={e => setFormProduto({...formProduto, precoCusto: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={estiloLabel}>Preço Venda</label>
                   <input type="number" step="0.01" value={formProduto.precoVenda} onChange={e => setFormProduto({...formProduto, precoVenda: e.target.value})} style={estiloInput} required />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={estiloLabel}>Estoque</label>
                   <input type="number" value={formProduto.estoque} onChange={e => setFormProduto({...formProduto, estoque: e.target.value})} style={estiloInput} required />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={estiloLabel}>Unidade</label>
                   <select value={formProduto.unidade} onChange={e => setFormProduto({...formProduto, unidade: e.target.value})} style={{ ...estiloInput, height: 42 }}>
                      <option value="UN">UN</option>
                      <option value="KG">KG</option>
                      <option value="LT">LT</option>
                      <option value="CX">CX</option>
                      <option value="M">M</option>
                   </select>
                 </div>
              </div>

              {/* LINHA 3: CATEGORIA E FORNECEDOR */}
              <div style={{ display: 'flex', gap: 15, flexDirection: isMobile ? 'column' : 'row' }}>
                 <div style={{ flex: 1 }}>
                   <label style={estiloLabel}>Categoria</label>
                   <input value={formProduto.categoria} onChange={e => setFormProduto({...formProduto, categoria: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={estiloLabel}>Fornecedor</label>
                   <input value={formProduto.fornecedor} onChange={e => setFormProduto({...formProduto, fornecedor: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={estiloLabel}>Localização</label>
                   <input value={formProduto.localizacao} onChange={e => setFormProduto({...formProduto, localizacao: e.target.value})} style={estiloInput} />
                 </div>
              </div>

              {/* ======================= ÁREA FISCAL (NFC-e) ======================= */}
              <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '10px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#2c3e50', fontSize: '1rem' }}>🏛️ Dados Fiscais (NFC-e)</strong>
                <button type="button" onClick={() => setModoFiscal(!modoFiscal)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                  {modoFiscal ? '🙈 Esconder' : '👁️ Mostrar'}
                </button>
              </div>

              {modoFiscal && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15, background: '#fff', padding: 10, border: '1px solid #eee', borderRadius: 8 }}>
                  
                  <div>
                    <label style={estiloLabel}>NCM (Obrigatório)</label>
                    <input maxLength={8} placeholder="Ex: 22021000" value={formProduto.ncm || ''} onChange={e => setFormProduto({...formProduto, ncm: e.target.value})} style={estiloInput} />
                  </div>

                  <div>
                    <label style={estiloLabel}>CEST</label>
                    <input maxLength={7} placeholder="Ex: 0100100" value={formProduto.cest || ''} onChange={e => setFormProduto({...formProduto, cest: e.target.value})} style={estiloInput} />
                  </div>

                  <div>
                    <label style={estiloLabel}>CFOP</label>
                    <input maxLength={4} value={formProduto.cfop || '5102'} onChange={e => setFormProduto({...formProduto, cfop: e.target.value})} style={estiloInput} />
                  </div>

                  <div>
                    <label style={estiloLabel}>CSOSN (Imposto)</label>
                    <select value={formProduto.csosn || '102'} onChange={e => setFormProduto({...formProduto, csosn: e.target.value})} style={{ ...estiloInput, height: 42 }}>
                      <option value="102">102 - Tributado</option>
                      <option value="500">500 - Subst. Tributária</option>
                      <option value="900">900 - Outros</option>
                    </select>
                  </div>

                  <div>
                    <label style={estiloLabel}>Origem</label>
                    <select value={formProduto.origem || '0'} onChange={e => setFormProduto({...formProduto, origem: e.target.value})} style={{ ...estiloInput, height: 42 }}>
                      <option value="0">0 - Nacional</option>
                      <option value="1">1 - Importado</option>
                    </select>
                  </div>

                </div>
              )}
              {/* ======================= FIM ÁREA FISCAL ======================= */}

              {/* BOTÕES DE AÇÃO (SALVAR / CANCELAR) */}
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button 
                  type="button" 
                  onClick={() => setModalAberto(false)} 
                  style={{ background: '#cbd5e0', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#4a5568' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ background: '#27ae60', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: 'white' }}
                >
                  Salvar Produto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      
      {/* 2. MODAL DE CLIENTE */}
      {modalClienteAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 450, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, color: '#2d3748' }}>{clienteEmEdicao ? '✏️ Editar Cliente' : '👤 Novo Cliente'}</h2>
            <form onSubmit={salvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <input placeholder="Nome" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} style={estiloInput} required />
              <input placeholder="CPF/CNPJ" value={formCliente.cpfCnpj} onChange={e => setFormCliente({...formCliente, cpfCnpj: e.target.value})} style={estiloInput} />
              <input placeholder="Celular" value={formCliente.celular} onChange={e => setFormCliente({...formCliente, celular: e.target.value})} style={estiloInput} />
              <input placeholder="Endereço" value={formCliente.endereco} onChange={e => setFormCliente({...formCliente, endereco: e.target.value})} style={estiloInput} />
              <div style={{ display: 'flex', gap: 15, marginTop: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalClienteAberto(false)} style={{ ...estiloBotao, backgroundColor: '#cbd5e0', color: '#4a5568' }}>Cancelar</button>
                <button type="submit" style={{ ...estiloBotao, backgroundColor: '#48bb78', color: 'white' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL DE HISTÓRICO DO CLIENTE */}
      {modalHistoricoCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 600, maxHeight: '80vh', overflowY: 'auto', display:'flex', flexDirection:'column' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
               <h2 style={{margin:0, color:'#2b6cb0'}}>📜 Histórico: {clienteDoHistorico?.nome}</h2>
               <button onClick={()=>setModalHistoricoCliente(false)} style={{border:'none', background:'none', fontSize:'1.5rem', cursor:'pointer'}}>✖</button>
            </div>
            
            <div style={{overflowY:'auto', flex:1}}>
              {Array.isArray(historicoCliente) && historicoCliente.length > 0 ? (
                historicoCliente.map((v: any) => (
                  <div key={v.id} style={{ borderBottom: '1px solid #edf2f7', padding: '15px 0', display: 'flex', justifyContent: 'space-between', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                       <div style={{ fontSize: '0.9rem', color: '#718096' }}>{v.data ? new Date(v.data).toLocaleString() : 'Data desconhecida'}</div>
                       <small>{v.pagamentos?.map((p: any) => p.forma).join(' + ') || 'ANTIGO'}</small>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#2d3748', fontWeight: 'bold' }}>
                       {v.itens && v.itens.map((i: any) => `${i.quantidade}x ${i.produto ? i.produto.nome : 'Item excluído'}`).join(', ')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 5 }}>
                      <span style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '1.1rem' }}>R$ {Number(v.total).toFixed(2)}</span>
                      <button onClick={() => reimprimirVenda(v)} title="Imprimir 2ª Via" style={{ cursor: 'pointer', border: '1px solid #ccc', background: 'white', borderRadius: 4, padding: '2px 8px' }}>🖨️</button>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: '#a0aec0', padding: 20 }}>Nenhuma compra encontrada.</p>
              )}
            </div>
            
            <div style={{marginTop:20, borderTop:'2px solid #e2e8f0', paddingTop:15, textAlign:'right'}}>
               <div style={{color:'#718096', fontSize:'0.9rem'}}>TOTAL GASTO PELO CLIENTE</div>
               <div style={{fontSize:'1.8rem', fontWeight:'bold', color:'#2d3748'}}>R$ {historicoCliente.reduce((acc,v)=>acc+Number(v.total),0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL DE AUTORIZAÇÃO DE GERENTE === */}
      {modalAutorizacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 10, width: 350, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 10 }}>👮‍♂️</div>
            <h3 style={{ color: '#c53030' }}>Autorização Necessária</h3>
            <p style={{ color: '#718096' }}>Vendedor não pode cancelar venda.<br/>Peça para um gerente digitar a senha:</p>
            <p style={{ color: '#718096' }}>
              {sangriaPendente 
                ? `Autorizar SANGRIA de R$ ${sangriaPendente.valor.toFixed(2)}?`
                : 'Autorizar CANCELAMENTO da venda?'}
              <br/>Insira a senha do Gerente:
            </p>
            
            <input 
              type="password" 
              autoFocus
              placeholder="Senha do Gerente" 
              value={senhaGerente} 
              onChange={e => setSenhaGerente(e.target.value)}
              style={{ width: '100%', padding: 12, fontSize: '1.1rem', border: '1px solid #ccc', borderRadius: 5, marginBottom: 15 }}
            />

            <button onClick={validarAutorizacao} style={{ width: '100%', padding: 12, background: '#c53030', color: 'white', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10 }}>
              CONFIRMAR CANCELAMENTO
            </button>
            
            <button onClick={() => setModalAutorizacao(false)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer' }}>
              Voltar
            </button>
          </div>
        </div>
      )}

{/* === MODAL DE SANGRIA / SUPRIMENTO === */}
      {modalMovimentacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 10, width: 350, textAlign: 'center' }}>
            <h2 style={{ color: tipoMovimentacao === 'SANGRIA' ? '#e53e3e' : '#48bb78', marginTop:0 }}>
              {tipoMovimentacao === 'SANGRIA' ? '💸 Retirar Dinheiro' : '💰 Adicionar Dinheiro'}
            </h2>
            
            <label style={{display:'block', textAlign:'left', marginBottom:5, fontWeight:'bold', color: '#4a5568'}}>Valor (R$)</label>
            <input 
              type="number" 
              autoFocus
              placeholder="0.00" 
              value={valorMovimentacao} 
              onChange={e => setValorMovimentacao(e.target.value)}
              style={{ width: '100%', padding: 12, fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: 5, marginBottom: 15, boxSizing:'border-box' }}
            />

            <label style={{display:'block', textAlign:'left', marginBottom:5, fontWeight:'bold', color: '#4a5568'}}>Motivo (Opcional)</label>
            <input 
              type="text" 
              placeholder={tipoMovimentacao === 'SANGRIA' ? "Ex: Pagamento Fornecedor" : "Ex: Troco Inicial"} 
              value={descMovimentacao} 
              onChange={e => setDescMovimentacao(e.target.value)}
              style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 5, marginBottom: 20, boxSizing:'border-box' }}
            />

            <button onClick={salvarMovimentacao} style={{ width: '100%', padding: 12, background: tipoMovimentacao === 'SANGRIA' ? '#e53e3e' : '#48bb78', color: 'white', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', marginBottom: 10 }}>
              CONFIRMAR {tipoMovimentacao}
            </button>
            
            <button onClick={() => setModalMovimentacao(false)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#718096', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

{/* 👇 JANELA DE HISTÓRICO (MODAL) 👇 */}
      {vendoHistorico && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ 
            backgroundColor: 'white', padding: '25px', borderRadius: '15px', 
            width: '600px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>📜 Histórico de Fechamentos</h2>
              <button onClick={() => setVendoHistorico(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer' }}>❌</button>
            </div>

            <table width="100%" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Data</th>
                  <th style={{ padding: '10px' }}>Saldo Final</th>
                  <th style={{ padding: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {historicoCaixas.map((cx: any) => (
                  <tr key={cx.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>{new Date(cx.dataFechamento || cx.dataAbertura).toLocaleDateString()}</td>
                    <td style={{ padding: '10px', color: 'green', fontWeight: 'bold' }}>
                      R$ {Number(cx.saldoFinal || cx.saldoAtual).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#e5e7eb', fontSize: '12px' }}>
                        {cx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;