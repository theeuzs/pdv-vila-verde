/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react'
import { TelaLogin } from './TelaLogin';
import { TelaEquipe } from './TelaEquipe';
import ModalProdutoPro from './ModalProdutoPro';
import ModalDetalhesProduto from './ModalDetalhesProduto';

// ============================================================================
// TIPAGENS
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
  endereco2?: string
  endereco3?: string
  saldoHaver: number
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
}

interface Venda {
  id: number
  data: string
  total: number
  cliente?: Cliente
  caixaId?: number
  usuario?: { id: number; nome: string }
  nota_emitida?: boolean
  nota_cancelada?: boolean
  urlFiscal?: string
  entrega?: boolean
  statusEntrega?: string
  endereco?: string
  pagamentos: { forma: string; valor: number }[]
  itens: { 
    quantidade: number
    precoUnit: number
    produto: Produto 
  }[]
}

interface Orcamento {
  id: number
  data: string
  total: number
  cliente?: Cliente
  itens: { 
    quantidade: number
    precoUnit: number
    produto: Produto 
  }[]
}

interface Caixa {
  id: number
  dataAbertura: string
  dataFechamento?: string
  saldoInicial: number
  saldoAtual: number
  saldoFinal?: number
  status: string
  observacoes?: string
  usuarioId?: string
  usuario?: {
    id: string
    nome: string
  }
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const API_URL = 'https://api-vila-verde.onrender.com'

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

// --- FUNÇÃO DE IMPRESSÃO TÉRMICA ---
const imprimirComprovante = (tipo: string, valor: number, motivo: string, usuario: string) => {
  const janelaImpressao = window.open('', '', 'width=300,height=400');
  
  if (!janelaImpressao) return; // Bloqueador de popup impediu

  const dataHora = new Date().toLocaleString('pt-BR');
  
  const conteudo = `
    <html>
      <head>
        <title>Comprovante</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 5px; width: 280px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          .big { font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="center bold big">VILA VERDE</div>
        <div class="center">COMPROVANTE DE CAIXA</div>
        <div class="line"></div>
        
        <div><span class="bold">TIPO:</span> ${tipo.toUpperCase()}</div>
        <div><span class="bold">DATA:</span> ${dataHora}</div>
        <div><span class="bold">RESP:</span> ${usuario}</div>
        
        <div class="line"></div>
        
        <div class="center bold big">R$ ${valor.toFixed(2)}</div>
        
        <div class="line"></div>
        
        <div><span class="bold">MOTIVO/OBS:</span></div>
        <div>${motivo || 'Sem descrição'}</div>
        
        <br/><br/>
        <div class="center">.</div>
      </body>
    </html>
  `;

  janelaImpressao.document.write(conteudo);
  janelaImpressao.document.close();
  
  // Espera carregar e imprime
  janelaImpressao.focus();
  setTimeout(() => {
    janelaImpressao.print();
    janelaImpressao.close();
  }, 500);
};

export function App() {

  const inputBuscaRef = useRef<HTMLInputElement>(null); // 👈 CRIE ISSO
  // ... seus outros estados (modal, produtos, etc)
  
  // ESTADOS DE AUTENTICAÇÃO
  const [usuarioLogado, setUsuarioLogado] = useState<any>(() => {
    const salvo = localStorage.getItem('usuario_vila_verde')
    if (salvo) {
      return JSON.parse(salvo)
    }
    return null
  })
  
function verDetalhes(produto: any) {
    setProdutoDetalhes(produto);
    setModalDetalhesAberto(true);
}

// Cole isso lá em cima, antes do return do App
  function handleLoginSucesso(usuario: any) {
    setUsuarioLogado(usuario);
    // Salva no cofre do navegador
    localStorage.setItem('usuario_vila_verde', JSON.stringify(usuario)); 
  }

  // ESTADOS DE NAVEGAÇÃO
  const [aba, setAba] = useState<string>('caixa');

  const [idProdutoEmEdicao, setIdProdutoEmEdicao] = useState<any>(null);
  const [unidade, setUnidade] = useState('UN');
  const [ncm, setNcm] = useState('');
  
  // ESTADOS DE DADOS
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [contasReceber, setContasReceber] = useState<any[]>([])
  const [entregas, setEntregas] = useState<Venda[]>([])
  const [vendedorSelecionadoId, setVendedorSelecionadoId] = useState<any>(''); // Para escolher o vendedor
  const [mostrarComissao, setMostrarComissao] = useState(false); // Para abrir/fechar a aba secreta
  // --- ADICIONE JUNTO COM OS OUTROS STATES ---
  const [sku, setSku] = useState('');
  const [marca, setMarca] = useState('');
  // --- SUGESTÕES DE PESQUISA NO CADASTRO ---
  const [sugestoesNome, setSugestoesNome] = useState<any[]>([]);
  
  
  // ESTADOS DO CAIXA
  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null)
  const [todosCaixas, setTodosCaixas] = useState<Caixa[]>([]) // Para gerentes verem todos
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [modalGerenciarCaixas, setModalGerenciarCaixas] = useState(false)
  const [valorAbertura, setValorAbertura] = useState('')
  const [modalResumoCaixa, setModalResumoCaixa] = useState(false)
  
  // ESTADOS DO CARRINHO
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('')
  const [entrega, setEntrega] = useState(false)
  const [endereco, setEndereco] = useState('')
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<number>(1)
  const [desconto, setDesconto] = useState('')

// 👇 1. TABELA DE REGRAS DE COMISSÃO
  // Aqui você define quanto cada categoria paga
  const REGRAS_COMISSAO: any = {
    'bruto': 0.01,         // 1% para areia, cimento, tijolo
    'tintas': 0.02,        // 2% para tintas
    'ferramentas': 0.05,   // 5% para ferramentas (margem maior)
    'padrao': 0.03         // 3% se não tiver categoria ou não achar na lista
  };

  // 👇 2. FUNÇÃO QUE DESCOBRE A PORCENTAGEM DO ITEM
  function pegarPorcentagem(produto: any) {
    if (!produto.categoria) return REGRAS_COMISSAO['padrao'];
    
    // Converte pra minúsculo pra "Tintas" bater com "tintas"
    const cat = produto.categoria.toLowerCase().trim();
    
    // Retorna a porcentagem da categoria ou a padrão se não existir
    return REGRAS_COMISSAO[cat] || REGRAS_COMISSAO['padrao'];
  }

  // 👇 3. CÁLCULO DO TOTAL (ATUALIZADO)
  // Agora ele calcula item por item, respeitando a categoria de cada um
  const totalComissao = carrinho.reduce((acc, item) => {
    const porcentagem = pegarPorcentagem(item.produto);
    return acc + (Number(item.produto.precoVenda) * item.quantidade * porcentagem);
  }, 0);  

  // Carrega as listas ao abrir a tela
  useEffect(() => {
    fetch(`${API_URL}/categorias`).then(r => r.json()).then(setListaCategorias);
    fetch(`${API_URL}/fornecedores`).then(r => r.json()).then(setListaFornecedores);
  }, []);

  // Função para criar fornecedor rápido
  async function cadastrarFornecedor() {
    if(!novoFornecedor) return;
    const res = await fetch(`${API_URL}/fornecedores`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ nome: novoFornecedor })
    });
    const criado = await res.json();
    setListaFornecedores([...listaFornecedores, criado]);
    setFornecedorId(criado.id); // Já seleciona o novo
    setNovoFornecedor(''); // Limpa o campo
    alert('Fornecedor cadastrado!');
  }

  // ESTADOS DE LOADING
  const [processandoVenda, setProcessandoVenda] = useState(false)
  const [mensagemLoading, setMensagemLoading] = useState('')
  
  // ESTADOS DO DASHBOARD
  const [dashboard, setDashboard] = useState<any>(null)
  
  // ESTADOS DE PAGINAÇÃO
  const [produtosVisiveis, setProdutosVisiveis] = useState(30)
  
  // MODAIS
  const [modalPagamento, setModalPagamento] = useState(false)
  const [modalProduto, setModalProduto] = useState(false)
  const [modalCliente, setModalCliente] = useState(false)
  const [modalOrcamento, setModalOrcamento] = useState(false)
  const [clienteOrcamento, setClienteOrcamento] = useState('');

  // Estado para o Modal de Detalhes (Visualização)
const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
const [produtoDetalhes, setProdutoDetalhes] = useState<any>(null);
  
  // FORMULÁRIOS
  const [formProduto, setFormProduto] = useState<any>({})
  const [formCliente, setFormCliente] = useState<any>({})
  const [listaPagamentos, setListaPagamentos] = useState<any[]>([])
  const [valorPagamento, setValorPagamento] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro')

  // Filtros do Histórico
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // ============================================================================
  // EFEITOS
  // ============================================================================

  useEffect(() => {
    if (usuarioLogado) {
      carregarDados()
      buscarCaixaAberto() // Busca o caixa aberto separadamente
    }
  }, [usuarioLogado])

  useEffect(() => {
    carregarDashboard()
  }, [vendas])

  // Reset paginação ao trocar de aba
  useEffect(() => {
    setProdutosVisiveis(30)
  }, [aba])

// --- 1. ESTADOS DO PRODUTO (Se já tiver algum, apague o antigo e use estes) ---
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [codigoBarra, setCodigoBarra] = useState('');
  const [estoque, setEstoque] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [margemLucro, setMargemLucro] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');

  // --- 2. ESTADOS NOVOS PARA FORNECEDOR E CATEGORIA ---
  const [fornecedorId, setFornecedorId] = useState<any>('');
  const [novoFornecedor, setNovoFornecedor] = useState('');
  const [listaCategorias, setListaCategorias] = useState<string[]>([]);
  const [listaFornecedores, setListaFornecedores] = useState<any[]>([]);

  // --- CONTROLE DE SANGRIA E SUPRIMENTO ---
  const [modalTipoMovimento, setModalTipoMovimento] = useState<'entrada' | 'sangria' | null>(null);
  const [valorMovimento, setValorMovimento] = useState('');
  const [descMovimento, setDescMovimento] = useState('');
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);

  // --- 3. CARREGAR DADOS AO ABRIR (USE EFFECT) ---
  useEffect(() => {
    // Carrega categorias únicas
    fetch(`${API_URL}/categorias`)
      .then(r => r.json())
      .then(data => setListaCategorias(data || []))
      .catch(err => console.log("Erro categorias", err));

    // Carrega fornecedores
    fetch(`${API_URL}/fornecedores`)
      .then(r => r.json())
      .then(data => setListaFornecedores(data || []))
      .catch(err => console.log("Erro fornecedores", err));
  }, []);

  // ============================================================================
  // FUNÇÕES DE CARREGAMENTO
  // ============================================================================

  async function carregarDados() {
    try {
      const [resProdutos, resClientes, resVendas, resOrcamentos, resContas, resEntregas, resMov] = await Promise.all([
        fetch(`${API_URL}/produtos`),
        fetch(`${API_URL}/clientes`),
        fetch(`${API_URL}/vendas`),
        fetch(`${API_URL}/orcamentos`),
        fetch(`${API_URL}/contas-receber`),
        fetch(`${API_URL}/entregas`),
        fetch(`${API_URL}/caixa/movimentacoes`) // <--- NOVA LINHA
      ])

      if (resProdutos.ok) setProdutos(await resProdutos.json())
      if (resClientes.ok) setClientes(await resClientes.json())
      if (resVendas.ok) setVendas(await resVendas.json())
      if (resOrcamentos.ok) setOrcamentos(await resOrcamentos.json())
      if (resContas.ok) setContasReceber(await resContas.json())
      if (resEntregas.ok) setEntregas(await resEntregas.json())
      
      // Carrega as movimentações (Se der erro, inicia vazio)
      if (resMov.ok) setMovimentacoes(await resMov.json())
      else setMovimentacoes([])

    } catch (e) {
      console.error('Erro ao carregar dados:', e)
    }
  }

  function carregarDashboard() {
    const hoje = new Date().toDateString()
    const mesAtual = new Date().getMonth()
    
    const vendasHoje = vendas.filter(v => new Date(v.data).toDateString() === hoje)
    const vendasMes = vendas.filter(v => new Date(v.data).getMonth() === mesAtual)
    
    const totalHoje = vendasHoje.reduce((acc, v) => acc + Number(v.total), 0)
    const totalMes = vendasMes.reduce((acc, v) => acc + Number(v.total), 0)
    
    const ticketMedio = vendasMes.length > 0 ? totalMes / vendasMes.length : 0
    
    // Top 5 produtos
    const produtosVendidos: any = {}
    vendasMes.forEach(v => {
      v.itens.forEach(item => {
        const nome = item.produto.nome
        produtosVendidos[nome] = (produtosVendidos[nome] || 0) + Number(item.quantidade)
      })
    })
    
    const top5 = Object.entries(produtosVendidos)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, qtd]) => ({ nome, qtd }))
    
    setDashboard({
      vendasHoje: vendasHoje.length,
      totalHoje,
      vendasMes: vendasMes.length,
      totalMes,
      ticketMedio,
      top5Produtos: top5
    })
  }

  // ============================================================================
  // FUNÇÕES DO CAIXA
  // ============================================================================

  async function buscarCaixaAberto() {
    try {
      // Busca o caixa do usuário logado
      const res = await fetch(`${API_URL}/caixa/aberto/${usuarioLogado.id}`)
      if (res.ok) {
        const caixa = await res.json()
        setCaixaAberto(caixa)
        return caixa
      } else {
        setCaixaAberto(null)
        return null
      }
    } catch (e) {
      console.error('Erro ao buscar caixa:', e)
      setCaixaAberto(null)
      return null
    }
  }

  async function buscarTodosCaixas() {
    // Apenas gerentes podem ver todos os caixas
    if (usuarioLogado?.cargo !== 'GERENTE') return

    try {
      const res = await fetch(`${API_URL}/caixa/todos`)
      if (res.ok) {
        const caixas = await res.json()
        setTodosCaixas(caixas)
      }
    } catch (e) {
      console.error('Erro ao buscar todos os caixas:', e)
    }
  }

  async function abrirCaixa() {
    if (!valorAbertura || Number(valorAbertura) < 0) {
      alert('Digite um valor válido para abertura')
      return
    }

    try {
      const res = await fetch(`${API_URL}/caixa/abrir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          saldoInicial: Number(valorAbertura),
          usuarioId: usuarioLogado.id,
          observacoes: `Abertura por ${usuarioLogado.nome}`
        })
      })
      
imprimirComprovante(
        'ABERTURA DE CAIXA',
        Number(valorAbertura), 
        'Saldo Inicial do Dia', 
        usuarioLogado?.nome || 'Balcão'
    );

      if (res.ok) {
        const caixa = await res.json()
        setCaixaAberto(caixa)
        setModalAbrirCaixa(false)
        setValorAbertura('')
        alert('✅ Caixa aberto com sucesso!')
        
        // Se for gerente, atualiza a lista de todos os caixas
        if (usuarioLogado.cargo === 'GERENTE') {
          buscarTodosCaixas()
        }
      } else {
        const erro = await res.json()
        
        // Se já existe caixa aberto para este usuário
        if (erro.erro && erro.erro.includes('Já existe um caixa aberto')) {
          const usar = confirm('⚠️ Você já tem um caixa aberto!\n\nDeseja usar o caixa que já está aberto?')
          if (usar) {
            const caixaExistente = await buscarCaixaAberto()
            if (caixaExistente) {
              setModalAbrirCaixa(false)
              setValorAbertura('')
              alert('✅ Usando o caixa já aberto!')
            } else {
              alert('❌ Não foi possível encontrar o caixa aberto. Tente novamente.')
            }
          }
        } else {
          alert('❌ Erro: ' + (erro.erro || 'Não foi possível abrir o caixa'))
        }
      }
    } catch (e) {
      console.error(e)
      alert('❌ Erro ao abrir caixa. Verifique sua conexão.')
    }
  }

  async function fecharCaixa() {
    if (!caixaAberto) return
    if (!confirm('Deseja realmente fechar o caixa?')) return
    
    try {
      const res = await fetch(`${API_URL}/caixa/fechar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caixaId: caixaAberto.id })
      })
      
      if (res.ok) {
        setCaixaAberto(null)
        alert('✅ Caixa fechado com sucesso!')
        carregarDados()
      } else {
        const erro = await res.json()
        alert('❌ Erro: ' + (erro.erro || erro.error || 'Não foi possível fechar o caixa'))
      }
    } catch (e) {
      console.error(e)
      alert('❌ Erro ao fechar caixa')
    }
  }

