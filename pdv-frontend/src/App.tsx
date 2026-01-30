import { useEffect, useState } from 'react'
import { Login } from './TelaLogin' 

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
  
  // ==========================================================================
  // 3. ESTADOS (STATES)
  // ==========================================================================

  // Login do Usuário
  const [usuario] = useState(() => {
    const salvo = localStorage.getItem('usuario_vila_verde')
    return salvo ? JSON.parse(salvo) : null
  })

  // Navegação entre Abas
  const [aba, setAba] = useState<'caixa' | 'historico' | 'clientes' | 'financeiro' | 'orcamentos'>('caixa')

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
  
  // Sistema de Pagamento Misto
  const [listaPagamentos, setListaPagamentos] = useState<PagamentoVenda[]>([])
  const [valorPagamentoInput, setValorPagamentoInput] = useState('')
  const [formaPagamentoInput, setFormaPagamentoInput] = useState('DINHEIRO')

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

  function fazerLogin(dados: any) {
    localStorage.setItem('usuario_vila_verde', JSON.stringify(dados))
    window.location.reload()
  }

  function sair() {
    localStorage.removeItem('usuario_vila_verde')
    window.location.reload()
  }

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

  useEffect(() => {
    if (usuario) carregarDados()
  }, [usuario])

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
        imprimirCupom(carrinho, Number(orc.total), orc.id, nome, "ORÇAMENTO VÁLIDO POR 7 DIAS", true)
        
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
    let valor = parseFloat(valorPagamentoInput.replace(',', '.'))
    
    // Se estiver vazio, assume o valor restante
    if (!valor || valor <= 0) valor = faltaPagar 
    
    // Validação de valor excedente
    if (valor > faltaPagar + 0.05) {
      return alert(`Valor maior que o restante! Falta pagar: R$ ${faltaPagar.toFixed(2)}`)
    }

    // Validação de Cliente Obrigatório
    if ((formaPagamentoInput === 'A PRAZO' || formaPagamentoInput === 'HAVER') && !clienteSelecionado) {
      return alert("Selecione um cliente para usar Fiado ou Haver!")
    }

    // Validação de Saldo Haver
    if (formaPagamentoInput === 'HAVER') {
       const cli = clientes.find(c => c.id === Number(clienteSelecionado))
       if (cli && Number(cli.saldoHaver) < valor) {
         return alert(`Saldo insuficiente! Disponível: R$ ${Number(cli.saldoHaver).toFixed(2)}`)
       }
    }

    setListaPagamentos([...listaPagamentos, { forma: formaPagamentoInput, valor }])
    setValorPagamentoInput('')
  }

  async function finalizarVenda() {
  if (carrinho.length === 0) return alert("Carrinho vazio!");
  
  // 1. Alterado de 'pagamentos' para 'listaPagamentos' conforme seu arquivo
  const totalPago = listaPagamentos.reduce((acc: number, p: any) => acc + Number(p.valor), 0);
  const totalVenda = carrinho.reduce((acc: number, item: any) => acc + (item.quantidade * Number(item.produto.precoVenda)), 0);

  if (Math.abs(totalVenda - totalPago) > 0.05) {
    return alert("O valor total pago não bate com o total da venda!");
  }

  const dadosVenda = {
    clienteId: clienteSelecionado ? Number(clienteSelecionado) : null,
    itens: carrinho.map((item: any) => ({
      produtoId: item.produto.id,
      quantidade: item.quantidade
    })),
    // 2. Usando 'listaPagamentos' aqui também
    pagamentos: listaPagamentos.map((p: any) => ({
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

    if (res.ok) {
      const vendaSalva = await res.json(); // Pega a venda completa que o servidor mandou
      
      // Tenta imprimir. Se a função se chamar 'reimprimirVenda', use ela.
      try {
          reimprimirVenda(vendaSalva); 
      } catch (e) {
          console.error("Erro ao tentar imprimir:", e);
      }

      alert("Venda realizada com sucesso!");
      setCarrinho([]);
      setListaPagamentos([]);
      setClienteSelecionado("");
      carregarDados(); 
    } else {
      const erro = await res.json();
      alert(`Erro: ${erro.erro || "Verifique o estoque ou pagamentos"}`);
    }
  } catch (error) {
    alert("Erro de Conexão. Verifique se o Render está online.");
  }
}
  // ==========================================================================
  // 7. FUNÇÕES DE IMPRESSÃO
  // ==========================================================================

  function reimprimirVenda(v: Venda) {
    const itens = v.itens.map(i => ({ produto: i.produto, quantidade: Number(i.quantidade) }))
    const nome = v.cliente?.nome || 'Consumidor'
    
    // Formata o resumo dos pagamentos (Ex: DINHEIRO: 50.00 | PIX: 20.00)
    const resumo = v.pagamentos?.map(p => `${p.forma}: ${Number(p.valor).toFixed(2)}`).join(' | ') || 'DINHEIRO'
    
    imprimirCupom(itens, Number(v.total), v.id, nome, resumo, false)
  }

  function reimprimirOrcamento(o: Orcamento) {
    const itens = o.itens.map(i => ({ produto: i.produto, quantidade: Number(i.quantidade) }))
    const nome = o.cliente?.nome || 'Consumidor'
    imprimirCupom(itens, Number(o.total), o.id, nome, "ORÇAMENTO (NÃO É DOCUMENTO FISCAL)", true)
  }

  function imprimirCupom(itens: ItemCarrinho[], total: number, id: number, clienteNome: string, rodape: string, isOrcamento: boolean) {
    const win = window.open('', '', 'width=300,height=500'); 
    win?.document.write(`
      <html>
        <body style="font-family: monospace;">
          <h3 style="margin-bottom:5px">${isOrcamento ? 'ORÇAMENTO' : 'VILA VERDE'} #${id}</h3>
          <p style="margin:0; font-size: 12px">Cli: ${clienteNome}</p>
          <hr/>
          ${itens.map(i => `<div>${i.produto.nome}<br/>${i.quantidade}x R$${Number(i.produto.precoVenda).toFixed(2)}</div>`).join('')}
          <hr/>
          <b>TOTAL: R$ ${total.toFixed(2)}</b>
          <br/>
          <small>${rodape}</small>
          <script>window.print()</script>
        </body>
      </html>
    `);
  }

  // ==========================================================================
  // 8. FUNÇÕES CRUD E AUXILIARES
  // ==========================================================================

  async function baixarConta(id: number) {
    if(!confirm("Confirmar recebimento deste valor?")) return
    await fetch(`${API_URL}/contas-receber/${id}/pagar`, { method: 'PUT' })
    carregarDados()
    alert("Recebido com sucesso!")
  }
  
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

  if (!usuario) return <Login onLogin={fazerLogin} />

  // ==========================================================================
  // 9. CÁLCULOS DO DASHBOARD
  // ==========================================================================

  // Soma de vendas do dia (Exclui Fiado para não duplicar na contabilidade de caixa)
  const totalHoje = vendasRealizadas
    .filter(v => new Date(v.data).toLocaleDateString() === new Date().toLocaleDateString())
    .reduce((acc, v) => {
      const pagouAgora = v.pagamentos?.filter(p => p.forma !== 'A PRAZO').reduce((sum, p) => sum + Number(p.valor), 0) || 0
      return acc + pagouAgora
    }, 0)

  const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0)
  
  const prodsFilt = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigoBarra||'').includes(busca))
  
  const clienteObjSelecionado = clientes.find(c => c.id === Number(clienteSelecionado))


  // ==========================================================================
  // 10. RENDERIZAÇÃO DA TELA (JSX)
  // ==========================================================================
  
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- HEADER --- */}
      <div style={{ backgroundColor: '#1a202c', color: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: 0 }}>🏗️ PDV Vila Verde</h2>
        
        <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>CAIXA HOJE</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#48bb78' }}>
              R$ {totalHoje.toFixed(2)}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>A RECEBER</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#f56565' }}>
              R$ {totalReceber.toFixed(2)}
            </div>
          </div>
          
          <button onClick={sair} style={{ backgroundColor: '#e53e3e', color: 'white', border: 'none', padding: '8px 15px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginLeft: 20 }}>
            SAIR
          </button>
        </div>
      </div>

      {/* --- MENU DE NAVEGAÇÃO --- */}
      <div style={{ display: 'flex', backgroundColor: 'white', padding: '0 30px', borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setAba('caixa')} style={{ padding: '20px 25px', background: 'none', border: 'none', borderBottom: aba === 'caixa' ? '4px solid #3182ce' : '4px solid transparent', fontWeight: 'bold', fontSize: '1rem', color: aba === 'caixa' ? '#2b6cb0' : '#718096', cursor: 'pointer' }}>🛒 CAIXA</button>
        <button onClick={() => setAba('clientes')} style={{ padding: '20px 25px', background: 'none', border: 'none', borderBottom: aba === 'clientes' ? '4px solid #3182ce' : '4px solid transparent', fontWeight: 'bold', fontSize: '1rem', color: aba === 'clientes' ? '#2b6cb0' : '#718096', cursor: 'pointer' }}>👥 CLIENTES</button>
        <button onClick={() => setAba('financeiro')} style={{ padding: '20px 25px', background: 'none', border: 'none', borderBottom: aba === 'financeiro' ? '4px solid #3182ce' : '4px solid transparent', fontWeight: 'bold', fontSize: '1rem', color: aba === 'financeiro' ? '#2b6cb0' : '#718096', cursor: 'pointer' }}>💲 FINANCEIRO</button>
        <button onClick={() => setAba('historico')} style={{ padding: '20px 25px', background: 'none', border: 'none', borderBottom: aba === 'historico' ? '4px solid #3182ce' : '4px solid transparent', fontWeight: 'bold', fontSize: '1rem', color: aba === 'historico' ? '#2b6cb0' : '#718096', cursor: 'pointer' }}>📜 VENDAS</button>
        <button onClick={() => setAba('orcamentos')} style={{ padding: '20px 25px', background: 'none', border: 'none', borderBottom: aba === 'orcamentos' ? '4px solid #3182ce' : '4px solid transparent', fontWeight: 'bold', fontSize: '1rem', color: aba === 'orcamentos' ? '#2b6cb0' : '#718096', cursor: 'pointer' }}>📝 ORÇAMENTOS</button>
      </div>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <div style={{ flex: 1, padding: '30px', overflow: 'hidden' }}>
        
        {/* === ABA: CAIXA === */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', height: '100%', gap: 30 }}>
            {/* Esquerda: Lista de Produtos */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                <input 
                  autoFocus 
                  placeholder="🔍 Buscar produto por nome ou código..." 
                  value={busca} 
                  onChange={e => setBusca(e.target.value)} 
                  style={{ ...estiloInput, fontSize: '1.1rem' }} 
                />
                <button 
                  onClick={() => { 
                    setProdutoEmEdicao(null); 
                    setFormProduto({ nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral', fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '', ncm: '', cest: '', cfop: '' }); 
                    setModalAberto(true) 
                  }} 
                  style={{ ...estiloBotao, backgroundColor: '#48bb78', color: 'white' }}>
                  + NOVO PRODUTO
                </button>
              </div>

              <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, paddingBottom: 20 }}>
                {prodsFilt.map(p => (
                  <div key={p.id} style={{ backgroundColor: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #edf2f7' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{p.nome}</h3>
                        <button onClick={() => { setProdutoEmEdicao(p); setFormProduto({ ...formProduto, ...p, precoCusto: String(p.precoCusto), precoVenda: String(p.precoVenda), estoque: String(p.estoque), ipi:String(p.ipi||''), icms:String(p.icms||''), frete:String(p.frete||''), ncm:p.ncm||'', cest:p.cest||'', cfop:p.cfop||'' } as any); setModalAberto(true) }} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize:'1.2rem' }}>✏️</button>
                        <button onClick={() => excluirProduto(p.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            🗑️
        </button>
                      </div>
                      <p style={{ color: '#718096' }}>Est: {p.estoque}</p>
                    </div>
                    <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#2b6cb0' }}>
                        R$ {Number(p.precoVenda).toFixed(2)}
                      </span>
                      <button onClick={() => adicionarAoCarrinho(p)} style={{ backgroundColor: '#3182ce', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>
                        + ADD
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direita: Carrinho e Pagamento */}
            <div style={{ width: 400, backgroundColor: 'white', borderRadius: 12, padding: 25, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }}>
              <h2 style={{ margin: '0 0 20px 0', borderBottom: '1px solid #edf2f7', paddingBottom: 15 }}>🛒 Carrinho</h2>
              
              <div style={{ marginBottom: 15 }}>
                <label style={estiloLabel}>Cliente</label>
                <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)} style={estiloInput}>
                  <option value="">👤 Consumidor Final</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
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
        
        {/* BOTÃO DE LIXEIRA AQUI 👇 */}
        <button 
            onClick={() => removerItemCarrinho(i)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }}
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
              <div style={{ backgroundColor: '#f7fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 15 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: faltaPagar > 0 ? '#e53e3e' : '#48bb78', fontWeight: 'bold' }}>
                    <span>Falta Pagar:</span>
                    <span>R$ {Math.max(0, faltaPagar).toFixed(2)}</span>
                 </div>
                 
                 <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input 
                      type="number" 
                      placeholder="Valor" 
                      value={valorPagamentoInput} 
                      onChange={e => setValorPagamentoInput(e.target.value)} 
                      style={{ ...estiloInput, width: '100px', marginBottom:0 }} 
                    />
                    
                    <select 
                      value={formaPagamentoInput} 
                      onChange={e => setFormaPagamentoInput(e.target.value)} 
                      style={{ ...estiloInput, flex: 1, marginBottom:0 }}
                    >
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="PIX">Pix</option>
                      <option value="CARTAO">Cartão</option>
                      <option value="A PRAZO">Fiado</option>
                      <option value="HAVER">Haver</option>
                    </select>
                    
                    <button onClick={adicionarPagamento} disabled={faltaPagar <= 0.05} style={{ ...estiloBotao, background: faltaPagar <= 0.05 ? '#cbd5e0' : '#3182ce', color: 'white', padding: '0 15px' }}>
                      +
                    </button>
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

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={salvarOrcamento} disabled={carrinho.length === 0} style={{ ...estiloBotao, flex: 1, backgroundColor: carrinho.length > 0 ? '#d69e2e' : '#cbd5e0', color: 'white' }}>
                   📝 ORÇAMENTO
                </button>
                <button onClick={finalizarVenda} disabled={carrinho.length === 0 || faltaPagar > 0.05} style={{ ...estiloBotao, flex: 1, backgroundColor: (faltaPagar <= 0.05 && carrinho.length > 0) ? '#48bb78' : '#cbd5e0', color: 'white' }}>
                   ✅ VENDER
                </button>
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
            <h2>💲 A Receber (Fiado)</h2>
            {contasReceber.length===0 ? <p>Nada pendente.</p> : (
              <table style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{textAlign:'left', color:'#718096'}}>
                    <th style={{padding:15}}>Data</th>
                    <th style={{padding:15}}>Cliente</th>
                    <th style={{padding:15}}>Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {contasReceber.map(c => (
                    <tr key={c.id} style={{borderBottom:'1px solid #eee'}}>
                      <td style={{padding:15}}>{new Date(c.data).toLocaleDateString()}</td>
                      <td style={{padding:15}}><b>{c.cliente.nome}</b></td>
                      <td style={{padding:15,color:'#e53e3e',fontWeight:'bold'}}>R$ {Number(c.valor).toFixed(2)}</td>
                      <td>
                        <button onClick={()=>baixarConta(c.id)} style={{...estiloBotao, background:'#48bb78', color:'white'}}>Receber ✅</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* === ABA: HISTÓRICO === */}
        {aba === 'historico' && (
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
                    <button onClick={() => reimprimirVenda(v)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem' }}>🖨️</button>
<button onClick={() => cancelarVenda(v.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.2rem', marginLeft: 10 }} title="Estornar Venda">🚫</button>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAIS (JANELAS FLUTUANTES)
      ===================================================================== */}
      
      {/* 1. MODAL DE CADASTRO DE PRODUTO (COMPLETO) */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
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

      {/* 3. MODAL DE HISTÓRICO DO CLIENTE (DETALHADO) */}
      {modalHistoricoCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 600, maxHeight: '80vh', overflowY: 'auto', display:'flex', flexDirection:'column' }}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
               <h2 style={{margin:0, color:'#2b6cb0'}}>📜 Histórico: {clienteDoHistorico?.nome}</h2>
               <button onClick={()=>setModalHistoricoCliente(false)} style={{border:'none', background:'none', fontSize:'1.5rem', cursor:'pointer'}}>✖</button>
            </div>
            
            <div style={{overflowY:'auto', flex:1}}>
               {/* Substitua da linha 1004 até o fechamento do map */}
{Array.isArray(historicoCliente) && historicoCliente.length > 0 ? (
  historicoCliente.map((v: any) => (
    <div key={v.id} style={{ borderBottom: '1px solid #edf2f7', padding: '15px 0', display: 'flex', justifyContent: 'space-between', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
         <div style={{ fontSize: '0.9rem', color: '#718096' }}>
            {v.data ? new Date(v.data).toLocaleString() : 'Data desconhecida'}
         </div>
         <small>{v.pagamentos?.map((p: any) => p.forma).join(' + ') || 'ANTIGO'}</small>
      </div>

      <div style={{ fontSize: '0.95rem', color: '#2d3748', fontWeight: 'bold' }}>
         {/* Proteção para itens antigos ou excluídos */}
         {v.itens && v.itens.map((i: any) => 
            `${i.quantidade}x ${i.produto ? i.produto.nome : 'Item excluído'}`
         ).join(', ')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 5 }}>
        <span style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '1.1rem' }}>
            R$ {Number(v.total).toFixed(2)}
        </span>
        {/* Botão de Reimprimir que já existe no seu código */}
        <button onClick={() => reimprimirVenda(v)} title="Imprimir 2ª Via" style={{ cursor: 'pointer', border: '1px solid #ccc', background: 'white', borderRadius: 4, padding: '2px 8px' }}>
            🖨️
        </button>
      </div>

    </div>
  ))
) : (
  <p style={{ textAlign: 'center', color: '#a0aec0', padding: 20 }}>Nenhuma compra encontrada.</p>
)}
            </div>
            
            <div style={{marginTop:20, borderTop:'2px solid #e2e8f0', paddingTop:15, textAlign:'right'}}>
               <div style={{color:'#718096', fontSize:'0.9rem'}}>TOTAL GASTO PELO CLIENTE</div>
               <div style={{fontSize:'1.8rem', fontWeight:'bold', color:'#2d3748'}}>
                 R$ {historicoCliente.reduce((acc,v)=>acc+Number(v.total),0).toFixed(2)}
               </div>
            </div>
          </div>
        </div>
      )}

    </div>     
  )
}

export default App