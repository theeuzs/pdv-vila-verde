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
  // ... outros useStates ...
  const [entrega, setEntrega] = useState(false);
  const [endereco, setEndereco] = useState('');
  // --- DETECTOR DE CELULAR ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);  

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
      if (dados.status === 'ABERTO') {
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

  async function fecharCaixa() {
    if (!confirm("Tem certeza que deseja FECHAR o caixa agora?")) return;

    try {
      const res = await fetch(`${API_URL}/caixa/fechar`, { method: 'POST' });
      
      if (res.ok) {
        alert("Caixa fechado com sucesso! Até amanhã. 🌙");
        verificarStatusCaixa(); // Atualiza a tela para bloquear as vendas
      } else {
        alert("Erro ao fechar o caixa.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    }
  }

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
    nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral', 
    fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '', ncm: '', cest: '', cfop: '' 
  })
  
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
        imprimirCupom(carrinho, Number(orc.total), orc.id, nome, 'ORÇAMENTO')
        
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
      alert("Produto sem estoque!")
      return
    }
    setCarrinho(lista => {
      const existe = lista.find(item => item.produto.id === p.id)
      if (existe) {
        return lista.map(item => item.produto.id === p.id ? { ...item, quantidade: item.quantidade + 1 } : item)
      }
      return [...lista, { produto: p, quantidade: 1 }]
    })
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

async function finalizarVenda() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    if (!clienteSelecionado && !confirm("Vender sem cliente identificado?")) return;

    // Monta os dados para enviar ao backend
    const dadosVenda = {
      clienteId: clienteSelecionado ? Number(clienteSelecionado) : null,
      entrega: entrega,
    enderecoEntrega: endereco,
      itens: carrinho.map(item => ({
        produtoId: item.produto.id,
        quantidade: item.quantidade
      })),
      pagamentos: listaPagamentos.map(p => ({
        forma: p.forma,
        valor: Number(p.valor)
      }))
    };

    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosVenda)
      });

      // AQUI ESTÁ A CORREÇÃO: Pegamos a resposta (ID) antes de qualquer coisa
      const vendaCriada = await res.json();

      if (res.ok) {
        alert("Venda realizada com sucesso! 🎉");

        if (confirm("Deseja imprimir o cupom? 🧾")) {
          // Agora temos certeza que vendaCriada.id existe
          imprimirCupom(
            carrinho, 
            totalCarrinho, 
            vendaCriada.id, 
            clienteObjSelecionado?.nome || 'Consumidor Final', 'VENDA'
          );
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
    
    imprimirCupom(itens, Number(v.total), v.id, nome, 'VENDA')
  }

  function reimprimirOrcamento(o: Orcamento) {
    const itens = o.itens.map(i => ({ produto: i.produto, quantidade: Number(i.quantidade) }))
    const nome = o.cliente?.nome || 'Consumidor'
    imprimirCupom(itens, Number(o.total), o.id, nome, 'ORÇAMENTO')
  }

  // --- FUNÇÃO DE IMPRESSÃO (AGORA COM TÍTULO E CORREÇÃO DE PREÇO) ---
  function imprimirCupom(itens: any[], total: number, id: number | string, nomeCliente: string, titulo: string = "VENDA") {
    const larguraPapel = '80mm'; // Mude para 58mm se precisar
    
    const conteudo = `
      <html>
        <head>
          <title>${titulo} #${id}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace;
              width: ${larguraPapel};
              margin: 0;
              padding: 5px;
              font-size: 12px;
              color: black;
            }
            .centralizado { text-align: center; }
            .negrito { font-weight: bold; }
            .divisoria { border-top: 1px dashed black; margin: 5px 0; }
            .tabela { width: 100%; border-collapse: collapse; }
            .tabela td { padding: 2px 0; vertical-align: top; }
            .direita { text-align: right; }
            .esquerda { text-align: left; }
            .grande { font-size: 16px; }
          </style>
        </head>
        <body>
          
          <div class="centralizado">
            <div class="negrito grande">MAT. CONSTRUÇÃO</div>
            <div class="negrito grande">VILA VERDE 🏗️</div>
            <br>
            Rua Jornalista Rubens Avila, 530 - CIC<br>
            Tel/Zap: (41) 98438-7167<br>
            CNPJ: 12.820.608/0001-41
          </div>

          <div class="divisoria"></div>

          <div>
            <strong class="grande">${titulo}: #${id}</strong><br>
            Data: ${new Date().toLocaleString()}<br>
            Cliente: ${nomeCliente || 'Consumidor Final'}
            ${titulo.includes('ORÇAMENTO') ? '<br><i>* Não vale como recibo</i>' : ''}
          </div>

          <div class="divisoria"></div>

          <table class="tabela">
            <thead>
              <tr class="negrito" style="border-bottom: 1px solid black;">
                <td class="esquerda">QTD</td>
                <td class="esquerda">ITEM</td>
                <td class="direita">TOTAL</td>
              </tr>
            </thead>
            <tbody>
              ${itens.map(item => {
                // Lógica reforçada para achar o preço
                const preco = Number(item.precoUnit || item.preco || item.precoVenda || item.produto?.precoVenda || 0);
                const totalItem = preco * item.quantidade;
                
                return `
                <tr>
                  <td>${item.quantidade}x</td>
                  <td>${item.produto?.nome || item.nome || 'Produto'}</td>
                  <td class="direita">R$ ${totalItem.toFixed(2)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="divisoria"></div>

          <table class="tabela grande negrito">
            <tr>
              <td class="esquerda">TOTAL:</td>
              <td class="direita">R$ ${Number(total).toFixed(2)}</td>
            </tr>
          </table>

          <div class="divisoria"></div>

          <div class="centralizado" style="margin-top: 10px;">
            ${titulo === 'VENDA' ? 'Obrigado pela preferência! 👍' : 'Orçamento válido por 7 dias.'}<br>
            <small>Sistema PDV Vila Verde</small>
          </div>
          
          <br><br>.
        </body>
      </html>
    `;

    const janela = window.open('', '', 'height=600,width=400');
    if(janela) {
      janela.document.write(conteudo);
      janela.document.close();
      setTimeout(() => {
        janela.print();
        janela.close();
      }, 500);
    }
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
  
async function cancelarVenda(id: number) {
    if (confirm("Tem certeza que deseja cancelar esta venda? O estoque será devolvido.")) {
        try {
            const res = await fetch(`${API_URL}/vendas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert("Venda cancelada com sucesso!");
                carregarDados(); // Atualiza a lista e o estoque na tela
            } else {
                alert("Erro ao cancelar venda no servidor.");
            }
        } catch (error) {
            alert("Erro de conexão ao tentar cancelar.");
        }
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
  
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
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
          marginBottom: 20
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ background: '#fff', padding: '5px 15px', borderRadius: 5, border: '1px solid #c3e6cb', color: '#155724' }}>
                <strong>Saldo:</strong> R$ {Number(caixaAberto.saldoAtual).toFixed(2)}
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
      <div style={{ background: '#1a202c', padding: '10px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          
          {/* Mostra o nome de quem está logado */}
          <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#cbd5e0' }}>
            Olá, <strong style={{ color: 'white' }}>{usuarioLogado.nome}</strong>
          </div>

          <button 
            onClick={() => setUsuarioLogado(null)}
            style={{ 
              background: '#e53e3e', 
              color: 'white', 
              border: 'none', 
              padding: '8px 15px', 
              borderRadius: 5, 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5 
            }}
          >
            SAIR 🚪
          </button>
        </div>
      </div>

     {/* --- MENU DE NAVEGAÇÃO (AGORA COM OS 3 CARGOS) --- */}
      {usuarioLogado && (
        <div style={{ display: 'flex', background: 'white', padding: '0 30px', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
          
          {/* DEFINIÇÃO DOS BOTÕES POR CARGO */}
          {(usuarioLogado.cargo === 'GERENTE' 
              ? ['caixa', 'clientes', 'financeiro', 'vendas', 'orcamentos', 'dashboard', 'entregas', 'equipe'] 
              : usuarioLogado.cargo === 'VENDEDOR'
                  ? ['caixa', 'clientes', 'vendas', 'orcamentos', 'entregas']
                  : ['entregas'] // <--- MOTORISTA SÓ VÊ ISSO AGORA
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
                borderBottom: aba === menu ? '4px solid #2b6cb0' : 'none', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                color: aba === menu ? '#2b6cb0' : '#718096',
                textTransform: 'uppercase',
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

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div style={{ flex: 1, padding: '30px', overflow: 'hidden' }}>
        
        {/* === ABA: CAIXA === */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', height: '100%', gap: 30, flexDirection: isMobile ? 'column' : 'row', overflowY: isMobile ? 'auto' : 'hidden' }}>
            
            {/* COLUNA ESQUERDA: PRODUTOS */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
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

              {busca === '' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.6, color: '#888' }}>
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
                          <button onClick={(e) => { e.stopPropagation(); setProdutoEmEdicao(produto); setFormProduto({...produto, precoCusto: String(produto.precoCusto), precoVenda: String(produto.precoVenda), estoque: String(produto.estoque)} as any); setModalAberto(true); }} style={{ backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>✏️</button>
                          <button onClick={(e) => { e.stopPropagation(); excluirProduto(produto.id); }} style={{ backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {produtosFiltrados.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Nenhum produto encontrado.</div>}
                </div>
              )}
            </div>

            {/* COLUNA DIREITA: CARRINHO E PAGAMENTO */}
            <div style={{ width: 400, backgroundColor: 'white', borderRadius: 12, padding: 25, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }}>
              <h2 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #edf2f7', paddingBottom: 15 }}>🛒 Carrinho</h2>
              
              <div style={{ marginBottom: 15 }}>
                <label style={estiloLabel}>Cliente</label>
                {/* CENÁRIO 1: CLIENTE JÁ SELECIONADO (MOSTRA O NOME FIXO) */}
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
                  /* CENÁRIO 2: NINGUÉM SELECIONADO (MOSTRA A BUSCA) */
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="🔍 Digite o nome do cliente..."
                      value={termoCliente}
                      onChange={e => setTermoCliente(e.target.value)}
                      style={{ ...estiloInput, marginBottom: 0 }} // Reaproveita seu estilo
                    />
                    
                    {/* LISTA FILTRADA (SÓ APARECE SE TIVER DIGITADO ALGO OU CLICADO) */}
                    {termoCliente.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '0 0 8px 8px', maxHeight: '200px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        {clientes
                          .filter(c => c.nome.toLowerCase().includes(termoCliente.toLowerCase()))
                          .map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => { setClienteSelecionado(String(c.id)); setTermoCliente(''); }}
                              style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                              <span>{c.nome}</span>
                              <small style={{ color: '#aaa' }}>{c.cpfCnpj || 'Sem Doc'}</small>
                            </div>
                          ))
                        }
                        {/* Se não achar ninguém */}
                        {clientes.filter(c => c.nome.toLowerCase().includes(termoCliente.toLowerCase())).length === 0 && (
                          <div style={{ padding: 10, color: '#999', fontStyle: 'italic' }}>Nenhum cliente encontrado.</div>
                        )}
                      </div>
                    )}
                    
                    {/* OPÇÃO RÁPIDA: CONSUMIDOR FINAL */}
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
              
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #edf2f7', borderRadius: 8, padding: 10, marginBottom: 10, maxHeight: 200 }}>
                {carrinho.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div>{item.produto.nome} ({item.quantidade}x)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <b>R$ {(item.quantidade * Number(item.produto.precoVenda)).toFixed(2)}</b>
                      <button onClick={() => removerItemCarrinho(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }} title="Remover item">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: 15, color: '#2d3748' }}>
                <span>Total</span>
                <span>R$ {totalCarrinho.toFixed(2)}</span>
              </div>

              {/* Área de Pagamento */}
              <div style={{ backgroundColor: '#f7fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 15 }}>
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

              {/* --- ÁREA DE ENTREGA (Integração Corrigida) --- */}
              <div style={{ marginBottom: 15, background: '#f7fafc', padding: 10, borderRadius: 5, border: '1px solid #edf2f7' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 'bold', color: '#2d3748' }}>
                  <input type="checkbox" checked={entrega} onChange={(e) => setEntrega(e.target.checked)} style={{ transform: 'scale(1.5)' }} />
                  🚛 É para entregar?
                </label>
                {entrega && (
                  <input type="text" placeholder="Digite o endereço de entrega..." value={endereco} onChange={(e) => setEndereco(e.target.value)} style={{ width: '100%', marginTop: 10, padding: 8, borderRadius: 4, border: '1px solid #cbd5e0' }} />
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={salvarOrcamento} disabled={carrinho.length === 0} style={{ ...estiloBotao, flex: 1, backgroundColor: carrinho.length > 0 ? '#d69e2e' : '#cbd5e0', color: 'white' }}>📝 ORÇAMENTO</button>
                <button onClick={finalizarVenda} disabled={carrinho.length === 0 || faltaPagar > 0.05} style={{ ...estiloBotao, flex: 1, backgroundColor: (faltaPagar <= 0.05 && carrinho.length > 0) ? '#48bb78' : '#cbd5e0', color: 'white' }}>✅ VENDER</button>
              </div>
            </div>
          </div>
        )}

        {/* === ABA: ORÇAMENTOS === */}
        {aba === 'orcamentos' && (
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 30, height: '100%', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#d69e2e' }}>📝 Orçamentos Salvos</h2>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left', color:'#718096'}}>
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
                  <tr key={o.id} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:15}}>#{o.id}</td>
                    <td style={{padding:15}}>{new Date(o.data).toLocaleDateString()}</td>
                    <td style={{padding:15}}><b>{o.cliente?.nome || 'Consumidor'}</b></td>
                    <td style={{padding:15}}>{o.itens.length} itens</td>
                    <td style={{padding:15, fontWeight:'bold'}}>R$ {Number(o.total).toFixed(2)}</td>
                    <td style={{padding:15}}>
                      <button onClick={() => efetivarOrcamento(o)} title="Transformar em Venda" style={{ marginRight: 10, padding: '5px 10px', backgroundColor: '#2b6cb0', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Virar Venda 🛒</button>
                      <button onClick={()=>reimprimirOrcamento(o)} style={{marginRight:10, cursor:'pointer', border:'none', background:'none', fontSize:'1.2rem'}}>🖨️</button>
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
          <div style={{ background: 'white', borderRadius: 12, padding: 30, height: '100%', overflowY: 'auto' }}>
            <div style={{display:'flex',justifyContent:'space-between', marginBottom:20}}>
              <h2>👥 Clientes</h2>
              <button onClick={()=>{setModalClienteAberto(true);setClienteEmEdicao(null)}} style={{...estiloBotao,background:'#48bb78',color:'white'}}>+ Novo</button>
            </div>
            <table style={{width:'100%'}}>
              <thead>
                <tr style={{textAlign:'left', color:'#718096'}}>
                  <th style={{padding:15}}>Nome</th>
                  <th style={{padding:15}}>CPF / Endereço</th>
                  <th style={{padding:15}}>Haver</th>
                  <th style={{textAlign:'right', padding:15}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:15}}><b>{c.nome}</b><br/><small>{c.celular}</small></td>
                    <td style={{padding:15}}>{c.cpfCnpj}<br/><small>{c.endereco}</small></td>
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
          <div style={{ background: 'white', borderRadius: 12, padding: 30, height: '100%', overflowY: 'auto' }}>
            <h2>💲 A Receber (A prazo)</h2>
            {contasReceber.length===0 ? <p>Nada pendente.</p> : (
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{textAlign:'left', color:'#718096'}}>
                    <th style={{padding:15}}>Cliente</th>
                    <th style={{padding:15}}>Data</th>
                    <th style={{padding:15}}>Valor</th>
                    <th style={{padding:15}}>Status</th>
                    <th style={{padding:15}}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {contasReceber.map((conta: any) => (
                    <tr key={conta.id} style={{ borderBottom: '1px solid #ccc' }}>
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
          <div style={{ background: 'white', borderRadius: 12, padding: 30, height: '100%', overflowY: 'auto' }}>
            <h2>📜 Histórico de Vendas</h2>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr style={{textAlign:'left', color:'#718096'}}>
                  <th style={{padding:15}}>ID</th>
                  <th style={{padding:15}}>Data</th>
                  <th style={{padding:15}}>Cliente</th>
                  <th style={{padding:15}}>Pagamento</th>
                  <th style={{padding:15}}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vendasRealizadas.map(v => (
                  <tr key={v.id} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{padding:15}}>#{v.id}</td>
                    <td style={{padding:15}}>{new Date(v.data).toLocaleString()}</td>
                    <td style={{padding:15}}><b>{v.cliente?.nome||'Consumidor'}</b></td>
                    <td style={{padding:15}}><small>{v.pagamentos?.map(p=>p.forma).join(' + ')}</small></td>
                    <td style={{padding:15,fontWeight:'bold'}}>R$ {Number(v.total).toFixed(2)}</td>
                    <td style={{padding:15}}>
                      <button onClick={() => reimprimirVenda(v)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem' }}>🖨️</button>
                      <button onClick={() => cancelarVenda(v.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem', marginLeft: 10 }} title="Estornar Venda">🚫</button>
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
              <p style={{ color: '#718096' }}>Nenhuma entrega pendente no momento. Tudo limpo! ✨</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {listaEntregas.map((entrega: any) => (
                  <div key={entrega.id} style={{ background: 'white', padding: 20, borderRadius: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.1)', borderLeft: '5px solid #ecc94b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 18 }}>#{entrega.id} - {entrega.cliente?.nome || 'Consumidor'}</span>
                      <span style={{ background: '#ecc94b', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 'bold' }}>PENDENTE</span>
                    </div>
                    <div style={{ marginBottom: 15, color: '#4a5568' }}><strong>📍 Destino:</strong> {entrega.enderecoEntrega}</div>
                    <div style={{ background: '#f7fafc', padding: 10, borderRadius: 5, marginBottom: 15 }}>
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
      </div>

      {/* =====================================================================
          MODAIS (JANELAS FLUTUANTES)
      ===================================================================== */}
      
      {/* 1. MODAL DE CADASTRO DE PRODUTO */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: isMobile ? 15 : 30, borderRadius: 15, width: isMobile ? '95%' : '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, color: '#2d3748' }}>{produtoEmEdicao ? '✏️ Editar Produto' : '✨ Novo Produto'}</h2>
            <form onSubmit={salvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div style={{display:'flex', gap:15}}>
                 <div style={{flex:2}}>
                   <label style={estiloLabel}>Nome do Produto</label>
                   <input value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})} style={estiloInput} required />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Código Barras</label>
                   <input value={formProduto.codigoBarra} onChange={e => setFormProduto({...formProduto, codigoBarra: e.target.value})} style={estiloInput} />
                 </div>
              </div>
              <div style={{display:'flex', gap:15, background:'#f7fafc', padding:15, borderRadius:10}}>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Preço Custo</label>
                   <input type="number" step="0.01" value={formProduto.precoCusto} onChange={e => setFormProduto({...formProduto, precoCusto: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Preço Venda</label>
                   <input type="number" step="0.01" value={formProduto.precoVenda} onChange={e => setFormProduto({...formProduto, precoVenda: e.target.value})} style={estiloInput} required />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Estoque</label>
                   <input type="number" value={formProduto.estoque} onChange={e => setFormProduto({...formProduto, estoque: e.target.value})} style={estiloInput} required />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Unidade</label>
                   <input placeholder="UN/CX" value={formProduto.unidade} onChange={e => setFormProduto({...formProduto, unidade: e.target.value})} style={estiloInput} />
                 </div>
              </div>
              <div style={{display:'flex', gap:15}}>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Categoria</label>
                   <input value={formProduto.categoria} onChange={e => setFormProduto({...formProduto, categoria: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Fornecedor</label>
                   <input value={formProduto.fornecedor} onChange={e => setFormProduto({...formProduto, fornecedor: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Localização</label>
                   <input value={formProduto.localizacao} onChange={e => setFormProduto({...formProduto, localizacao: e.target.value})} style={estiloInput} />
                 </div>
              </div>
              <hr style={{border:'none', borderTop:'1px solid #edf2f7', margin:'10px 0'}} />
              <strong style={{color:'#718096', fontSize:'0.9rem'}}>Dados Fiscais (Opcionais)</strong>
              <div style={{display:'flex', gap:15}}>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>NCM</label>
                   <input value={formProduto.ncm || ''} onChange={e => setFormProduto({...formProduto, ncm: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>CEST</label>
                   <input value={formProduto.cest || ''} onChange={e => setFormProduto({...formProduto, cest: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>CFOP</label>
                   <input value={formProduto.cfop || ''} onChange={e => setFormProduto({...formProduto, cfop: e.target.value})} style={estiloInput} />
                 </div>
              </div>
              <div style={{display:'flex', gap:15}}>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>IPI (%)</label>
                   <input type="number" value={formProduto.ipi || ''} onChange={e => setFormProduto({...formProduto, ipi: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>ICMS (%)</label>
                   <input type="number" value={formProduto.icms || ''} onChange={e => setFormProduto({...formProduto, icms: e.target.value})} style={estiloInput} />
                 </div>
                 <div style={{flex:1}}>
                   <label style={estiloLabel}>Frete</label>
                   <input type="number" value={formProduto.frete || ''} onChange={e => setFormProduto({...formProduto, frete: e.target.value})} style={estiloInput} />
                 </div>
              </div>
              <div style={{ display: 'flex', gap: 15, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ ...estiloBotao, backgroundColor: '#cbd5e0', color: '#4a5568' }}>Cancelar</button>
                <button type="submit" style={{ ...estiloBotao, backgroundColor: '#3182ce', color: 'white' }}>Salvar Produto</button>
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

{/* === ABA: EQUIPE (A peça que faltava!) === */}
        {aba === 'equipe' && <TelaEquipe />}

    </div>      
  )
}

export default App;