// --- FUNÇÃO DE IMPRESSÃO DE ORÇAMENTO (AGORA COM OS ITENS CERTOS) ---
  const imprimirOrcamentoTermico = () => {
    const janela = window.open('', '', 'width=310,height=600');
    if (!janela) return;

    // 1. CALCULA O TOTAL GERAL (USANDO A LÓGICA DE DETETIVE)
    const total = carrinho.reduce((acc, item: any) => {
      const preco = Number(item.precoVenda || item.preco || item.produto?.precoVenda || 0);
      const qtd = Number(item.quantidade || item.qtd || 1);
      return acc + (preco * qtd);
    }, 0);
    
    const dataHoje = new Date().toLocaleString('pt-BR');

    // 2. GERA A LISTA DE ITENS HTML (USANDO A LÓGICA DE DETETIVE)
    const itensHtml = carrinho.map((item: any) => {
       // 👇 O DETETIVE ENTRA EM AÇÃO AQUI TAMBÉM!
       const nomeReal = item.nome || item.produto?.nome || item.descricao || "Item sem nome";
       const precoReal = Number(item.precoVenda || item.preco || item.produto?.precoVenda || 0);
       const qtdReal = Number(item.quantidade || item.qtd || 1);
       const totalItem = precoReal * qtdReal;

       return `
        <div style="display: flex; justify-content: space-between; margin-bottom: 3px; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">
          <div style="font-size: 11px; flex: 2; display: flex;">
            <span style="font-weight: bold; margin-right: 5px;">${qtdReal}x</span>
            <span>${nomeReal.substring(0, 22)}</span>
          </div>
          <div style="font-weight: bold; flex: 1; text-align: right;">
            R$ ${totalItem.toFixed(2)}
          </div>
        </div>
      `;
    }).join('');

    // 3. MONTA O RECIBO FINAL
    const html = `
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 2px 5px; width: 290px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .header-title { font-size: 16px; font-weight: bold; margin-bottom: 5px; line-height: 1.1; }
          .header-info { font-size: 11px; }
          .big-total-label { font-size: 14px; font-weight: bold; }
          .big-total-value { font-size: 18px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center header-title">MEGA LOJA DA CONSTRUÇÃO<br/>VILA VERDE</div>
        <div class="center header-info">CNPJ: 12.820.608/0001-41</div>
        <div class="center header-info">Endereço: Rua Jornalista Rubens Ávila, 530</div>
        <div class="center header-info">Cidade Industrial - Curitiba/PR</div>
        <div class="center header-info">Tel/WhatsApp: (41) 98438-7167</div>

        <div class="line"></div>

        <div class="center bold" style="font-size: 14px;">ORÇAMENTO / PRÉ-VENDA</div>
        <div class="center" style="font-size: 10px;">(NÃO VÁLIDO COMO DOCUMENTO FISCAL)</div>

        <div class="line"></div>
        
        <div><span class="bold">CLIENTE:</span> ${clienteOrcamento.toUpperCase() || 'CONSUMIDOR FINAL'}</div>
        <div><span class="bold">EMISSÃO:</span> ${dataHoje}</div>
        
        <div class="line"></div>

        <div style="margin-bottom: 5px; font-weight: bold;">ITENS DO PEDIDO:</div>
        <div style="font-size: 11px; margin-bottom: 5px;">Qtd | Descrição | Valor Total</div>
        ${itensHtml}
        
        <div class="line"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <span class="big-total-label">TOTAL A PAGAR:</span>
          <span class="big-total-value">R$ ${total.toFixed(2)}</span>
        </div>
        
        <div class="line"></div>

        <div class="center" style="font-size: 11px;">
            Horário de Atendimento:<br/>
            Seg a Sex: 08:30h às 18h / Sáb: 08:30h às 13h
        </div>
        <br/>
        <div class="center bold big" style="font-size: 14px;">OBRIGADO PELA PREFERÊNCIA!</div>
        <div class="center" style="font-size: 10px; margin-top: 10px;">Orçamento válido por 3 dias. Sujeito a alteração de estoque e valores.</div>
        
        <br/><div class="center">.</div>
      </body>
      </html>
    `;

    janela.document.write(html);
    janela.document.close();
    
    setTimeout(() => {
      janela.print();
      janela.close();
    }, 600);

    setModalOrcamento(false);
    setClienteOrcamento('');
  };

  // ============================================================================
  // FUNÇÕES DO CARRINHO
  // ============================================================================

  function adicionarAoCarrinho(produto: Produto) {
    const itemExiste = carrinho.find(i => i.produto.id === produto.id)
    
    if (itemExiste) {
      setCarrinho(carrinho.map(i => 
        i.produto.id === produto.id 
          ? { ...i, quantidade: i.quantidade + 1 }
          : i
      ))
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }])
    }
  }

  function removerDoCarrinho(produtoId: number) {
    setCarrinho(carrinho.filter(i => i.produto.id !== produtoId))
  }

  function alterarQuantidade(produtoId: number, novaQtd: number) {
    if (novaQtd <= 0) {
      removerDoCarrinho(produtoId)
      return
    }
    
    setCarrinho(carrinho.map(i => 
      i.produto.id === produtoId 
        ? { ...i, quantidade: novaQtd }
        : i
    ))
  }

  function limparCarrinho() {
    setCarrinho([])
    setClienteSelecionado('')
    setEntrega(false)
    setEndereco('')
    setListaPagamentos([])
    setValorPagamento('')
    setDesconto('')
  }

  const totalCarrinho = carrinho.reduce((acc, item) => 
    acc + (Number(item.produto.precoVenda) * Number(item.quantidade)), 0
  )
  const valorDesconto = Number(desconto) || 0
  const totalComDesconto = Math.max(0, totalCarrinho - valorDesconto)

  const totalPago = listaPagamentos.reduce((acc, p) => acc + p.valor, 0)
  const faltaPagar = totalComDesconto - totalPago
  const troco = totalPago > totalComDesconto ? totalPago - totalComDesconto : 0

  // ============================================================================
  // FUNÇÕES DE VENDA
  // ============================================================================

  function adicionarPagamento() {
    // MÁGICA: Se o campo estiver vazio, ele assume que é o valor que falta!
    let valor = Number(valorPagamento)
    if (!valorPagamento) {
      valor = faltaPagar 
    }

    if (!valor || valor <= 0) return
    
    setListaPagamentos([...listaPagamentos, { 
      forma: formaPagamento, 
      valor 
    }])
    setValorPagamento('')
  }

 // --- FUNÇÃO DE IMPRESSÃO REESTRUTURADA (MODELO PROFISSIONAL) ---
  const imprimirReciboVenda = (idVenda: any, listaItens: any[], valorTotal: number, nomeCliente?: string, nomeVendedor?: string) => {
    const janela = window.open('', '', 'width=300,height=600');
    if (!janela) return;

    const dataCompleta = new Date();
    const dataHoje = dataCompleta.toLocaleDateString('pt-BR');
    const horaHoje = dataCompleta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 1. Calcula o Subtotal (soma dos itens sem desconto) para exibir corretamente
    const subtotalGeral = listaItens.reduce((acc: number, item: any) => {
        const prod = item.produto || item;
        const qtd = Number(item.quantidade || item.qtd || 1);
        const preco = Number(prod.precoVenda || item.precoUnit || 0);
        return acc + (qtd * preco);
    }, 0);

    const valorDesconto = subtotalGeral - valorTotal;
    // Verifica se houve desconto (com pequena margem para erro de arredondamento)
    const temDesconto = valorDesconto > 0.01;

    // 2. Monta a lista de itens com layout mais limpo
    const itensHtml = listaItens.map((item: any, index: number) => {
       const produto = item.produto || item;
       const nome = produto.nome ? produto.nome.toUpperCase() : 'ITEM SEM NOME';
       
       let qtd = Number(item.quantidade || item.qtd);
       if (isNaN(qtd) || qtd <= 0) qtd = 1;

       const precoUnit = Number(produto.precoVenda || item.precoUnit || 0);
       const totalItem = qtd * precoUnit;

       // Formata a quantidade: se for inteiro mostra "2", se for decimal mostra "1.5"
       const qtdFormatada = Number.isInteger(qtd) ? qtd.toString() : qtd.toFixed(2).replace('.',',');

       return `
        <div style="margin-bottom: 4px;">
          <div style="font-size: 11px; font-weight: bold;">
            Letra ${index + 1}. ${nome.substring(0,25)}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding-left: 10px;">
             <div>${qtdFormatada} UN x R$ ${precoUnit.toFixed(2)}</div>
             <div style="font-weight: bold;">R$ ${totalItem.toFixed(2)}</div>
          </div>
        </div>`;
    }).join('');

    // 3. Estilo CSS para impressão térmica
    const estiloHr = 'border: 0; border-top: 1px dashed #000; margin: 5px 0;';
    const estiloBody = 'font-family: "Courier New", Courier, monospace; width: 280px; font-size: 12px; margin: 0; padding: 5px 5px 20px 5px; color: #000; background-color: #fff;';

    const html = `
      <html>
      <head><title>Recibo #${idVenda}</title></head>
      <body style="${estiloBody}">
        
        <div style="text-align:center; font-weight:bold; font-size: 16px; margin-bottom: 2px;">VILA VERDE</div>
        <div style="text-align:center; font-size: 12px;">MATERIAIS DE CONSTRUCAO</div>
        <div style="text-align:center; font-size: 11px; margin-top: 2px;">Tel/WhatsApp: (41) 98438-7167</div>
        
        <hr style="${estiloHr}" />
        
        <div style="text-align:center; font-weight:bold; font-size: 13px;">*** RECIBO NÃO FISCAL ***</div>
        <div style="text-align:center; font-weight:bold; font-size: 14px; margin: 5px 0;">VENDA NÚMERO: #${idVenda}</div>
        
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span>DATA: ${dataHoje}</span>
            <span>HORA: ${horaHoje}</span>
        </div>
        
        <hr style="${estiloHr}" />
        
        <div style="font-size: 11px;">VENDEDOR: ${nomeVendedor ? nomeVendedor.toUpperCase().substring(0,20) : 'BALCAO'}</div>
        ${nomeCliente ? `<div style="font-size: 11px;">CLIENTE: ${nomeCliente.toUpperCase().substring(0,25)}</div>` : ''}
        
        <hr style="${estiloHr}" />
        
        <div style="font-weight:bold; margin-bottom: 5px; font-size: 12px;">DESCRIÇÃO DOS ITENS:</div>
        ${itensHtml}
        
        <hr style="${estiloHr}" />
        
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span>SUBTOTAL:</span>
          <span>R$ ${subtotalGeral.toFixed(2)}</span>
        </div>
        
        ${temDesconto ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span>DESCONTO APLICADO:</span>
          <span>- R$ ${valorDesconto.toFixed(2)}</span>
        </div>
        <hr style="${estiloHr}" />
        ` : ''}

        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 8px;">
          <span>TOTAL A PAGAR:</span>
          <span>R$ ${Number(valorTotal).toFixed(2)}</span>
        </div>
        
        <hr style="${estiloHr}" />
        
        <div style="text-align:center; font-size: 11px; margin-top: 10px;">Obrigado pela preferência!</div>
        <div style="text-align:center; font-size: 11px;">Volte sempre.</div>
        <br/>.
      </body>
      </html>
    `;
    janela.document.write(html);
    janela.document.close(); // Importante para alguns navegadores terminarem de carregar
    setTimeout(() => { janela.focus(); janela.print(); janela.close(); }, 500);
  };

// --- FUNÇÃO FINALIZAR VENDA (CORRIGIDA PARA NÃO TRAVAR O BACKEND) ---
  async function finalizarVendaNormal() {
    if (processandoVenda) return; 

    if (!caixaAberto) {
      alert('⚠️ Caixa fechado! Abra o caixa para continuar.');
      return;
    }

    if (carrinho.length === 0) {
      alert('⚠️ Carrinho vazio!');
      return;
    }

    setProcessandoVenda(true);
    setMensagemLoading('Processando venda...');

    try {
      // 1. ARRUMANDO OS ITENS (O erro do map vinha daqui ou dos pagamentos)
      // O seu carrinho tem o produto dentro da propriedade .produto
      const itensPayload = carrinho.map((item: any) => ({
        produtoId: item.produto ? item.produto.id : item.id, // Garante ID
        quantidade: Number(item.quantidade),
        precoUnit: Number(item.produto ? item.produto.precoVenda : item.precoVenda) // Nome que o back costuma usar
      }));

      // 2. ARRUMANDO PAGAMENTO (Para o backend não dar erro de map)
      // Se a lista de pagamentos estiver vazia, cria uma com o valor total
      let pagamentosPayload = listaPagamentos;
      if (pagamentosPayload.length === 0) {
        pagamentosPayload = [{ forma: formaPagamento, valor: totalComDesconto }];
      }

      // 3. Monta o corpo da venda BLINDADO
      const bodyDados = {
        total: totalCarrinho,
        desconto: Number(desconto) || 0,
        // Envia tanto o formato simples quanto o array para garantir compatibilidade
        formaPagamento: formaPagamento, 
        pagamentos: pagamentosPayload, 
        clienteId: clienteSelecionado ? Number(clienteSelecionado) : null,
        caixaId: caixaAberto.id,
        usuarioId: usuarioLogado?.id,
        itens: itensPayload
      };

      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyDados)
      });

      const dadosVenda = await res.json();

      if (res.ok) {
        buscarCaixaAberto()
        // --- SUCESSO! ---
        
        // Imprime o Recibo
        imprimirReciboVenda(
            dadosVenda.id, 
            carrinho, 
            totalComDesconto, 
            // Tenta achar o nome do cliente na lista
            clientes.find(c => String(c.id) === String(clienteSelecionado))?.nome, 
            usuarioLogado?.nome
        );

        alert(`✅ Venda #${dadosVenda.id} realizada!`);
        
        // Limpeza
        limparCarrinho();
        setModalPagamento(false); 
        
        // Atualiza dados
        carregarDados();
        buscarCaixaAberto();

      } else {
        console.error("Erro Back:", dadosVenda);
        alert('Erro ao finalizar: ' + (dadosVenda.error || dadosVenda.erro || 'Erro desconhecido no servidor'));
      }

    } catch (error) {
      console.error(error);
      alert('Erro de conexão. Verifique se o backend está rodando.');
    } finally {
      // ISSO GARANTE QUE O LOADING PARE DE GIRAR
      setProcessandoVenda(false);
      setMensagemLoading('');
    }
  }

// --- FUNÇÃO PARA ABRIR A EDIÇÃO (PREENCHE TUDO) ---
  function editarProduto(produto: any) {
    console.log("Editando:", produto); // Ajuda a ver se clicou certo

    // 1. DEFINE O ID (Isso avisa o botão Salvar que é uma EDIÇÃO/PUT)
    setIdProdutoEmEdicao(produto.id);

    // 2. PREENCHE OS CAMPOS DO FORMULÁRIO
    setNome(produto.nome || '');
    setCategoria(produto.categoria || '');
    setUnidade(produto.unidade || 'UN');
    setCodigoBarra(produto.codigoBarra || '');
    setSku(produto.sku || '');   // Se tiver esse campo
    setMarca(produto.marca || ''); // Se tiver esse campo
    
    // Números (convertendo para não dar erro no input)
    setEstoque(produto.estoque?.toString() || '0');
    setPrecoCusto(produto.precoCusto?.toString() || '0');
    setPrecoVenda(produto.precoVenda?.toString() || '0');
    setNcm(produto.ncm || '');
    setFornecedorId(produto.fornecedorId || '');

    // 3. ABRE A JANELA
    setModalProduto(true);
  }

  async function finalizarVendaComNFCe() {
    if (processandoVenda) return // Evita duplo clique
    
    if (!caixaAberto) {
      alert('⚠️ Caixa fechado! Abra o caixa para continuar.')
      return
    }

    if (carrinho.length === 0) {
      alert('⚠️ Carrinho vazio!')
      return
    }

    if (faltaPagar > 0.01) {
      alert('⚠️ Falta pagar R$ ' + Number(faltaPagar).toFixed(2))
      return
    }

    setProcessandoVenda(true)
    setMensagemLoading('Salvando venda...')

    try {
      // 1. Primeiro salva a venda
      const resVenda = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: totalCarrinho,
          clienteId: clienteSelecionado ? Number(clienteSelecionado) : null,
          caixaId: caixaAberto.id,
          usuarioId: usuarioLogado.id,
          entrega,
          enderecoEntrega: endereco || null,
          itens: carrinho.map(i => ({
            produtoId: i.produto.id,
            quantidade: i.quantidade,
            precoUnit: i.produto.precoVenda
          })),
          pagamentos: listaPagamentos
        })
      })

      if (!resVenda.ok) {
        const erro = await resVenda.json()
        alert('Erro ao salvar venda: ' + (erro.erro || 'Erro desconhecido'))
        setProcessandoVenda(false)
        setMensagemLoading('')
        return
      }

      const venda = await resVenda.json()

      // 2. Agora emite a NFC-e
      setMensagemLoading('Emitindo NFC-e na Sefaz...\nPor favor aguarde...')
      
      const resNota = await fetch(`${API_URL}/emitir-fiscal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendaId: venda.id })
      })

      if (resNota.ok) {
        const dataNota = await resNota.json()
        alert('✅ Venda finalizada com sucesso!\n📄 NFC-e emitida!')
        
        if (dataNota.url) {
          window.open(dataNota.url, '_blank')
        }
        
        limparCarrinho()
        setModalPagamento(false)
        await carregarDados()
        await buscarCaixaAberto()
      } else {
        const erroNota = await resNota.json()
        alert('⚠️ Venda salva, mas erro ao emitir NFC-e:\n' + (erroNota.erro || 'Erro desconhecido'))
        limparCarrinho()
        setModalPagamento(false)
        await carregarDados()
        await buscarCaixaAberto()
      }
    } catch (e) {
      console.error(e)
      alert('Erro ao processar venda')
    } finally {
      setProcessandoVenda(false)
      setMensagemLoading('')
    }
  }

  async function salvarOrcamento() {
    if (carrinho.length === 0) {
      alert('⚠️ Carrinho vazio!')
      return
    }

    try {
      const res = await fetch(`${API_URL}/orcamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: totalCarrinho,
          clienteId: clienteSelecionado || null,
          itens: carrinho.map(i => ({
            produtoId: i.produto.id,
            quantidade: i.quantidade,
            precoUnit: i.produto.precoVenda
          }))
        })
      })

      if (res.ok) {
        alert('✅ Orçamento salvo com sucesso!')
        limparCarrinho()
        setModalOrcamento(false)
        carregarDados()
      }
    } catch (e) {
      alert('Erro ao salvar orçamento')
    }
  }

  async function carregarOrcamento(orc: Orcamento) {
    setCarrinho(orc.itens.map(i => ({
      produto: i.produto,
      quantidade: Number(i.quantidade)
    })))
    
    if (orc.cliente) {
      setClienteSelecionado(String(orc.cliente.id))
    }
    
    setAba('caixa')
    alert('✅ Orçamento carregado no carrinho!')
  }

// ============================================================================
  // CALCULADORA AUTOMÁTICA DE PREÇOS
  // ============================================================================
  function handleCalcProduto(campo: string, valor: string) {
    const numValor = Number(valor);
    const novoForm = { ...formProduto, [campo]: valor };

    // 1. Se mexeu na Base de Compra ou Impostos -> Recalcula Custo
    if (['precoCompra', 'ipi', 'fretePerc', 'encargosPerc'].includes(campo)) {
      const compra = Number(novoForm.precoCompra || 0);
      const ipi = Number(novoForm.ipi || 0);
      const frete = Number(novoForm.fretePerc || 0);
      const enc = Number(novoForm.encargosPerc || 0);
      
      const custo = compra + (compra * (ipi + frete + enc) / 100);
      novoForm.precoCusto = custo.toFixed(2);
      
      // Se já tem margem, empurra pro preço final
      const margem = Number(novoForm.margemLucro || 0);
      if (margem > 0) novoForm.precoVenda = (custo + (custo * margem / 100)).toFixed(2);
    }

    // 2. Se mexeu na Margem de Lucro -> Recalcula Venda
    if (campo === 'margemLucro') {
      const custo = Number(novoForm.precoCusto || 0);
      novoForm.precoVenda = (custo + (custo * numValor / 100)).toFixed(2);
    }

    // 3. Se mexeu no Custo Manualmente -> Recalcula Venda
    if (campo === 'precoCusto') {
      const margem = Number(novoForm.margemLucro || 0);
      if (margem > 0) novoForm.precoVenda = (numValor + (numValor * margem / 100)).toFixed(2);
    }

    // 4. Se mexeu na Venda Manualmente -> Descobre a Margem (%)
    if (campo === 'precoVenda') {
      const custo = Number(novoForm.precoCusto || 0);
      if (custo > 0) novoForm.margemLucro = (((numValor - custo) / custo) * 100).toFixed(2);
    }

    setFormProduto(novoForm);
  }

  // ============================================================================
  // FUNÇÕES DE PRODUTOS
  // ============================================================================

  // Agora a função aceita um parâmetro opcional (dadosDoModal)
  async function salvarProduto(dadosDoModal?: any) {
    try {
      // 1. Prioridade: Se vier dados do modal, usa eles. Se não, usa as variáveis do estado.
      const payload = {
        nome: dadosDoModal?.nome || nome,
        categoria: dadosDoModal?.categoria || categoria,
        unidade: dadosDoModal?.unidade || unidade,
        codigoBarra: dadosDoModal?.codigoBarra || codigoBarra,
        sku: dadosDoModal?.sku || '', // Novo campo
        marca: dadosDoModal?.marca || '', // Novo campo
        
        // Converte números garantindo que não quebre
        estoque: Number(dadosDoModal?.estoque ?? estoque),
        precoCusto: Number(dadosDoModal?.precoCusto ?? precoCusto),
        precoVenda: Number(dadosDoModal?.precoVenda ?? precoVenda),
        
        ncm: dadosDoModal?.ncm || ncm,
        fornecedorId: (dadosDoModal?.fornecedorId || fornecedorId) ? Number(dadosDoModal?.fornecedorId || fornecedorId) : null,
      };

      console.log("📤 Enviando pro servidor:", payload);

      let url = 'https://api-vila-verde.onrender.com/produtos';
      let metodo = 'POST';

      // Se tiver ID, é edição (PUT)
      if (idProdutoEmEdicao) {
        url = `https://api-vila-verde.onrender.com/produtos/${idProdutoEmEdicao}`;
        metodo = 'PUT';
      }

      const resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resposta.ok) {
        const erro = await resposta.json();
        alert("Erro ao salvar: " + (erro.error || "Erro desconhecido"));
        return;
      }

      // SUCESSO!
      alert("✅ Produto salvo com sucesso!");
      setModalProduto(false); // Fecha o modal
      carregarProdutos(); // Atualiza a lista atrás
      
      // Limpa tudo
      setIdProdutoEmEdicao(null);
      setNome('');
      setCodigoBarra('');
      setPrecoVenda('0');

    } catch (error) {
      console.error(error);
      alert("Erro de conexão com o servidor.");
    }
  }

  // FUNÇÃO PARA BUSCAR/ATUALIZAR OS PRODUTOS
  async function carregarProdutos() {
    try {
      const response = await fetch('https://api-vila-verde.onrender.com/produtos');
      if (response.ok) {
        const dados = await response.json();
        setProdutos(dados); // Atualiza a variável que desenha a tabela
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  }

  async function excluirProduto(id: number) {
    if (!confirm('Deseja excluir este produto?')) return

    try {
      const res = await fetch(`${API_URL}/produtos/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('✅ Produto excluído!')
        carregarDados()
      }
    } catch (e) {
      alert('Erro ao excluir produto')
    }
  }

  // ============================================================================
  // FUNÇÕES DE CLIENTES
  // ============================================================================

  async function salvarCliente() {
    try {
      const metodo = formCliente.id ? 'PUT' : 'POST'
      const url = formCliente.id 
        ? `${API_URL}/clientes/${formCliente.id}`
        : `${API_URL}/clientes`

      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCliente)
      })

      if (res.ok) {
        alert('✅ Cliente salvo com sucesso!')
        setModalCliente(false)
        setFormCliente({})
        carregarDados()
      }
    } catch (e) {
      alert('Erro ao salvar cliente')
    }
  }

  async function excluirCliente(id: number) {
    if (!confirm('Deseja excluir este cliente?')) return

    try {
      const res = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('✅ Cliente excluído!')
        carregarDados()
      }
    } catch (e) {
      alert('Erro ao excluir cliente')
    }
  }

  async function adicionarHaver(clienteId: number) {
    const valor = prompt('Digite o valor do haver (crédito):')
    if (!valor) return

    try {
      const res = await fetch(`${API_URL}/clientes/${clienteId}/haver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: Number(valor) })
      })

      if (res.ok) {
        alert('✅ Haver adicionado!')
        carregarDados()
      }
    } catch (e) {
      alert('Erro ao adicionar haver')
    }
  }

  // ============================================================================
  // FUNÇÕES DE NOTA FISCAL
  // ============================================================================

  async function emitirNota(vendaId: number) {
    try {
      const res = await fetch(`${API_URL}/emitir-fiscal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendaId })
      })

      if (res.ok) {
        const data = await res.json()
        alert('✅ Nota emitida com sucesso!')
        if (data.url) {
          window.open(data.url, '_blank')
        }
        carregarDados()
      } else {
        const error = await res.json()
        alert('❌ Erro ao emitir nota: ' + (error.erro || 'Erro desconhecido'))
      }
    } catch (e) {
      alert('Erro ao emitir nota fiscal')
      console.error(e)
    }
  }

async function abrirEmissao(venda: Venda) {
    if (!confirm(`Deseja emitir NFC-e para a venda #${venda.id}?`)) return;

    try {
      // Chama a rota inteligente que criamos no backend
      const res = await fetch(`${API_URL}/emitir-fiscal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           vendaId: venda.id, // Manda só o ID e deixa o back se virar
           itens: [], // Manda vazio pro back buscar no banco
           total: venda.total
        })
      })

      const json = await res.json();
      
      if (res.ok) {
        alert('✅ Nota Emitida com Sucesso!');
        carregarDados(); // Recarrega a tela pra ficar verde
      } else {
        alert('❌ Erro: ' + (json.erro || 'Falha na emissão'));
      }
    } catch (error) {
      alert('Erro de conexão ao emitir nota.');
    }
  }

  async function cancelarNota(vendaId: number) {
    const justificativa = prompt('Digite a justificativa do cancelamento (mínimo 15 caracteres):')
    if (!justificativa || justificativa.length < 15) {
      alert('Justificativa muito curta!')
      return
    }

    try {
      const res = await fetch(`${API_URL}/cancelar-fiscal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendaId, justificativa })
      })

      if (res.ok) {
        alert('✅ Nota cancelada e estoque devolvido!')
        carregarDados()
      } else {
        const error = await res.json()
        alert('❌ Erro ao cancelar nota: ' + (error.erro || 'Erro desconhecido'))
      }
    } catch (e) {
      alert('Erro ao cancelar nota')
      console.error(e)
    }
  }

  // --- FUNÇÃO PARA CANCELAR VENDA NORMAL (SEM NOTA) ---
  async function cancelarVendaSimples(id: number) {
    if (!confirm('⚠️ Tem certeza? Isso irá cancelar a venda e devolver os itens ao estoque.')) return;

    try {
      // Tenta usar o método DELETE na rota de vendas
      const res = await fetch(`${API_URL}/vendas/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('✅ Venda cancelada e estoque estornado!');
        carregarDados(); // Atualiza a tabela
        buscarCaixaAberto(); // Atualiza o saldo do caixa
      } else {
        const erro = await res.json();
        alert('Erro ao cancelar: ' + (erro.error || 'Erro desconhecido'));
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao cancelar venda.');
    }
  }

  // ============================================================================
  // FUNÇÕES DE ENTREGAS
  // ============================================================================

  async function finalizarEntrega(vendaId: number) {
    if (!confirm('Confirmar que a entrega foi realizada?')) return

    try {
      const res = await fetch(`${API_URL}/entregas/${vendaId}/finalizar`, {
        method: 'POST'
      })

      if (res.ok) {
        alert('✅ Entrega finalizada!')
        carregarDados()
      }
    } catch (e) {
      alert('Erro ao finalizar entrega')
    }
  }



  // ============================================================================
  // RENDERIZAÇÃO - SISTEMA
  // ============================================================================

  const produtosFiltrados = produtos
    .filter(p => {
      const buscaLower = busca.toLowerCase()
      const nomeLower = p.nome.toLowerCase()
      const codigoLower = p.codigoBarra?.toLowerCase() || ''
      
      // Verifica se começa com o termo buscado (prioridade)
      return nomeLower.startsWith(buscaLower) || 
             codigoLower.startsWith(buscaLower) ||
             nomeLower.includes(buscaLower) ||
             codigoLower.includes(buscaLower)
    })
    .sort((a, b) => {
      // Ordena: produtos que começam com o termo aparecem primeiro
      const buscaLower = busca.toLowerCase()
      const aStarts = a.nome.toLowerCase().startsWith(buscaLower)
      const bStarts = b.nome.toLowerCase().startsWith(buscaLower)
      
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return 0
    })
    .slice(0, 30) // Limita a 30 produtos para melhor performance

    // --- CONTROLE DE NAVEGAÇÃO POR TECLADO ---
  const [indexSelecionado, setIndexSelecionado] = useState(0);

  // 1. Reseta a seleção quando a busca muda (para não selecionar algo invisível)
  useEffect(() => {
    setIndexSelecionado(0);
  }, [busca]); // Dependências: quando filtrar, volta pro zero

  // 2. Ouve as teclas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
if (e.key === 'Escape') {
        e.preventDefault();
        setModalOrcamento(false);      // Fecha Orçamento
        setModalResumoCaixa(false);    // Fecha Resumo do Caixa
        setModalTipoMovimento(null);   // Fecha Sangria/Suprimento
        // Se tiver outros modais (ex: finalizar venda), adicione aqui:
        // setModalFinalizarVenda(false); 
        return;
      }

      // 👇👇 ATALHO F3: NOVO PRODUTO 👇👇
      if (e.key === 'F3') {
        e.preventDefault(); // Não deixa abrir a pesquisa do navegador
        setIdProdutoEmEdicao(null); // 👈 OBRIGATÓRIO: Garante que o salvarProduto use POST
setNome('');
setCodigoBarra('');
setPrecoVenda('');
        
        // Comandos que pegamos da sua imagem:
        setFormProduto({});   // 1. Limpa o formulário
        setModalProduto(true); // 2. Abre a tela de cadastro
        
        return;
      }

      const isInputFocado = document.activeElement === inputBuscaRef.current;

      // 👇 NOVO: Verifica se o usuário está digitando em QUALQUER input (Modal, Sangria, etc)
      const tagAtual = document.activeElement?.tagName;
      const estouDigitando = tagAtual === 'INPUT' || tagAtual === 'TEXTAREA';
      
      // 1. BARRA DE ESPAÇO: Foca na busca se não estiver digitando
      if (e.key === ' ' && !estouDigitando) {
        e.preventDefault(); // Impede de rolar a página pra baixo
        inputBuscaRef.current?.focus(); // Foca no input!
        return;
      }

// 👇👇 2. TECLA X: ABRE O RESUMO DE CAIXA (NOVO) 👇👇
      if (e.key.toLowerCase() === 'x' && !estouDigitando) {
        e.preventDefault();
        // ⚠️ ATENÇÃO: Verifique se o nome do seu estado é esse mesmo.
        // Deve ser o mesmo set que você usa no botão verde lá em cima "Clique para Resumo"
        setModalResumoCaixa(true); 
        return;
      }
      // 👆👆 FIM DO BLOCO NOVO 👆👆

      // Se estiver digitando, ignora setas (exceto Cima/Baixo/Enter)
      if (isInputFocado && e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
      if (estouDigitando && !isInputFocado) return;
      if (produtosFiltrados.length === 0) return;

      // --- CÁLCULO AUTOMÁTICO DE COLUNAS ---
      // Começamos chutando 1 coluna
      let COLUNAS = 1; 
      
      const card0 = document.getElementById('card-produto-0');
      
      // Se o primeiro card existe, vamos ver quantos cards cabem na mesma linha (mesmo topo/offsetTop)
      if (card0) {
         let i = 1;
         // Enquanto o card 'i' estiver na mesma altura do card '0', continua contando
         while (document.getElementById(`card-produto-${i}`)?.offsetTop === card0.offsetTop) {
           i++;
           // Proteção para não travar se tiver mil produtos (para no máximo em 10 colunas)
           if (i > 10) break; 
         }
         // O loop parou no primeiro card da linha de baixo. Então 'i' é o total de colunas!
         COLUNAS = i;
      }
      // -------------------------------------

      switch (e.key) {
        case 'ArrowRight':
          setIndexSelecionado(prev => Math.min(prev + 1, produtosFiltrados.length - 1));
          break;
        case 'ArrowLeft':
          setIndexSelecionado(prev => Math.max(prev - 1, 0));
          break;
        case 'ArrowDown':
          if (isInputFocado) {
             inputBuscaRef.current?.blur(); // Tira o foco do input
             setIndexSelecionado(0);
          } else {
             setIndexSelecionado(prev => Math.min(prev + COLUNAS, produtosFiltrados.length - 1));
          }
          break;
        case 'ArrowUp':
          setIndexSelecionado(prev => Math.max(prev - COLUNAS, 0));
          break;
        case 'Enter':
           if (!isInputFocado) {
             e.preventDefault();
             // Importante: Garanta que a função aqui é a correta (adicionarAoCarrinho)
             if (produtosFiltrados[indexSelecionado]) {
                adicionarAoCarrinho(produtosFiltrados[indexSelecionado]);
             }
           }
           break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [produtosFiltrados, indexSelecionado]); // Atualiza quando a lista ou seleção muda

  // --- NOVO: ROLAGEM AUTOMÁTICA ---
  useEffect(() => {
    // Tenta encontrar o elemento do card selecionado no HTML
    const card = document.getElementById(`card-produto-${indexSelecionado}`);
    
    // Se achou, rola até ele
    if (card) {
      card.scrollIntoView({
        behavior: 'smooth', // Rolagem suave
        block: 'nearest',   // Rola o mínimo necessário (não puda a tela toda)
      });
    }
  }, [indexSelecionado]); // Executa sempre que a seleção muda

  // --- FUNÇÃO DE MOVIMENTAÇÃO (CORRIGIDA) ---
  async function confirmarMovimentacao() {
    if (!valorMovimento || Number(valorMovimento) <= 0) {
      return alert("Digite um valor válido!");
    }

    const tipo = modalTipoMovimento === 'entrada' ? 'SUPRIMENTO' : 'SANGRIA';
    const valor = Number(valorMovimento.replace(',', '.'));
    
    // 1. Salva no Backend
    try {
      const res = await fetch(`${API_URL}/caixa/movimentacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           caixaId: caixaAberto?.id,
           tipo,
           valor,
           observacao: descMovimento || (tipo === 'SUPRIMENTO' ? 'Suprimento' : 'Sangria'),
           usuarioId: usuarioLogado.id
        })
      });

      if (res.ok) {
        // 2. SUCESSO: Atualiza a lista local E recarrega o caixa do banco!
        const novaMov = {
            id: Date.now(), 
            tipo, valor, 
            descricao: descMovimento || tipo, 
            data: new Date().toISOString()
        };
        setMovimentacoes([...movimentacoes, novaMov]);
        
        await buscarCaixaAberto(); // <--- ISSO AQUI ATUALIZA O BOTÃO LÁ EM CIMA
        
        imprimirComprovante(tipo, valor, descMovimento, usuarioLogado?.nome || 'Balcão');
        alert(`✅ ${tipo} realizado com sucesso!`);
      } else {
        alert("Erro ao salvar movimentação no servidor.");
      }

    } catch (e) {
      console.error(e);
      alert("Erro de conexão.");
    }

    // Limpa e fecha
    setModalTipoMovimento(null);
    setValorMovimento('');
    setDescMovimento('');
  }

  // --- CÁLCULO DE SALDO COMPLETO (Vendas + Suprimentos - Sangrias) ---
  const saldoEmTempoReal = (() => {
    if (!caixaAberto) return 0;

    // 1. Soma das Vendas (Blindada contra erro de tipo)
    const totalVendas = vendas
      .filter(v => String(v.caixaId || '') === String(caixaAberto.id || '') && !v.nota_cancelada)
      .reduce((acc, v) => acc + Number(v.total), 0);

    // 2. Soma dos Suprimentos (Entradas)
    const totalSuprimentos = movimentacoes
      .filter(m => m.tipo === 'SUPRIMENTO')
      .reduce((acc, m) => acc + Number(m.valor), 0);

    // 3. Soma das Sangrias (Saídas)
    const totalSangrias = movimentacoes
      .filter(m => m.tipo === 'SANGRIA')
      .reduce((acc, m) => acc + Number(m.valor), 0);

    // 4. Conta Final: Inicial + Vendas + Entradas - Saídas
    return Number(caixaAberto.saldoInicial) + totalVendas + totalSuprimentos - totalSangrias;
  })();

  // ============================================================================
  // RENDERIZAÇÃO - LOGIN
  // ============================================================================

  if (!usuarioLogado) {
return <TelaLogin onLoginSucesso={handleLoginSucesso} />  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* 👇 ADICIONE ESTE BLOCO AQUI PARA MATAR A MOLDURA BRANCA 👇 */}
      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #1a1a1a;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      {/* 👆 FIM DO BLOCO 👆 */}

      {/* BARRA SUPERIOR (Agora Preta) */}
      <div style={{ 
        background: '#000000', // MUDAMOS PARA PRETO SÓLIDO
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {/* NOVA LOGO (Substitui o quadrado VV) */}
          <img 
            src="logoloja.png" 
            alt="Logo" 
            style={{ 
              height: '65px', // Altura boa para essa logo
              width: 'auto',  // Largura automática para não distorcer
              display: 'block' // Remove espaços extras abaixo da imagem
            }} 
          />

          <h1 style={{ margin: 0, fontWeight: '800', lineHeight: '1.1' }}>
            <span style={{ color: 'white', fontSize: '1.4rem', display: 'block' }}>
              MEGA LOJA DA CONSTRUÇÃO
            </span>
            <span style={{ color: '#4ade80', fontSize: '2.2rem', display: 'block' }}>
              VILA VERDE
            </span>
          </h1>
          </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {caixaAberto ? (
            <>
              <button 
                onClick={() => setModalResumoCaixa(true)}
                style={{ 
                  background: 'rgba(74, 222, 128, 0.2)',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #4ade80',
                  color: '#4ade80',
                  fontWeight: 'bold',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)'}
              >
                <div>MEU CAIXA - R$ {Number(caixaAberto.saldoAtual).toFixed(2)}</div>               
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  📊 Clique para Resumo
                </div>
              </button>
              
              {usuarioLogado.cargo === 'GERENTE' && (
                <>
                  <button
                    onClick={() => {
                      buscarTodosCaixas()
                      setModalGerenciarCaixas(true)
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#60a5fa',
                      border: '1px solid #60a5fa',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    👥 Ver Todos os Caixas
                  </button>
                </>
              )}
            </>
          ) : (
            <button 
              onClick={() => setModalAbrirCaixa(true)}
              style={{
                background: '#4ade80',
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ABRIR CAIXA
            </button>
          )}

          <div style={{ color: 'white' }}>
            👤 {usuarioLogado.nome}
          </div>

          <button
            onClick={() => setUsuarioLogado(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO */}
      <div style={{ 
        background: 'rgba(0,0,0,0.3)',
        padding: '10px 30px',
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {[
          { id: 'caixa', nome: '🛒 Caixa', permitido: true },
          { id: 'dashboard', nome: '📊 Dashboard', permitido: true },
          { id: 'produtos', nome: '📦 Produtos', permitido: true },
          { id: 'clientes', nome: '👥 Clientes', permitido: true },
          { id: 'orcamentos', nome: '📋 Orçamentos', permitido: true },
          { id: 'vendas', nome: '💰 Vendas', permitido: true },
          { id: 'financeiro', nome: '💳 Financeiro', permitido: usuarioLogado.cargo === 'GERENTE' },
          { id: 'notas', nome: '📄 Notas Fiscais', permitido: true },
          { id: 'entregas', nome: '🚛 Entregas', permitido: usuarioLogado.cargo === 'MOTORISTA' || usuarioLogado.cargo === 'GERENTE' },
          { id: 'equipe', nome: '👥 Equipe', permitido: usuarioLogado.cargo === 'GERENTE' }
        ].filter(a => a.permitido).map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              background: aba === a.id ? '#4ade80' : 'transparent',
              color: aba === a.id ? '#000' : 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: aba === a.id ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            {a.nome}
          </button>
        ))}
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ padding: '30px' }}>
        
        {/* ABA: CAIXA */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 200px)' }}>
            
            {/* ÁREA DE PRODUTOS */}
            <div style={{ 
              flex: 1, 
              background: 'white', 
              borderRadius: '15px', 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ marginBottom: '20px' }}>
  <input
    ref={inputBuscaRef} // 👈 O SEGREDO TÁ AQUI (Adicione essa linha)
    type="text"
    placeholder="🔍 Buscar produto por nome ou código..."
    value={busca}
    onChange={e => setBusca(e.target.value)}
    style={{
      width: '100%',
      padding: '15px',
      borderRadius: '10px',
      border: '2px solid #e2e8f0',
      fontSize: '1rem',
      boxSizing: 'border-box'
    }}
  />
</div>

              <div style={{
  display: 'grid',
  // ANTES ERA: repeat(5, 1fr)
  // AGORA É: "Preencha automático, com cards de no mínimo 190px"
  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', 
  gap: '15px',
  padding: '10px',
  maxHeight: 'calc(100vh - 220px)', 
  overflowY: 'auto',
  alignContent: 'start' // Isso ajuda os cards a não esticarem se forem poucos
}}>
                {busca.length === 0 ? (
                  <div style={{ 
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '100px 20px',
                    color: '#94a3b8'
                  }}>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🔍</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '10px' }}>
                      Digite algo para buscar produtos
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                      Use a barra de pesquisa acima
                    </div>
                  </div>
                ) : produtosFiltrados.length === 0 ? (
            // BLOCO: SE NÃO TEM PRODUTOS (BUSCA VAZIA)
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '60px',
              color: '#94a3b8'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📦</div>
              <div style={{ fontSize: '1.1rem' }}>
                Nenhum produto encontrado para "{busca}"
              </div>
            </div>
          ) : (
            // BLOCO: LISTA DE PRODUTOS (Mapeamento)
            // Tirei a chave '{' que estava aqui antes do map causando erro
            // BLOCO: LISTA DE PRODUTOS
            produtosFiltrados.map((p, index) => {
  // Lógica do Destaque (Se o nome tiver "ARAME" e for o primeiro, fica grande)
  const isCardGrande = p.nome.toUpperCase().includes('ARAME') && index === 0;
  const isSelecionado = index === indexSelecionado;

  return (
    <div
      key={p.id}
      id={`card-produto-${index}`}
      onClick={() => {
        setIndexSelecionado(index);
        adicionarAoCarrinho(p);
      }}
      style={{
        background: p.estoque <= 0
          ? 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)'
          : 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
        
        borderRadius: '12px',
        padding: '12px',
        textAlign: 'center',
        cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        color: 'white',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        opacity: p.estoque <= 0 ? 0.6 : 1,
        position: 'relative',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        
        // 👇 AQUI A SOLUÇÃO DA ALTURA
        gridRow: isCardGrande ? 'span 2' : 'span 1',
        minHeight: isCardGrande ? '450px' : '220px', 

        border: isSelecionado ? '3px solid #fbbf24' : '1px solid transparent',
        transform: isSelecionado ? 'scale(1.03)' : 'scale(1)',
        zIndex: isSelecionado ? 10 : 1
      }}
    >

      {/* BOTÕES DE AÇÃO */}
      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '5px', zIndex: 10 }}>
        <button
          onClick={(e) => { e.stopPropagation(); verDetalhes(p); }}
          tabIndex={-1}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px',
            width: '26px', height: '26px', cursor: 'pointer', color: '#fff',
            display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)'
          }}
        >👁️</button>

        <button
                    onClick={(e) => {
                      e.stopPropagation(); // Não deixa clicar no card (não adiciona no carrinho)
                      editarProduto(p);    // <--- CHAMA A NOSSA FUNÇÃO AQUI
                    }}
                    title="Editar Produto"
                    style={{
                      /* ... seus estilos existentes ... */
                      background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '4px',
                      width: '26px', height: '26px', cursor: 'pointer', color: '#fbbf24',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)'
                    }}
                  >
                    ✏️
                  </button>
      </div>

      {/* ÍCONE */}
      <div style={{ fontSize: isCardGrande ? '4rem' : '2rem', marginTop: '10px', marginBottom: '5px' }}>
          {isCardGrande ? '🔥' : '📦'} 
      </div>

      {/* NOME DO PRODUTO */}
      <div 
        title={p.nome}
        style={{ 
          fontWeight: 'bold', 
          marginBottom: '5px', 
          fontSize: isCardGrande ? '1.2rem' : '0.9rem', 
          lineHeight: '1.2',
          height: isCardGrande ? 'auto' : '3.6em',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {p.nome}
      </div>

      {/* PREÇO E ESTOQUE */}
      <div style={{ width: '100%' }}>
        <div style={{ fontSize: isCardGrande ? '1.8rem' : '1.3rem', fontWeight: 'bold', marginBottom: '2px', color: '#4ade80' }}>
          R$ {Number(p.precoVenda).toFixed(2)}
        </div>

        <div style={{ fontSize: '0.8rem', opacity: 0.8, paddingBottom: '5px' }}>
          {p.estoque <= 0 ? 'SEM ESTOQUE' : `Estoque: ${p.estoque} ${p.unidade || 'UN'}`}
        </div>
      </div>

      {/* Dica de Teclado */}
      {isSelecionado && <div style={{ fontSize: '0.65rem', color: '#fbbf24', position: 'absolute', bottom: '2px' }}>[ENTER]</div>}

    </div>
  )
})
         )}</div>
            </div>

            {/* CARRINHO */}
            <div style={{ 
              width: '480px', 
              background: 'white', 
              borderRadius: '15px', 
              padding: '20px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#1e3c72' }}>
                🛒 Carrinho
              </h2>

              {/* ITENS */}
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                marginBottom: '20px'
              }}>
                {carrinho.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    color: '#94a3b8'
                  }}>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🛒</div>
                    <div style={{ fontSize: '1.1rem' }}>Carrinho vazio</div>
                    <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                      Adicione produtos para iniciar a venda
                    </div>
                  </div>
                ) : (
                  carrinho.map((item, i) => (
                    <div 
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '15px',
                        borderBottom: '1px solid #e2e8f0',
                        gap: '10px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {item.produto.nome}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                         R$ {Number(item.produto.precoVenda).toFixed(2)} x {item.quantidade}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => alterarQuantidade(item.produto.id, item.quantidade - 1)}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '5px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          −
                        </button>
                        
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => alterarQuantidade(item.produto.id, Number(e.target.value))}
                          style={{
                            width: '50px',
                            padding: '5px',
                            textAlign: 'center',
                            border: '1px solid #e2e8f0',
                            borderRadius: '5px'
                          }}
                        />

                        <button
                          onClick={() => alterarQuantidade(item.produto.id, item.quantidade + 1)}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '5px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          +
                        </button>

                        <div style={{ fontWeight: 'bold', width: '80px', textAlign: 'right' }}>
                          R$ {(Number(item.produto.precoVenda) * Number(item.quantidade)).toFixed(2)}
                        </div>

                        <button
                          onClick={() => removerDoCarrinho(item.produto.id)}
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '5px',
                            border: 'none',
                            background: '#fee2e2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '1.1rem'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* RESUMO */}
              <div style={{ 
                background: '#f8fafc', 
                padding: '20px', 
                borderRadius: '10px',
                marginBottom: '15px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.95rem',
                  marginBottom: '8px',
                  color: '#64748b'
                }}>
                  <span>Subtotal:</span>
                  <span>R$ {Number(totalCarrinho).toFixed(2)}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#1e3c72',
                  paddingTop: '10px',
                  borderTop: '2px solid #e2e8f0'
                }}>
                  <span>TOTAL:</span>
                  <span>R$ {Number(totalCarrinho).toFixed(2)}</span>
                </div>
              </div>

              {/* BOTÕES */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button 
            onClick={() => {
              if (carrinho.length === 0) return alert("O carrinho está vazio!");
              setModalOrcamento(true);
            }}
            style={{
              flex: 1,
              padding: '15px',
              borderRadius: '8px',
              border: '2px solid #cbd5e1',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
            }}
          >
            📄 ORÇAMENTO
          </button>

                <button
            // 👇 SUBSTITUA A LINHA DO ONCLICK POR ESTE BLOCO:
            onClick={() => {
              setModalPagamento(true); // Abre o seu modal normal
              setVendedorSelecionadoId(usuarioLogado?.id); // Já seleciona quem tá logado
              setMostrarComissao(false); // Garante que a aba secreta comece fechada
            }}
                  disabled={carrinho.length === 0}
                  style={{
                    flex: 1,
                    padding: '15px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: carrinho.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: carrinho.length === 0 ? 0.5 : 1,
                    fontSize: '1rem'
                  }}
                >
                  ✓ FINALIZAR VENDA
                </button>
              </div>

              {carrinho.length > 0 && (
                <button
                  onClick={limparCarrinho}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    background: '#fef2f2',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🗑️ Limpar Carrinho
                </button>
              )}
            </div>
          </div>
        )}

        {/* ABA: DASHBOARD */}
        {aba === 'dashboard' && dashboard && (
          <div style={{ 
            background: 'white', 
            borderRadius: '15px', 
            padding: '30px',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72', marginBottom: '30px' }}>
              📊 Dashboard de Vendas
            </h2>

            {/* CARDS */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                  Vendas Hoje
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {dashboard.vendasHoje}
                </div>
                <div style={{ fontSize: '1.2rem', marginTop: '8px' }}>
                  R$ {Number(dashboard.totalHoje).toFixed(2)}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                  Vendas do Mês
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {dashboard.vendasMes}
                </div>
                <div style={{ fontSize: '1.2rem', marginTop: '8px' }}>
                  R$ {Number(dashboard.totalMes).toFixed(2)}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                  Ticket Médio
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  R$ {Number(dashboard.ticketMedio).toFixed(2)}
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px' }}>
                  Total de Pedidos
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  {vendas.length}
                </div>
              </div>
            </div>

            {/* TOP 5 PRODUTOS */}
            <div style={{ 
              background: '#f8fafc', 
              padding: '25px', 
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ marginTop: 0, color: '#1e3c72', marginBottom: '20px' }}>
                🏆 Top 5 Produtos Mais Vendidos (Este Mês)
              </h3>
              
              {dashboard.top5Produtos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  Nenhuma venda registrada este mês
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dashboard.top5Produtos.map((item: any, index: number) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        padding: '15px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#d97706' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        color: index < 3 ? 'white' : '#64748b'
                      }}>
                        {index + 1}º
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', color: '#1e3c72' }}>
                          {item.nome}
                        </div>
                      </div>

                      <div style={{
                        padding: '6px 15px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        {item.qtd} vendidos
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: PRODUTOS */}
        {aba === 'produtos' && (
          <div style={{ background: 'white', borderRadius: '15px', padding: '30px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, color: '#1e3c72' }}>📦 Produtos</h2>
              <button
                onClick={() => {
                  setIdProdutoEmEdicao(null); // 👈 OBRIGATÓRIO: Garante que o salvarProduto use POST
setNome('');
setCodigoBarra('');
setPrecoVenda('');
                  setFormProduto({})
                  setModalProduto(true)
                }}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                + Novo Produto
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Nome</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Código</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Preço Venda</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Estoque</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Categoria</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.slice(0, produtosVisiveis).map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{p.nome}</td>
                      <td style={{ padding: '15px', color: '#64748b' }}>{p.codigoBarra || '-'}</td>
                      <td style={{ padding: '15px', color: '#059669', fontWeight: 'bold' }}>
                        R$ {Number(p.precoVenda).toFixed(2)}
                      </td>
                      <td style={{ 
                        padding: '15px',
                        color: p.estoque < 10 ? '#dc2626' : '#059669',
                        fontWeight: 'bold'
                      }}>
                        {p.estoque} {p.unidade || 'UN'}
                      </td>
                      <td style={{ padding: '15px', color: '#64748b' }}>{p.categoria || '-'}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button
                          onClick={() => editarProduto(p)}
                          style={{
                            padding: '6px 12px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginRight: '8px'
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => excluirProduto(p.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Botão Carregar Mais */}
              {produtosVisiveis < produtos.length && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    onClick={() => setProdutosVisiveis(prev => prev + 30)}
                    style={{
                      padding: '12px 30px',
                      background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    📦 Carregar mais produtos ({produtos.length - produtosVisiveis} restantes)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: CLIENTES */}
        {aba === 'clientes' && (
          <div style={{ background: 'white', borderRadius: '15px', padding: '30px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, color: '#1e3c72' }}>👥 Clientes</h2>
              <button
                onClick={() => {
                  setFormCliente({})
                  setModalCliente(true)
                }}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                + Novo Cliente
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Nome</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>CPF/CNPJ</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Celular</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Saldo Haver</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>{c.nome}</td>
                      <td style={{ padding: '15px', color: '#64748b' }}>{c.cpfCnpj || '-'}</td>
                      <td style={{ padding: '15px', color: '#64748b' }}>{c.celular || '-'}</td>
                      <td style={{ 
                        padding: '15px',
                        color: Number(c.saldoHaver) > 0 ? '#059669' : '#64748b',
                        fontWeight: 'bold'
                      }}>
                        R$ {Number(c.saldoHaver).toFixed(2)}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setFormCliente(c)
                            setModalCliente(true)
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginRight: '8px'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => adicionarHaver(c.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#dcfce7',
                            color: '#059669',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            marginRight: '8px'
                          }}
                        >
                          💰 Haver
                        </button>
                        <button
                          onClick={() => excluirCliente(c.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: ORÇAMENTOS */}
        {aba === 'orcamentos' && (
          <div style={{ background: 'white', borderRadius: '15px', padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72', marginBottom: '25px' }}>
              📋 Orçamentos
            </h2>

            {orcamentos.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>📋</div>
                <div style={{ fontSize: '1.2rem' }}>Nenhum orçamento registrado</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {orcamentos.map(orc => (
                  <div 
                    key={orc.id}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px' }}>
                        Orçamento #{orc.id}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}>
                        Data: {new Date(orc.data).toLocaleDateString()}
                      </div>
                      {orc.cliente && (
                        <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '5px' }}>
                          Cliente: {orc.cliente.nome}
                        </div>
                      )}
                      <div style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.2rem' }}>
                        Total: R$ {Number(orc.total).toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => carregarOrcamento(orc)}
                      style={{
                        padding: '12px 25px',
                        background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      🛒 Usar Orçamento
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: VENDAS */}
        {aba === 'vendas' && (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s' }}>
          
          {/* CABEÇALHO COM FILTROS */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72', display: 'flex', alignItems: 'center', gap: '10px' }}>
              💰 Histórico de Vendas
            </h2>

            {/* BARRA DE FILTROS */}
            <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
              
              {/* Filtro Vendedor */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>Filtrar por Vendedor</label>
                <select 
                  value={filtroVendedor} 
                  onChange={e => setFiltroVendedor(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">Todos os Vendedores</option>
                  {/* Pega lista única de vendedores que já venderam algo */}
                  {Array.from(new Set(vendas.map(v => v.usuario?.nome || 'Desconhecido'))).map(nome => (
                    <option key={nome} value={nome}>{nome}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Data Inicio */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>De (Data)</label>
                <input 
                  type="date" 
                  value={dataInicio} 
                  onChange={e => setDataInicio(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>

              {/* Filtro Data Fim */}
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>Até (Data)</label>
                <input 
                  type="date" 
                  value={dataFim} 
                  onChange={e => setDataFim(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>

              {/* Botão Limpar */}
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button 
                  onClick={() => { setFiltroVendedor(''); setDataInicio(''); setDataFim(''); }}
                  style={{ padding: '10px 20px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', height: '42px' }}
                >
                  Limpar Filtros
                </button>
              </div>

            </div>
          </div>

          {/* TABELA DE RESULTADOS */}
          <div style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '15px' }}>ID</th>
                  <th style={{ padding: '15px' }}>Data</th>
                  <th style={{ padding: '15px' }}>Vendedor</th> {/* COLUNA NOVA */}
                  <th style={{ padding: '15px' }}>Cliente</th>
                  <th style={{ padding: '15px' }}>Total</th>
                  <th style={{ padding: '15px' }}>Status</th>
                  <th style={{ padding: '15px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendas
                  .slice() // Cria uma cópia pra não estragar o original
                  .reverse() // Mostra as mais recentes primeiro
                  .filter(v => {
                    // 1. Filtro Vendedor
                    if (filtroVendedor && v.usuario?.nome !== filtroVendedor) return false;
                    
                    // 2. Filtro Datas
                    const dataVenda = new Date(v.data).setHours(0,0,0,0);
                    if (dataInicio && dataVenda < new Date(dataInicio).setHours(0,0,0,0)) return false;
                    if (dataFim && dataVenda > new Date(dataFim).setHours(0,0,0,0)) return false;

                    return true;
                  })
                  .map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>#{v.id}</td>
                      <td style={{ padding: '15px', color: '#64748b' }}>{new Date(v.data).toLocaleString()}</td>
                      
                      {/* MOSTRAR QUEM VENDEU */}
                      <td style={{ padding: '15px' }}>
                         <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                           {v.usuario?.nome || 'Sistema'}
                         </span>
                      </td>

                      <td style={{ padding: '15px' }}>{v.cliente ? v.cliente.nome : 'Cliente Balcão'}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: '#059669' }}>R$ {Number(v.total).toFixed(2)}</td>
                      <td style={{ padding: '15px' }}>
                        {v.nota_emitida 
                          ? <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ NFC-e OK</span>
                          : <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>SEM NOTA</span>
                        }
                      </td>
                     <td style={{ padding: '15px', display: 'flex', gap: '8px', alignItems: 'center' }}>
  
  {/* 1. BOTÃO REIMPRIMIR RECIBO (CORRIGIDO) */}
  <button
    onClick={() => {
      // 👇 O TRUQUE: (v as any) permite checar .produtos sem dar erro vermelho
      const listaItens = v.itens || (v as any).produtos || (v as any).VendaItem || [];
      
      imprimirReciboVenda(
        v.id, 
        listaItens, 
        v.total, 
        v.cliente?.nome, 
        v.usuario?.nome
      );
    }}
    title="Reimprimir Recibo"
    style={{
      padding: '6px 10px', 
      background: 'white', 
      border: '1px solid #cbd5e1', 
      borderRadius: '6px', 
      cursor: 'pointer',
      fontSize: '1.1rem'
    }}
  >
    🖨️
  </button>

  {/* 2. BOTÃO EMITIR NFC-E */}
  <button 
    onClick={() => abrirEmissao(v)} 
    disabled={v.nota_emitida || v.nota_cancelada} 
    style={{ 
      padding: '6px 12px', 
      background: v.nota_emitida ? '#cbd5e1' : '#dcfce7', 
      color: v.nota_emitida ? 'white' : '#166534', 
      border: '1px solid #86efac', 
      borderRadius: '6px', 
      cursor: v.nota_emitida ? 'not-allowed' : 'pointer', 
      fontWeight: 'bold', 
      fontSize: '0.85rem' 
    }}
  >
    📄 Emitir NFC-e
  </button>

  {/* 3. BOTÃO CANCELAR INTELIGENTE */}
  {v.nota_emitida ? (
    <button 
      onClick={() => cancelarNota(v.id)} 
      disabled={v.nota_cancelada}
      style={{ 
        padding: '6px 12px', 
        background: '#fee2e2', 
        color: '#991b1b', 
        border: '1px solid #fca5a5', 
        borderRadius: '6px', 
        cursor: v.nota_cancelada ? 'not-allowed' : 'pointer', 
        fontWeight: 'bold', 
        fontSize: '0.85rem' 
      }}
    >
      ❌ Cancelar NF
    </button>
  ) : (
    <button 
      onClick={() => cancelarVendaSimples(v.id)} 
      style={{ 
        padding: '6px 12px', 
        background: '#fff1f2', 
        color: '#be123c', 
        border: '1px solid #fda4af', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: 'bold', 
        fontSize: '0.85rem' 
      }}
    >
      🗑️ Cancelar
    </button>
  )}

</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>  
    )}
          
        {/* ABA: FINANCEIRO */}
        {aba === 'financeiro' && (
          <div style={{ background: 'white', borderRadius: '15px', padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72', marginBottom: '25px' }}>
              💳 Contas a Receber
            </h2>

            {contasReceber.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>💳</div>
                <div style={{ fontSize: '1.2rem' }}>Nenhuma conta a receber</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Cliente</th>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Valor</th>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Vencimento</th>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contasReceber.map((c: any) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '15px', fontWeight: 'bold' }}>
                          {c.cliente?.nome || 'Cliente não informado'}
                        </td>
                        <td style={{ padding: '15px', color: '#059669', fontWeight: 'bold' }}>
                          R$ {Number(c.valor).toFixed(2)}
                        </td>
                        <td style={{ padding: '15px', color: '#64748b' }}>
                          {new Date(c.data).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <span style={{ 
                            background: c.status === 'PAGO' ? '#dcfce7' : '#fef3c7',
                            color: c.status === 'PAGO' ? '#059669' : '#d97706',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA: NOTAS FISCAIS */}
        {aba === 'notas' && (
          <div style={{ background: 'white', borderRadius: '15px', padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72', marginBottom: '25px' }}>
              📄 Notas Fiscais
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Venda</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Data</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Cliente</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Valor</th>
                    <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Status</th>
                    <th style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.filter(v => v.nota_emitida).map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold' }}>#{v.id}</td>
                      <td style={{ padding: '15px', color: '#64748b' }}>
                        {new Date(v.data).toLocaleString()}
                      </td>
                      <td style={{ padding: '15px' }}>
                        {v.cliente?.nome || 'Sem cadastro'}
                      </td>
                      <td style={{ padding: '15px', color: '#059669', fontWeight: 'bold' }}>
                        R$ {Number(v.total).toFixed(2)}
                      </td>
                      <td style={{ padding: '15px' }}>
                        {v.nota_cancelada ? (
                          <span style={{ 
                            background: '#fee2e2', 
                            color: '#dc2626',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}>
                            CANCELADA
                          </span>
                        ) : (
                          <span style={{ 
                            background: '#dcfce7', 
                            color: '#059669',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}>
                            ATIVA
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        {v.urlFiscal && (
                          <a 
                            href={v.urlFiscal} 
                            target="_blank"
                            style={{
                              padding: '6px 12px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              border: 'none',
                              borderRadius: '6px',
                              textDecoration: 'none',
                              display: 'inline-block',
                              marginRight: '8px'
                            }}
                          >
                            📄 Ver
                          </a>
                        )}
                        {!v.nota_cancelada && (
                          <button
                            onClick={() => cancelarNota(v.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            ❌ Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ 
              marginTop: '30px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ marginTop: 0, color: '#1e3c72' }}>
                🔔 Emitir Nova NFC-e
              </h3>
              <p style={{ color: '#64748b', marginBottom: '15px' }}>
                As notas fiscais são emitidas automaticamente ao finalizar uma venda.
                Para emitir manualmente, selecione uma venda sem nota fiscal no histórico de vendas.
              </p>
            </div>
          </div>
        )}

        {/* ABA: ENTREGAS */}
        {aba === 'entregas' && (
          <div style={{ background: 'white', borderRadius: '15px', padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72', marginBottom: '25px' }}>
              🚛 Entregas Pendentes
            </h2>

            {entregas.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🚛</div>
                <div style={{ fontSize: '1.2rem' }}>Nenhuma entrega pendente</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {entregas.map(e => (
                  <div 
                    key={e.id}
                    style={{
                      border: '2px solid #fbbf24',
                      borderRadius: '12px',
                      padding: '20px',
                      background: '#fef3c7'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px' }}>
                          Pedido #{e.id}
                        </div>
                        <div style={{ color: '#78350f', fontSize: '0.9rem', marginBottom: '5px' }}>
                          Cliente: {e.cliente?.nome || 'Não informado'}
                        </div>
                        <div style={{ color: '#78350f', fontSize: '0.9rem', marginBottom: '5px' }}>
                          📍 Endereço: {e.endereco}
                        </div>
                        <div style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px' }}>
                          Total: R$ {Number(e.total).toFixed(2)}
                        </div>
                      </div>

                      <button
                        onClick={() => finalizarEntrega(e.id)}
                        style={{
                          padding: '12px 25px',
                          background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          height: 'fit-content'
                        }}
                      >
                        ✓ Finalizar Entrega
                      </button>
                    </div>

                    <div style={{ 
                      borderTop: '1px solid #fbbf24',
                      paddingTop: '15px',
                      marginTop: '15px'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                        Itens do pedido:
                      </div>
                      {e.itens.map((item, i) => (
                        <div key={i} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          fontSize: '0.9rem',
                          color: '#78350f'
                        }}>
                          <span>{item.quantidade}x {item.produto.nome}</span>
                          <span>R$ {(Number(item.quantidade) * Number(item.precoUnit)).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: EQUIPE */}
        {aba === 'equipe' && (
          <TelaEquipe />
        )}

      </div>

      {/* MODAIS */}

      {/* MODAL: ABRIR CAIXA */}
      {modalAbrirCaixa && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            width: '400px'
          }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72' }}>💰 Abrir Caixa</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Valor de Abertura
              </label>
              <input
                type="number"
                value={valorAbertura}
                onChange={e => setValorAbertura(e.target.value)}
                placeholder="R$ 0,00"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={abrirCaixa}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✓ Abrir Caixa
              </button>
              <button
                onClick={() => setModalAbrirCaixa(false)}
                style={{
                  padding: '12px 20px',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAGAMENTO */}
      {modalPagamento && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', // Escureci um pouco mais pro neon brilhar
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px',
          backdropFilter: 'blur(5px)' // Efeito de desfoque no fundo
        }}>
          
          {/* WRAPPER PARA SEGURAR MODAL + PAINEL LATERAL */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', maxHeight: '95vh' }}>

            {/* --- O SEU MODAL ORIGINAL (CAIXA BRANCA) --- */}
            <div style={{
              background: 'white', borderRadius: '15px', width: '1000px', maxWidth: '90vw',
              height: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
              
              {/* Cabeçalho */}
              <div style={{ padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <h2 style={{ margin: 0, color: '#1e3c72' }}>💸 Finalizar Venda</h2>
                <button onClick={() => setModalPagamento(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              {/* Conteúdo */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* COLUNA ESQUERDA: Resumo + Vendedor */}
                <div style={{ width: '40%', padding: '20px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                  
                  <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#64748b', fontSize: '1rem' }}>Resumo do Pedido</h3>
                  
                  {/* 👇 NOVO: SELETOR DE VENDEDOR 👇 */}
                  <div style={{ marginBottom: '15px' }}>
                    <select
                      value={vendedorSelecionadoId}
                      onChange={(e) => setVendedorSelecionadoId(Number(e.target.value))}
                      style={{ 
                        width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #4ade80', 
                        background: 'white', color: '#1e3c72', fontWeight: 'bold' 
                      }}
                    >
                      <option value={usuarioLogado.id}>Vendedor: {usuarioLogado.nome} (Você)</option>
                      {/* Se tiver a lista de usuarios carregada, faça o map aqui */}
                      {/* usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>) */}
                    </select>
                  </div>

                  {/* ÁREA COM SCROLL - LISTA DE ITENS */}
                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
                    {carrinho.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '10px', color: '#1e3c72', padding: '8px', background: 'white', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span>{item.quantidade}x {item.produto.nome}</span>
                        <span style={{ fontWeight: 'bold' }}>R$ {(Number(item.quantidade) * Number(item.produto.precoVenda)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* TOTAL FIXO NO FINAL */}
                  <div style={{ paddingTop: '15px', borderTop: '2px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#64748b', marginBottom: '5px' }}>
                      <span>Subtotal:</span>
                      <span>R$ {Number(totalCarrinho).toFixed(2)}</span>
                    </div>
                    {valorDesconto > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#dc2626', marginBottom: '5px' }}>
                        <span>Desconto:</span>
                        <span>- R$ {valorDesconto.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Total a Pagar:</span>
                        <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#1e3c72' }}>R$ {Number(totalComDesconto).toFixed(2)}</span>
                      </div>
                      
                      {/* 👇 NOVO: BOTÃO DO OLHO MÁGICO (COMISSÃO) 👇 */}
                      <button
                        onClick={() => setMostrarComissao(!mostrarComissao)}
                        title="Ver Comissão"
                        style={{
                          background: mostrarComissao ? '#4ade80' : '#e2e8f0',
                          color: mostrarComissao ? '#064e3b' : '#64748b',
                          border: 'none', borderRadius: '50%', width: '45px', height: '45px',
                          fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: mostrarComissao ? '0 0 15px #4ade80' : 'none'
                        }}
                      >
                        {mostrarComissao ? '👁️' : '💰'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: Pagamento, Cliente, Entrega (SEU CÓDIGO ORIGINAL) */}
                <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
                  
                  {/* Cliente */}
                  <div style={{ marginBottom: '25px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#1e3c72' }}>👤 Cliente (Opcional)</label>
                    <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }}>
                      <option value="">Sem cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  
                  {/* Desconto */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#1e3c72' }}>🏷️ Desconto (R$) Opcional</label>
                    <input type="number" value={desconto} onChange={e => setDesconto(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem' }} />
                  </div>

                  {/* Forma de Pagamento */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#1e3c72' }}>💳 Forma de Pagamento</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <input type="number" value={valorPagamento} onChange={e => setValorPagamento(e.target.value)} placeholder={`R$ ${Math.max(0, faltaPagar).toFixed(2)}`} style={{ width: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                      <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <option value="Dinheiro">💵 Dinheiro</option>
                        <option value="Pix">💠 Pix</option>
                        <option value="Cartão Crédito">💳 Crédito</option>
                        <option value="Cartão Débito">💳 Débito</option>
                        <option value="A Prazo">📅 A Prazo</option>
                        <option value="Haver">🤝 Haver</option>
                      </select>
                      <button onClick={adicionarPagamento} disabled={faltaPagar <= 0.01} style={{ padding: '0 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: faltaPagar <= 0.01 ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: faltaPagar <= 0.01 ? 0.5 : 1 }}>+</button>
                    </div>

                    {/* Lista de Pagamentos */}
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                      {listaPagamentos.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '10px' }}>Nenhum pagamento adicionado</div>
                      ) : (
                        listaPagamentos.map((p, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < listaPagamentos.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                            <span>{p.forma}: R$ {Number(p.valor).toFixed(2)}</span>
                            <button onClick={() => setListaPagamentos(listaPagamentos.filter((_, idx) => idx !== i))} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✖</button>
                          </div>
                        ))
                      )}
                      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span style={{ color: faltaPagar > 0 ? '#dc2626' : '#059669' }}>Falta: R$ {Number(Math.max(0, faltaPagar)).toFixed(2)}</span>
                        {troco > 0 && <span style={{ color: '#059669' }}>Troco: R$ {Number(troco).toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Entrega (MANTIDO SEU CÓDIGO) */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={entrega} onChange={e => { setEntrega(e.target.checked); if (e.target.checked && clienteSelecionado) { const cliente = clientes.find(c => c.id === Number(clienteSelecionado)); if (cliente?.endereco) { setEndereco(cliente.endereco); setEnderecoSelecionado(1); } } }} />
                    🚛 É para entregar?
                  </label>

                  {entrega && (
                     <div style={{ marginBottom: '20px' }}>
                       <input type="text" placeholder="Digite o endereço de entrega..." value={endereco} onChange={e => setEndereco(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                     </div>
                  )}

                  {/* Botões de Finalização */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button onClick={finalizarVendaNormal} disabled={faltaPagar > 0.01 || processandoVenda} style={{ flex: 1, padding: '15px', background: (faltaPagar > 0.01 || processandoVenda) ? '#e2e8f0' : 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: (faltaPagar > 0.01 || processandoVenda) ? 'not-allowed' : 'pointer', opacity: processandoVenda ? 0.6 : 1 }}>
                      📄 VENDA NORMAL <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.9 }}>(Só recibo)</div>
                    </button>
                    <button onClick={finalizarVendaComNFCe} disabled={faltaPagar > 0.01 || processandoVenda} style={{ flex: 1, padding: '15px', background: (faltaPagar > 0.01 || processandoVenda) ? '#e2e8f0' : 'linear-gradient(135deg, #4ade80, #22c55e)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: (faltaPagar > 0.01 || processandoVenda) ? 'not-allowed' : 'pointer', opacity: processandoVenda ? 0.6 : 1 }}>
                      ✅ VENDA COM NFC-e <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.9 }}>(Nota fiscal)</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* --- PAINEL LATERAL DE COMISSÃO (APARECE QUANDO CLICA NO OLHO) --- */}
            {mostrarComissao && (
              <div style={{
                width: '300px', background: 'white', borderRadius: '15px', padding: '20px',
                animation: 'slideIn 0.3s ease-out', boxShadow: '0 0 30px rgba(74, 222, 128, 0.4)',
                border: '4px solid #4ade80', alignSelf: 'stretch', display: 'flex', flexDirection: 'column'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#064e3b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                  🤑 Previsão de Ganho
                </h3>
                
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
                  {carrinho.map((item, index) => {
                    // 1. Cálculos
                    const pct = pegarPorcentagem(item.produto);
                    const valorComissao = Number(item.produto.precoVenda) * item.quantidade * pct;

                    // 👇 O SEGREDO ESTÁ AQUI: TEM QUE TER O 'return' E A DIV 'PAI'
                    return (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '4px' }}>
                        
                        {/* Coluna Esquerda (Nome + Categoria) */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#475569', fontWeight: 'bold' }}>
                            {item.quantidade}x {item.produto.nome}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {item.produto.categoria || 'Geral'} ({(pct * 100).toFixed(1)}%)
                          </span>
                        </div>

                        {/* Coluna Direita (Valor) */}
                        <span style={{ color: '#16a34a', fontWeight: 'bold', alignSelf: 'center' }}>
                          + R$ {valorComissao.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div style={{ background: '#dcfce7', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #86efac' }}>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase' }}>Comissão Total</div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#15803d' }}>
                    R$ {totalComissao.toFixed(2)}
                  </div>
                </div>
                
                <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                  * Vendedor: {vendedorSelecionadoId === usuarioLogado.id ? 'Você' : 'Outro Usuário'}
                </div>
              </div>
            )}
            
          </div>
          {/* CSS para animação do painel */}
          <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>
      )}

      {/* MODAL: GERENCIAR TODOS OS CAIXAS (APENAS GERENTES) */}
      {modalGerenciarCaixas && usuarioLogado.cargo === 'GERENTE' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            width: '800px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, color: '#1e3c72' }}>
                👥 Todos os Caixas Abertos
              </h2>
              <button
                onClick={() => setModalGerenciarCaixas(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {todosCaixas.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#64748b' 
              }}>
                Nenhum caixa aberto no momento
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {todosCaixas.map(caixa => (
                  <div 
                    key={caixa.id}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px',
                      background: caixa.usuarioId === usuarioLogado.id ? '#f0fdf4' : '#f8fafc'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          color: '#1e3c72',
                          marginBottom: '5px'
                        }}>
                          {caixa.usuario?.nome ? `Caixa de ${caixa.usuario.nome}` : `Caixa #${caixa.id}`}
                          {caixa.usuarioId === usuarioLogado.id && (
                            <span style={{ 
                              marginLeft: '10px',
                              fontSize: '0.8rem',
                              background: '#4ade80',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '10px'
                            }}>
                              MEU CAIXA
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Aberto em: {new Date(caixa.dataAbertura).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Saldo Inicial
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#059669' }}>
                          R$ {Number(caixa.saldoInicial).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr',
                      gap: '15px',
                      padding: '15px',
                      background: 'white',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>
                          Saldo Atual
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e3c72' }}>
                          R$ {Number(caixa.saldoAtual || caixa.saldoInicial).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>
                          Status
                        </div>
                        <div style={{ 
                          fontSize: '1rem', 
                          fontWeight: 'bold',
                          color: caixa.status === 'ABERTO' ? '#059669' : '#dc2626'
                        }}>
                          {caixa.status === 'ABERTO' ? '🟢 ABERTO' : '🔴 FECHADO'}
                        </div>
                      </div>
                    </div>

                    {caixa.observacoes && (
                      <div style={{ 
                        marginTop: '10px',
                        fontSize: '0.85rem',
                        color: '#64748b',
                        fontStyle: 'italic'
                      }}>
                        💬 {caixa.observacoes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                buscarTodosCaixas()
              }}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔄 Atualizar Lista
            </button>
          </div>
        </div>
      )}

     {/* MODAL: RESUMO DO CAIXA (CORRIGIDO) */}
      {modalResumoCaixa && caixaAberto && (() => {
        
        // 1. FILTRO BLINDADO (IGUAL AO DO BOTÃO)
        // O segredo é o "|| ''" que evita erro se o ID vier nulo
        const vendasDoCaixa = vendas.filter(v => 
            String(v.caixaId || '') === String(caixaAberto.id || '') && 
            !v.nota_cancelada
        );
        
        const vendasCanceladas = vendas.filter(v => 
            String(v.caixaId || '') === String(caixaAberto.id || '') && 
            v.nota_cancelada
        );

        // 2. Filtra Movimentações deste caixa específico
        const movsDoCaixa = movimentacoes.filter(m => 
            String(m.caixaId || '') === String(caixaAberto.id || '')
        );
        
        // 3. CÁLCULOS FINANCEIROS
        let totDinheiro = 0, totPix = 0, totCartao = 0, totPrazo = 0;
        
        vendasDoCaixa.forEach(v => {
          if (v.pagamentos && v.pagamentos.length > 0) {
             v.pagamentos.forEach(p => {
               const val = Number(p.valor);
               if (p.forma === 'Dinheiro') totDinheiro += val;
               else if (p.forma === 'Pix') totPix += val;
               else if (p.forma.toLowerCase().includes('cartão')) totCartao += val;
               else totPrazo += val;
             });
          } else {
             // Fallback para vendas antigas
             const val = Number(v.total);
             const f = v['formaPagamento'] || 'Dinheiro';
             if (f === 'Dinheiro') totDinheiro += val;
             else if (f === 'Pix') totPix += val;
             else if (f.toLowerCase().includes('cartão')) totCartao += val;
             else totPrazo += val;
          }
        });

        // 4. Soma Suprimentos e Sangrias
        const totalSuprimentos = movsDoCaixa
            .filter(m => m.tipo === 'SUPRIMENTO')
            .reduce((acc, m) => acc + Number(m.valor), 0);
            
        const totalSangrias = movsDoCaixa
            .filter(m => m.tipo === 'SANGRIA')
            .reduce((acc, m) => acc + Number(m.valor), 0);

        // 5. Totais Finais
        const totalVendido = totDinheiro + totPix + totCartao + totPrazo;
        // Dinheiro na Gaveta = Inicial + Vendas(Dinheiro) + Entradas - Saídas
        const dinheiroGaveta = Number(caixaAberto.saldoInicial) + totDinheiro + totalSuprimentos - totalSangrias;
        const ticketMedio = vendasDoCaixa.length > 0 ? (totalVendido / vendasDoCaixa.length) : 0;

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}>
            <div style={{
              background: '#f8fafc', borderRadius: '15px', padding: '25px', width: '1150px', maxWidth: '98vw',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '95vh'
            }}>
              {/* CABEÇALHO */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                <h2 style={{ margin: 0, color: '#1e3c72', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📊 Resumo Financeiro do Caixa #{caixaAberto.id}
                </h2>
                <button onClick={() => setModalResumoCaixa(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>

              {/* GRID DE 3 COLUNAS */}
              <div style={{ display: 'grid', gridTemplateColumns: '300px 300px 1fr', gap: '20px', overflowY: 'auto', paddingBottom: '10px' }}>
                
                {/* COLUNA 1: FINANCEIRO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>Movimento Geral</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                        <span>À vista</span><b style={{ color: '#059669' }}>R$ {(totDinheiro + totPix + totCartao).toFixed(2)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem' }}>
                        <span>À prazo</span><b style={{ color: '#3b82f6' }}>R$ {totPrazo.toFixed(2)}</b>
                    </div>
                    <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '10px', paddingTop: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                        <b>Total Movimentado</b><b>R$ {totalVendido.toFixed(2)}</b>
                    </div>
                  </div>

                  <div style={{ background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>Formas de Pagamento</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: '#f1f5f9', marginBottom: '5px', borderRadius: '5px' }}>
                        <span>+ PIX</span><b>R$ {totPix.toFixed(2)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: '#f1f5f9', marginBottom: '5px', borderRadius: '5px' }}>
                        <span>+ Cartão</span><b>R$ {totCartao.toFixed(2)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', background: '#f1f5f9', borderRadius: '5px' }}>
                        <span>+ Prazo/Haver</span><b>R$ {totPrazo.toFixed(2)}</b>
                    </div>
                  </div>

                  {/* Dinheiro na Gaveta */}
                  <div style={{ background: '#fefce8', padding: '15px', borderRadius: '10px', border: '2px solid #fde047' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#854d0e' }}>Dinheiro na Gaveta</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <span>+ Saldo Inicial</span><b>R$ {Number(caixaAberto.saldoInicial).toFixed(2)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <span>+ Vendas (Dinheiro)</span><b style={{color:'#16a34a'}}>R$ {totDinheiro.toFixed(2)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <span>+ Suprimentos</span><b style={{color:'#16a34a'}}>R$ {totalSuprimentos.toFixed(2)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <span>- Sangrias</span><b style={{color:'#dc2626'}}>R$ {totalSangrias.toFixed(2)}</b>
                    </div>
                    <div style={{ borderTop: '2px dashed #fde047', marginTop: '10px', paddingTop: '5px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: '#713f12' }}>
                        <b>EM ESPÉCIE =</b><b>R$ {dinheiroGaveta.toFixed(2)}</b>
                    </div>
                  </div>
                </div>

                {/* COLUNA 2: INFO + OPERAÇÕES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#475569' }}>Informativo</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Qtd Vendas</span><b>{vendasDoCaixa.length}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Canceladas</span><b style={{color:'#dc2626'}}>{vendasCanceladas.length}</b>
                    </div>
                    <div style={{ marginTop: '10px', background: '#f8fafc', padding: '8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Ticket Médio</span><b>R$ {ticketMedio.toFixed(2)}</b>
                    </div>
                  </div>

                  <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '10px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#0369a1' }}>Operador</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0c4a6e' }}>{usuarioLogado.nome}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                        Aberto: {new Date(caixaAberto.dataAbertura).toLocaleTimeString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setModalTipoMovimento('entrada')} style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        ➕ Suprimento
                    </button>
                    <button onClick={() => setModalTipoMovimento('sangria')} style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        ➖ Sangria
                    </button>
                  </div>

                  <button 
                    onClick={() => { setModalResumoCaixa(false); if (typeof fecharCaixa === 'function') fecharCaixa(); }} 
                    style={{ marginTop: 'auto', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(220, 38, 38, 0.3)' }}
                  >
                    🔒 ENCERRAR CAIXA
                  </button>
                </div>

                {/* COLUNA 3: EXTRATO COMPLETO */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '600px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    <h4 style={{ margin: 0, color: '#475569' }}>Extrato Detalhado</h4>
                    <button onClick={() => alert("Imprimir extrato")} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>🖨️ Imprimir</button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px dotted #e2e8f0' }}>
                        <span>ABERTURA</span> <b>+ R$ {Number(caixaAberto.saldoInicial).toFixed(2)}</b>
                    </div>

                    {[
                        ...vendasDoCaixa.map(v => ({ ...v, tipoItem: 'VENDA', dateSort: new Date(v.data) })),
                        ...movsDoCaixa.map(m => ({ ...m, tipoItem: 'MOV', dateSort: new Date(m.data || new Date()) }))
                    ]
                    .sort((a: any, b: any) => a.dateSort - b.dateSort) // Ordena por data
                    .map((item: any, idx) => {
                        if (item.tipoItem === 'VENDA') {
                            return (
                                <div key={'v'+idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dotted #e2e8f0' }}>
                                    <span style={{ color: '#1e3c72' }}>VENDA #{item.id}</span>
                                    <b style={{ color: '#1e3c72' }}>+ R$ {Number(item.total).toFixed(2)}</b>
                                </div>
                            );
                        } else {
                            const isSup = item.tipo === 'SUPRIMENTO';
                            return (
                                <div key={'m'+idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dotted #e2e8f0', background: isSup ? '#f0fdf4' : '#fef2f2' }}>
                                    <span style={{ color: isSup ? '#166534' : '#991b1b' }}>
                                        {isSup ? 'SUPRIMENTO' : 'SANGRIA'}
                                    </span>
                                    <b style={{ color: isSup ? '#166534' : '#991b1b' }}>
                                        {isSup ? '+' : '-'} R$ {Number(item.valor).toFixed(2)}
                                    </b>
                                </div>
                            );
                        }
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE ORÇAMENTO (COM CONFERÊNCIA DE ITENS) */}
      {modalOrcamento && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#1e293b', 
            borderRadius: '16px',
            width: '900px', // Aumentei a largura pra caber os dois lados
            maxWidth: '95vw',
            border: '1px solid #475569', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden', // Pra borda arredondada funcionar bem
            display: 'flex', flexDirection: 'column'
          }}>
            
            {/* CABEÇALHO DO MODAL */}
            <div style={{ 
              padding: '20px 25px', 
              borderBottom: '1px solid #334155', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#0f172a'
            }}>
              <h2 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                📄 Novo Orçamento
              </h2>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                {carrinho.length} itens selecionados
              </div>
            </div>

            {/* CORPO DO MODAL (DIVIDIDO EM 2 COLUNAS) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '450px' }}>
              
              {/* --- LADO ESQUERDO: FORMULÁRIO --- */}
              <div style={{ padding: '30px', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                
                <p style={{ color: '#cbd5e1', marginBottom: '25px', lineHeight: '1.5' }}>
                  Preencha os dados abaixo para gerar o comprovante. <br/>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>* O estoque não será alterado nesta operação.</span>
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#fff', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Nome do Cliente (Opcional)</label>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Ex: Sr. João da Silva"
                    value={clienteOrcamento}
                    onChange={e => setClienteOrcamento(e.target.value)}
                    style={{
                      width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #475569',
                      background: '#0f172a', color: 'white', fontSize: '1.1rem', outline: 'none',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                    }}
                  />
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '15px' }}>
                  <button 
                    onClick={() => setModalOrcamento(false)}
                    style={{ 
                      flex: 1, padding: '15px', borderRadius: '8px', border: 'none', cursor: 'pointer', 
                      background: '#334155', color: '#cbd5e1', fontWeight: 'bold', transition: '0.2s'
                    }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={imprimirOrcamentoTermico}
                    style={{ 
                      flex: 1, padding: '15px', borderRadius: '8px', border: 'none', cursor: 'pointer', 
                      background: 'linear-gradient(to right, #eab308, #ca8a04)', 
                      color: '#422006', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 4px 15px rgba(234, 179, 8, 0.3)'
                    }}
                  >
                    🖨️ IMPRIMIR
                  </button>
                </div>
              </div>

              {/* --- LADO DIREITO: LISTA DE CONFERÊNCIA --- */}
              <div style={{ display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
                
                {/* Título da Lista */}
                <div style={{ padding: '15px 20px', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                  Resumo do Pedido
                </div>

               {/* Lista com Rolagem (CORRIGIDA E TURBINADA) */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
                  {carrinho.map((item: any, idx) => {
                    // 🕵️‍♂️ DETETIVE DE DADOS:
                    // Procura o nome e preço onde quer que eles estejam escondidos
                    const nomeReal = item.nome || item.produto?.nome || item.product?.nome || "Item sem nome";
                    const precoReal = Number(item.precoVenda || item.preco || item.produto?.precoVenda || 0);
                    const qtdReal = Number(item.quantidade || item.qtd || item.quantity || 1);
                    const totalItem = precoReal * qtdReal;

                    return (
                      <div key={idx} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 0', borderBottom: '1px dashed #334155', color: '#e2e8f0'
                      }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                           {/* Mostra a quantidade real agora! */}
                           <span style={{ background: '#334155', color: 'white', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}>
                             {qtdReal}x
                           </span>
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.95rem' }}>{nomeReal}</span>
                              {/* Mostra o unitário pequeno pra conferência */}
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unit: R$ {precoReal.toFixed(2)}</span>
                           </div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>
                          R$ {totalItem.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totalizador (Atualizado para somar certo) */}
                <div style={{ 
                  padding: '20px', borderTop: '1px solid #334155', background: '#1e293b',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ color: '#94a3b8' }}>Total Previsto</span>
                  <span style={{ color: '#4ade80', fontSize: '1.8rem', fontWeight: 'bold' }}>
                    {/* Soma inteligente multiplicando pela quantidade */}
                    R$ {carrinho.reduce((acc, i: any) => {
                      const preco = Number(i.precoVenda || i.preco || i.produto?.precoVenda || 0);
                      const qtd = Number(i.quantidade || i.qtd || i.quantity || 1);
                      return acc + (preco * qtd);
                    }, 0).toFixed(2)}
                  </span>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

{modalProduto && (
  <ModalProdutoPro 
    onClose={() => setModalProduto(false)}
    
    // 👇 AQUI A MUDANÇA: Passamos os dados direto pra função!
    onSave={(dadosDoModal) => {
        console.log("Dados recebidos do modal:", dadosDoModal);
        salvarProduto(dadosDoModal); 
    }}
    
    produto={idProdutoEmEdicao ? produtos.find(p => p.id === idProdutoEmEdicao) : null}
    todosOsProdutos={produtos}
    onSelecionarProduto={editarProduto}
  />
)}

{/* MODAL DE DETALHES (LEITURA) */}
{modalDetalhesAberto && (
  <ModalDetalhesProduto 
    produto={produtoDetalhes}
    onClose={() => setModalDetalhesAberto(false)}
  />
)}

      {/* MODAL: CLIENTE */}
      {modalCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: '15px', padding: '30px', width: '500px' }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72' }}>{formCliente.id ? '✏️ Editar Cliente' : '+ Novo Cliente'}</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nome Completo *</label><input type="text" value={formCliente.nome || ''} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>CPF/CNPJ</label><input type="text" value={formCliente.cpfCnpj || ''} onChange={e => setFormCliente({...formCliente, cpfCnpj: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Celular</label><input type="tel" value={formCliente.celular || ''} onChange={e => setFormCliente({...formCliente, celular: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📍 Endereço 1 (Principal)</label><input type="text" placeholder="Rua, número, bairro..." value={formCliente.endereco || ''} onChange={e => setFormCliente({...formCliente, endereco: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📍 Endereço 2 (Opcional)</label><input type="text" placeholder="Casa de aluguel, trabalho..." value={formCliente.endereco2 || ''} onChange={e => setFormCliente({...formCliente, endereco2: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📍 Endereço 3 (Opcional)</label><input type="text" placeholder="Outro endereço..." value={formCliente.endereco3 || ''} onChange={e => setFormCliente({...formCliente, endereco3: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }} /></div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button onClick={salvarCliente} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #4ade80, #22c55e)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✓ Salvar Cliente</button>
              <button onClick={() => { setModalCliente(false); setFormCliente({}); }} style={{ padding: '12px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LOADING */}
      {processandoVenda && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '40px 50px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '6px solid #e2e8f0',
              borderTop: '6px solid #4ade80',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <div style={{
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#1e3c72',
              marginBottom: '10px'
            }}>
              {mensagemLoading.split('\n')[0]}
            </div>
            {mensagemLoading.includes('\n') && (
              <div style={{
                fontSize: '0.9rem',
                color: '#64748b'
              }}>
                {mensagemLoading.split('\n')[1]}
              </div>
            )}
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

{/* --- MODAL DE MOVIMENTAÇÃO (SANGRIA/ENTRADA) --- */}
      {modalTipoMovimento && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', // Fundo bem escuro pra focar
          zIndex: 10001, // Z-index MAIOR que o do Resumo do Caixa (importante!)
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '25px',
            borderRadius: '12px',
            width: '350px',
            border: modalTipoMovimento === 'entrada' ? '2px solid #22c55e' : '2px solid #ef4444',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ color: 'white', marginTop: 0, textAlign: 'center' }}>
              {modalTipoMovimento === 'entrada' ? 'Nova Entrada' : 'Nova Sangria'}
            </h2>

            {/* Input de Valor */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Valor (R$)</label>
              <input 
                type="number"
                autoFocus
                value={valorMovimento}
                onChange={e => setValorMovimento(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #475569',
                  backgroundColor: '#0f172a', color: 'white', fontSize: '1.5rem', textAlign: 'center'
                }}
              />
            </div>

            {/* Input de Descrição */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Motivo / Descrição</label>
              <input 
                type="text"
                value={descMovimento}
                onChange={e => setDescMovimento(e.target.value)}
                placeholder={modalTipoMovimento === 'entrada' ? "Ex: Troco inicial" : "Ex: Pagamento Fornecedor"}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #475569',
                  backgroundColor: '#0f172a', color: 'white'
                }}
              />
            </div>

            {/* Botões de Ação */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setModalTipoMovimento(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#334155', color: 'white' }}
              >
                Cancelar
              </button>
              
              <button 
                onClick={confirmarMovimentacao}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'white',
                  background: modalTipoMovimento === 'entrada' ? '#16a34a' : '#dc2626'
                }}
              >
                CONFIRMAR
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default App
