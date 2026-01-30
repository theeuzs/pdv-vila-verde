import { useEffect, useState } from 'react'
import { Login } from './TelaLogin' 

// ============================================================================
// TIPAGEM DE DADOS (TYPES)
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

// TIPO NOVO PARA O PAGAMENTO MISTO
interface PagamentoVenda {
  forma: string
  valor: number
}

interface Venda {
  id: number
  data: string
  total: string
  cliente?: Cliente
  // A venda agora tem uma lista de pagamentos
  pagamentos: { forma: string; valor: string }[] 
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
// ESTILOS (LAYOUT BONITO)
// ============================================================================

const estiloInput = {
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #ddd',
  outline: 'none',
  width: '100%',
  fontSize: '1rem',
  boxSizing: 'border-box' as const
}

const estiloBotao = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold' as const,
  transition: 'all 0.2s'
}

// ⚠️ SEU LINK DO RENDER AQUI
const API_URL = 'https://api-vila-verde.onrender.com'

export function App() {
  // ==========================================================================
  // ESTADOS (STATES)
  // ==========================================================================
  
  // Login
  const [usuario] = useState(() => {
    const salvo = localStorage.getItem('usuario_vila_verde')
    return salvo ? JSON.parse(salvo) : null
  })

  // Navegação
  const [aba, setAba] = useState<'caixa' | 'historico' | 'clientes' | 'financeiro'>('caixa') 
  
  // Dados do Sistema
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])

  // Caixa & Carrinho
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('') 
  const [clienteSelecionado, setClienteSelecionado] = useState('') 
  
  // --- PAGAMENTO MISTO ---
  const [listaPagamentos, setListaPagamentos] = useState<PagamentoVenda[]>([])
  const [valorPagamentoInput, setValorPagamentoInput] = useState('')
  const [formaPagamentoInput, setFormaPagamentoInput] = useState('DINHEIRO')

  // Modais (Janelas)
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null)
  
  const [modalHistoricoCliente, setModalHistoricoCliente] = useState(false)
  const [historicoCliente, setHistoricoCliente] = useState<Venda[]>([])
  const [clienteDoHistorico, setClienteDoHistorico] = useState<Cliente | null>(null)

  // Formulários
  const [formProduto, setFormProduto] = useState({
    nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral',
    fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '', ncm: '', cest: '', cfop: '' 
  })

  const [formCliente, setFormCliente] = useState({
    nome: '', cpfCnpj: '', celular: '', endereco: ''
  })

  // ==========================================================================
  // FUNÇÕES DE LOGIN E CARREGAMENTO
  // ==========================================================================

  function fazerLogin(dadosUsuario: any) {
    localStorage.setItem('usuario_vila_verde', JSON.stringify(dadosUsuario))
    window.location.reload()
  }

  function sair() {
    localStorage.removeItem('usuario_vila_verde')
    window.location.reload()
  }

  async function carregarDados() {
    try {
      const [resProd, resVend, resCli, resConta] = await Promise.all([
        fetch(`${API_URL}/produtos`),
        fetch(`${API_URL}/vendas`),
        fetch(`${API_URL}/clientes`),
        fetch(`${API_URL}/contas-receber`)
      ])
      
      setProdutos(await resProd.json())
      setVendasRealizadas(await resVend.json())
      setClientes(await resCli.json())
      setContasReceber(await resConta.json())
    } catch (erro) {
      console.error("Erro ao carregar dados", erro)
    }
  }

  useEffect(() => {
    if (usuario) carregarDados()
  }, [usuario])

  // ==========================================================================
  // FUNÇÕES DE HAVER (CRÉDITO)
  // ==========================================================================

  async function gerarHaver(cliente: Cliente) {
    const valorStr = prompt(`💰 Gerar HAVER (Devolução) para ${cliente.nome}.\n\nQual o valor da devolução? (Ex: 50.00)`)
    if (!valorStr) return
    
    const valor = parseFloat(valorStr.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido")

    try {
      const res = await fetch(`${API_URL}/clientes/${cliente.id}/haver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor })
      })
      if (res.ok) {
        alert(`Haver de R$ ${valor.toFixed(2)} gerado com sucesso!`)
        carregarDados()
      } else {
        alert("Erro ao gerar haver")
      }
    } catch (e) {
      alert("Erro de conexão")
    }
  }

  // ==========================================================================
  // FUNÇÕES DO CAIXA
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

  // LÓGICA DE PAGAMENTO MISTO (PARCELADO, DINHEIRO + CARTÃO, ETC)
  const totalCarrinho = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)
  const totalPago = listaPagamentos.reduce((acc, p) => acc + p.valor, 0)
  const faltaPagar = totalCarrinho - totalPago

  function adicionarPagamento() {
    let valor = parseFloat(valorPagamentoInput.replace(',', '.'))
    
    // Se o usuário não digitar nada, assume que é o restante que falta
    if (!valor || valor <= 0) {
      valor = faltaPagar
    }
    
    // Aceita 5 centavos de diferença pra não travar por arredondamento
    if (valor > faltaPagar + 0.05) {
      return alert(`Valor maior que o restante! Falta apenas: R$ ${faltaPagar.toFixed(2)}`)
    }
    
    // Validações Específicas
    if ((formaPagamentoInput === 'A PRAZO' || formaPagamentoInput === 'HAVER') && !clienteSelecionado) {
      return alert("⚠️ Selecione um cliente para usar Fiado ou Haver!")
    }
    
    if (formaPagamentoInput === 'HAVER') {
       const cli = clientes.find(c => c.id === Number(clienteSelecionado))
       if (cli && Number(cli.saldoHaver) < valor) {
         return alert(`Saldo de Haver insuficiente! Disponível: R$ ${Number(cli.saldoHaver).toFixed(2)}`)
       }
    }

    setListaPagamentos([...listaPagamentos, { forma: formaPagamentoInput, valor }])
    setValorPagamentoInput('') // Limpa o campo pra digitar o próximo
  }

  function removerPagamento(index: number) {
    setListaPagamentos(listaPagamentos.filter((_, i) => i !== index))
  }

  async function finalizarVenda() {
    if (carrinho.length === 0) return
    
    // Verifica se pagou tudo (com margem de 5 centavos)
    if (Math.abs(faltaPagar) > 0.05) {
      return alert(`Ainda falta pagar R$ ${faltaPagar.toFixed(2)}!`)
    }

    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itens: carrinho.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade })), 
          clienteId: clienteSelecionado || null, 
          pagamentos: listaPagamentos // Manda a lista completa
        })
      })
      
      if (res.ok) {
        const v = await res.json()
        reimprimirVenda(v) // Imprime o cupom
        
        // Limpa tudo
        setCarrinho([])
        setClienteSelecionado('')
        setListaPagamentos([])
        alert("Venda realizada com sucesso!")
        carregarDados()
      } else {
        alert("Erro ao realizar venda")
      }
    } catch (e) {
      alert("Erro de Conexão")
    }
  }

  // ==========================================================================
  // FUNÇÕES DE IMPRESSÃO
  // ==========================================================================

  function reimprimirVenda(venda: Venda) {
    const itensParaCupom = venda.itens.map(i => ({
      produto: i.produto,
      quantidade: Number(i.quantidade)
    }))
    
    const nome = venda.cliente?.nome || 'Consumidor'
    
    // Cria um texto resumindo os pagamentos (Ex: "DINHEIRO: 50.00 | PIX: 20.00")
    const resumoPagamentos = venda.pagamentos?.map(p => 
      `${p.forma}: R$${Number(p.valor).toFixed(2)}`
    ).join(' | ') || 'DINHEIRO'

    imprimirCupom(itensParaCupom, Number(venda.total), venda.id, nome, resumoPagamentos)
  }

  function imprimirCupom(itens: ItemCarrinho[], total: number, id: number, clienteNome: string, obs: string) {
    const win = window.open('', '', 'width=300,height=500'); 
    win?.document.write(`
      <html>
        <body style="font-family: monospace;">
          <h3 style="margin-bottom:5px">VILA VERDE #${id}</h3>
          <p style="margin:0; font-size: 12px">Cli: ${clienteNome}</p>
          <hr/>
          ${itens.map(i => `<div>${i.produto.nome}<br/>${i.quantidade}x R$${Number(i.produto.precoVenda).toFixed(2)}</div>`).join('')}
          <hr/>
          <b>TOTAL: R$ ${total.toFixed(2)}</b>
          <br/>
          <small style="font-size: 10px">Pgto: ${obs}</small>
          <script>window.print()</script>
        </body>
      </html>
    `);
  }

  // ==========================================================================
  // FUNÇÕES AUXILIARES (CRUD)
  // ==========================================================================

  async function baixarConta(id: number) {
    if(!confirm("Confirmar recebimento deste valor?")) return
    try {
      await fetch(`${API_URL}/contas-receber/${id}/pagar`, { method: 'PUT' })
      carregarDados()
      alert("Recebimento confirmado!")
    } catch (e) { alert("Erro de conexão") }
  }

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...formProduto,
      precoCusto: Number(formProduto.precoCusto),
      precoVenda: Number(formProduto.precoVenda),
      estoque: Number(formProduto.estoque),
      ipi: Number(formProduto.ipi||0),
      icms: Number(formProduto.icms||0),
      frete: Number(formProduto.frete||0)
    }

    const url = produtoEmEdicao ?(`${API_URL}/produtos/${produtoEmEdicao.id}`):(`${API_URL}/produtos`)
    const met = produtoEmEdicao?'PUT':'POST'

    const res = await fetch(url,{method:met,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    if(res.ok){
      setModalAberto(false)
      carregarDados()
      alert("Produto salvo com sucesso!")
    }
  }

  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault()
    const url = clienteEmEdicao ?(`${API_URL}/clientes/${clienteEmEdicao.id}`):(`${API_URL}/clientes`)
    const met = clienteEmEdicao?'PUT':'POST'

    const res = await fetch(url,{method:met,headers:{'Content-Type':'application/json'},body:JSON.stringify(formCliente)})
    if(res.ok){
      setModalClienteAberto(false)
      carregarDados()
      alert("Cliente salvo com sucesso!")
    }
  }
  
  async function excluirProduto(id: number) {
    if(confirm("Tem certeza que deseja excluir?")) {
      await fetch(`${API_URL}/produtos/${id}`,{method:'DELETE'})
      carregarDados()
    }
  }

  async function excluirCliente(id: number) {
    if(confirm("Tem certeza que deseja excluir?")) {
      await fetch(`${API_URL}/clientes/${id}`,{method:'DELETE'})
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

  if (!usuario) return <Login onLogin={fazerLogin} />

  // ==========================================================================
  // CÁLCULOS DO DASHBOARD
  // ==========================================================================

  // Total Hoje: Soma das vendas do dia (usando os pagamentos para precisão)
  const totalHoje = vendasRealizadas
    .filter(v => new Date(v.data).toLocaleDateString() === new Date().toLocaleDateString())
    .reduce((acc, v) => {
      // Soma apenas o que entrou de dinheiro (exclui o 'A PRAZO')
      const pagouAgora = v.pagamentos?.filter(p => p.forma !== 'A PRAZO').reduce((sum, p) => sum + Number(p.valor), 0) || 0
      return acc + pagouAgora
    }, 0)

  const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0)
  
  const prodsFilt = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigoBarra||'').includes(busca))
  
  const clienteObjSelecionado = clientes.find(c => c.id === Number(clienteSelecionado))


  // ==========================================================================
  // RENDERIZAÇÃO (INTERFACE VISUAL)
  // ==========================================================================
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. HEADER / TOPO */}
      <div style={{ backgroundColor: '#1a202c', color: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>🏗️ PDV Vila Verde</h2>
        
        <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, letterSpacing: 1 }}>CAIXA HOJE</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#48bb78' }}>R$ {totalHoje.toFixed(2)}</div>
          </div>
          <div style={{ width: 1, height: 30, background: '#4a5568' }}></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, letterSpacing: 1 }}>A RECEBER</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#f56565' }}>R$ {totalReceber.toFixed(2)}</div>
          </div>
          <button onClick={sair} style={{ backgroundColor: '#e53e3e', color: 'white', border: 'none', padding: '8px 15px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', marginLeft: 20 }}>SAIR</button>
        </div>
      </div>

      {/* 2. BARRA DE ABAS */}
      <div style={{ display: 'flex', backgroundColor: 'white', padding: '0 30px', borderBottom: '1px solid #e2e8f0' }}>
        {['caixa','clientes','financeiro','historico'].map(t => (
          <button key={t} onClick={() => setAba(t as any)} 
            style={{ 
              padding: '20px 25px', 
              background: 'none', 
              border: 'none', 
              borderBottom: aba === t ? '4px solid #3182ce' : '4px solid transparent', 
              fontWeight: 'bold', 
              fontSize: '1rem',
              color: aba === t ? '#2b6cb0' : '#718096', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            {t === 'financeiro' ? '💲 FINANCEIRO' : t === 'caixa' ? '🛒 CAIXA' : t === 'clientes' ? '👥 CLIENTES' : '📜 VENDAS'}
          </button>
        ))}
      </div>

      {/* 3. CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, padding: '30px', overflow: 'hidden' }}>
        
        {/* === TELA: CAIXA === */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', height: '100%', gap: 30 }}>
            {/* Esquerda: Lista de Produtos */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                <input autoFocus placeholder="🔍 Buscar produto por nome ou código..." value={busca} onChange={e => setBusca(e.target.value)} style={{ ...estiloInput, fontSize: '1.1rem' }} />
                <button onClick={() => { setProdutoEmEdicao(null); setFormProduto({nome:'', codigoBarra:'', precoCusto:'', precoVenda:'', estoque:'', unidade:'UN', categoria:'Geral', fornecedor:'', localizacao:'', ipi:'', icms:'', frete:'', ncm:'', cest:'', cfop:''}); setModalAberto(true) }} style={{ ...estiloBotao, backgroundColor: '#48bb78', color: 'white', fontSize: '1rem' }}>+ NOVO PRODUTO</button>
              </div>

              <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, paddingBottom: 20 }}>
                {prodsFilt.map(p => (
                  <div key={p.id} style={{ backgroundColor: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #edf2f7' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#2d3748' }}>{p.nome}</h3>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => { setProdutoEmEdicao(p); setFormProduto({ nome: p.nome, codigoBarra: p.codigoBarra || '', precoCusto: String(p.precoCusto), precoVenda: String(p.precoVenda), estoque: String(p.estoque), unidade: p.unidade || 'UN', categoria: p.categoria || 'Geral', fornecedor: p.fornecedor || '', localizacao: p.localizacao || '', ipi: String(p.ipi || ''), icms: String(p.icms || ''), frete: String(p.frete || ''), ncm: p.ncm || '', cest: p.cest || '', cfop: p.cfop || '' }); setModalAberto(true) }} style={{ border: 'none', background: '#edf2f7', borderRadius: 5, cursor: 'pointer', padding: 5 }}>✏️</button>
                          <button onClick={() => excluirProduto(p.id)} style={{ border: 'none', background: '#fed7d7', color: '#c53030', borderRadius: 5, cursor: 'pointer', padding: 5 }}>🗑️</button>
                        </div>
                      </div>
                      <p style={{ color: '#718096', fontSize: '0.9rem', margin: 0 }}>Estoque: <b>{p.estoque}</b> {p.unidade}</p>
                    </div>
                    <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: '#2b6cb0' }}>R$ {Number(p.precoVenda).toFixed(2)}</span>
                      <button onClick={() => adicionarAoCarrinho(p)} style={{ backgroundColor: '#3182ce', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>+ ADD</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direita: Carrinho (ATUALIZADO PARA MULTI-PAGAMENTO) */}
            <div style={{ width: 400, backgroundColor: 'white', borderRadius: 12, padding: 25, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }}>
              <h2 style={{ margin: '0 0 20px 0', paddingBottom: 15, borderBottom: '1px solid #edf2f7' }}>🛒 Carrinho</h2>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.9rem', color: '#718096', fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Cliente</label>
                <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)} style={{ ...estiloInput, borderColor: '#cbd5e0' }}>
                  <option value="">👤 Consumidor Final</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {/* AVISO DE HAVER */}
              {clienteObjSelecionado && Number(clienteObjSelecionado.saldoHaver) > 0 && (
                <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 8, color: '#2f855a' }}>
                  💰 <b>Haver Disponível:</b> R$ {Number(clienteObjSelecionado.saldoHaver).toFixed(2)}
                </div>
              )}

              {/* Lista de Itens no Carrinho */}
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #edf2f7', borderRadius: 8, padding: 10, marginBottom: 20, maxHeight: 200 }}>
                {carrinho.length === 0 ? <p style={{ textAlign: 'center', color: '#a0aec0', marginTop: 50 }}>Carrinho vazio</p> : 
                  carrinho.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid #edf2f7', paddingBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#2d3748' }}>{item.produto.nome}</div>
                        <div style={{ fontSize: '0.85rem', color: '#718096' }}>{item.quantidade}x R$ {Number(item.produto.precoVenda).toFixed(2)}</div>
                      </div>
                      <div style={{ fontWeight: 'bold' }}>R$ {(item.quantidade * Number(item.produto.precoVenda)).toFixed(2)}</div>
                    </div>
                  ))
                }
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 15, color: '#2d3748' }}>
                  <span>Total</span>
                  <span>R$ {totalCarrinho.toFixed(2)}</span>
              </div>

              {/* ÁREA DE PAGAMENTO MISTO (NOVA E EXPANDIDA) */}
              <div style={{ backgroundColor: '#f7fafc', padding: 15, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 15 }}>
                 
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: faltaPagar > 0 ? '#e53e3e' : '#48bb78', fontWeight: 'bold' }}>
                    <span>Falta Pagar:</span>
                    <span>R$ {Math.max(0, faltaPagar).toFixed(2)}</span>
                 </div>
                 
                 {/* Inputs de Pagamento */}
                 <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <input 
                      type="number" 
                      placeholder={faltaPagar > 0 ? faltaPagar.toFixed(2) : "0.00"} 
                      value={valorPagamentoInput} 
                      onChange={e => setValorPagamentoInput(e.target.value)} 
                      style={{ ...estiloInput, width: '100px', padding: 8 }} 
                    />
                    
                    <select 
                      value={formaPagamentoInput} 
                      onChange={e => setFormaPagamentoInput(e.target.value)} 
                      style={{ ...estiloInput, padding: 8, flex: 1 }}
                    >
                       <option value="DINHEIRO">Dinheiro</option>
                       <option value="PIX">Pix</option>
                       <option value="CARTAO">Cartão</option>
                       <option value="A PRAZO">Fiado (A Prazo)</option>
                       <option value="HAVER">Haver (Crédito)</option>
                    </select>
                    
                    <button 
                      onClick={adicionarPagamento} 
                      disabled={faltaPagar <= 0.05} 
                      style={{ 
                        ...estiloBotao, 
                        backgroundColor: faltaPagar <= 0.05 ? '#cbd5e0' : '#3182ce', 
                        color: 'white', 
                        padding: '0 15px' 
                      }}>
                      +
                    </button>
                 </div>

                 {/* Lista de Pagamentos Adicionados */}
                 <div style={{ fontSize: '0.9rem' }}>
                    {listaPagamentos.map((p, i) => (
                       <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e0', padding: '8px 0', color: '#4a5568' }}>
                          <span>{p.forma}: R$ {p.valor.toFixed(2)}</span>
                          <button onClick={() => removerPagamento(i)} style={{ border: 'none', background: 'none', color: '#e53e3e', cursor: 'pointer', fontWeight: 'bold' }}>✖</button>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Botão Finalizar */}
              <button 
                onClick={finalizarVenda} 
                disabled={carrinho.length === 0 || faltaPagar > 0.05} 
                style={{ 
                  width: '100%', 
                  padding: 18, 
                  backgroundColor: (faltaPagar <= 0.05 && carrinho.length > 0) ? '#48bb78' : '#cbd5e0', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 10, 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold', 
                  cursor: (faltaPagar <= 0.05 && carrinho.length > 0) ? 'pointer' : 'not-allowed',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                FINALIZAR VENDA
              </button>
            </div>
          </div>
        )}

        {/* === TELA: CLIENTES === */}
        {aba === 'clientes' && (
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 30, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <h2 style={{ margin: 0, color: '#2d3748' }}>👥 Gestão de Clientes</h2>
              <button onClick={() => { setClienteEmEdicao(null); setFormCliente({ nome:'', cpfCnpj:'', celular:'', endereco:'' }); setModalClienteAberto(true) }} style={{ ...estiloBotao, backgroundColor: '#48bb78', color: 'white' }}>+ NOVO CLIENTE</button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#718096' }}>
                  <th style={{ padding: 15 }}>NOME</th>
                  <th style={{ padding: 15 }}>CPF / ENDEREÇO</th>
                  <th style={{ padding: 15 }}>SALDO HAVER</th>
                  <th style={{ padding: 15, textAlign: 'right' }}>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: 15, fontWeight: 'bold', color: '#2d3748' }}>
                      {c.nome}
                      <div style={{ fontSize: '0.85rem', color: '#718096', fontWeight: 'normal' }}>{c.celular || 'Sem celular'}</div>
                    </td>
                    <td style={{ padding: 15, fontSize: '0.9rem', color: '#4a5568' }}>
                      <div>{c.cpfCnpj || '-'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#718096' }}>{c.endereco}</div>
                    </td>
                    <td style={{ padding: 15 }}>
                      <span style={{ backgroundColor: Number(c.saldoHaver) > 0 ? '#c6f6d5' : '#edf2f7', color: Number(c.saldoHaver) > 0 ? '#22543d' : '#a0aec0', padding: '5px 10px', borderRadius: 20, fontWeight: 'bold', fontSize: '0.9rem' }}>
                        R$ {Number(c.saldoHaver).toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: 15, textAlign: 'right', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button onClick={() => gerarHaver(c)} style={{ border: '1px solid #48bb78', background: 'white', color: '#48bb78', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold' }}>💰 Haver</button>
                      <button onClick={() => verHistorico(c)} title="Histórico" style={{ background: '#bee3f8', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>📜</button>
                      <button onClick={() => { setClienteEmEdicao(c); setFormCliente({ nome:c.nome, cpfCnpj:c.cpfCnpj||'', celular:c.celular||'', endereco:c.endereco||'' }); setModalClienteAberto(true) }} title="Editar" style={{ background: '#e2e8f0', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => excluirCliente(c.id)} title="Excluir" style={{ background: '#fed7d7', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === TELA: FINANCEIRO === */}
        {aba === 'financeiro' && (
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 30, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '100%', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 30px 0', color: '#c53030' }}>💲 Contas a Receber (Fiado)</h2>
            {contasReceber.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 50, color: '#a0aec0' }}><h3>Nenhuma conta pendente. Tudo pago! 🎉</h3></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#c53030' }}>
                    <th style={{ padding: 15 }}>DATA</th>
                    <th style={{ padding: 15 }}>CLIENTE</th>
                    <th style={{ padding: 15 }}>VALOR</th>
                    <th style={{ padding: 15 }}>AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {contasReceber.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                      <td style={{ padding: 15 }}>{new Date(c.data).toLocaleDateString()}</td>
                      <td style={{ padding: 15, fontWeight: 'bold' }}>{c.cliente.nome}</td>
                      <td style={{ padding: 15, color: '#c53030', fontWeight: 'bold', fontSize: '1.1rem' }}>R$ {Number(c.valor).toFixed(2)}</td>
                      <td style={{ padding: 15 }}>
                        <button onClick={() => baixarConta(c.id)} style={{ backgroundColor: '#48bb78', color: 'white', border: 'none', padding: '8px 15px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>RECEBER ✅</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* === TELA: HISTÓRICO GERAL === */}
        {aba === 'historico' && (
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 30, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '100%', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 30px 0', color: '#2d3748' }}>📜 Histórico de Vendas</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#718096' }}>
                  <th style={{ padding: 15 }}>ID</th>
                  <th style={{ padding: 15 }}>DATA</th>
                  <th style={{ padding: 15 }}>CLIENTE</th>
                  <th style={{ padding: 15 }}>PAGAMENTO</th>
                  <th style={{ padding: 15 }}>TOTAL</th>
                  <th style={{ padding: 15 }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {vendasRealizadas.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                    <td style={{ padding: 15, color: '#718096' }}>#{v.id}</td>
                    <td style={{ padding: 15 }}>{new Date(v.data).toLocaleString()}</td>
                    <td style={{ padding: 15, fontWeight: 'bold' }}>{v.cliente?.nome || 'Consumidor'}</td>
                    <td style={{ padding: 15 }}>
                      <small style={{ color: '#4a5568' }}>
                         {v.pagamentos?.map(p => p.forma).join(' + ') || 'ANTIGO'}
                      </small>
                    </td>
                    <td style={{ padding: 15, fontWeight: 'bold' }}>R$ {Number(v.total).toFixed(2)}</td>
                    <td style={{ padding: 15 }}>
                      <button onClick={() => reimprimirVenda(v)} title="Reimprimir Cupom" style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }}>🖨️</button>
                    </td>
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

      {/* MODAL PRODUTO */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, color: '#2d3748' }}>{produtoEmEdicao ? '✏️ Editar Produto' : '✨ Novo Produto'}</h2>
            <form onSubmit={salvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <input placeholder="Nome do Produto" value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})} style={estiloInput} required />
              <input placeholder="Código de Barras" value={formProduto.codigoBarra} onChange={e => setFormProduto({...formProduto, codigoBarra: e.target.value})} style={estiloInput} />
              
              <div style={{ display: 'flex', gap: 15 }}>
                 <div style={{ flex: 1 }}><label style={{fontSize:'0.8rem'}}>Preço Custo</label><input type="number" step="0.01" value={formProduto.precoCusto} onChange={e => setFormProduto({...formProduto, precoCusto: e.target.value})} style={estiloInput} /></div>
                 <div style={{ flex: 1 }}><label style={{fontSize:'0.8rem'}}>Preço Venda</label><input type="number" step="0.01" value={formProduto.precoVenda} onChange={e => setFormProduto({...formProduto, precoVenda: e.target.value})} style={estiloInput} required /></div>
              </div>
              
              <div style={{ display: 'flex', gap: 15 }}>
                 <div style={{ flex: 2 }}><label style={{fontSize:'0.8rem'}}>Estoque Atual</label><input type="number" value={formProduto.estoque} onChange={e => setFormProduto({...formProduto, estoque: e.target.value})} style={estiloInput} required /></div>
                 <div style={{ flex: 1 }}><label style={{fontSize:'0.8rem'}}>Unidade</label><input placeholder="UN/CX" value={formProduto.unidade} onChange={e => setFormProduto({...formProduto, unidade: e.target.value})} style={estiloInput} /></div>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '10px 0' }}/>
              <strong style={{ color: '#718096' }}>Fiscal (Opcional)</strong>
              <div style={{ display: 'flex', gap: 10 }}>
                 <input placeholder="NCM" value={formProduto.ncm || ''} onChange={e => setFormProduto({...formProduto, ncm: e.target.value})} style={estiloInput} />
                 <input placeholder="CEST" value={formProduto.cest || ''} onChange={e => setFormProduto({...formProduto, cest: e.target.value})} style={estiloInput} />
                 <input placeholder="CFOP" value={formProduto.cfop || ''} onChange={e => setFormProduto({...formProduto, cfop: e.target.value})} style={estiloInput} />
              </div>

              <div style={{ display: 'flex', gap: 15, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ ...estiloBotao, backgroundColor: '#cbd5e0', color: '#4a5568' }}>Cancelar</button>
                <button type="submit" style={{ ...estiloBotao, backgroundColor: '#3182ce', color: 'white' }}>Salvar Produto</button>
              </div>
            </form> 
          </div> 
        </div>   
      )} 
      
      {/* MODAL CLIENTE */}
      {modalClienteAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, color: '#2d3748' }}>{clienteEmEdicao ? '✏️ Editar Cliente' : '👤 Novo Cliente'}</h2>
            <form onSubmit={salvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <input placeholder="Nome Completo" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} style={estiloInput} required />
              <input placeholder="CPF ou CNPJ" value={formCliente.cpfCnpj} onChange={e => setFormCliente({...formCliente, cpfCnpj: e.target.value})} style={estiloInput} />
              <input placeholder="Celular / WhatsApp" value={formCliente.celular} onChange={e => setFormCliente({...formCliente, celular: e.target.value})} style={estiloInput} />
              <textarea placeholder="Endereço Completo" value={formCliente.endereco} onChange={e => setFormCliente({...formCliente, endereco: e.target.value})} style={{ ...estiloInput, height: 80, resize: 'none' }} />
              
              <div style={{ display: 'flex', gap: 15, marginTop: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalClienteAberto(false)} style={{ ...estiloBotao, backgroundColor: '#cbd5e0', color: '#4a5568' }}>Cancelar</button>
                <button type="submit" style={{ ...estiloBotao, backgroundColor: '#48bb78', color: 'white' }}>Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* MODAL HISTORICO CLIENTE */}
      {modalHistoricoCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: 'white', padding: 30, borderRadius: 15, width: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h2 style={{ margin: 0, color: '#2b6cb0' }}>📜 Histórico: {clienteDoHistorico?.nome}</h2>
               <button onClick={() => setModalHistoricoCliente(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#718096' }}>✖️</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 5 }}>
              {historicoCliente.length === 0 ? <p style={{textAlign:'center', color:'#a0aec0'}}>Nenhuma compra encontrada.</p> : 
                historicoCliente.map(v => (
                  <div key={v.id} style={{ borderBottom: '1px solid #edf2f7', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                       <div style={{ fontSize: '0.9rem', color: '#718096', marginBottom: 3 }}>
                         {new Date(v.data).toLocaleDateString()} • <small>{v.pagamentos?.map(p => p.forma).join('+') || 'ANTIGO'}</small>
                       </div>
                       <div style={{ fontSize: '0.95rem', color: '#2d3748' }}>
                         {v.itens.map(i => `${i.quantidade}x ${i.produto.nome}`).join(', ')}
                       </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                       <span style={{ fontWeight: 'bold', color: '#2b6cb0', fontSize: '1.1rem' }}>R$ {Number(v.total).toFixed(2)}</span>
                       <button onClick={() => reimprimirVenda(v)} title="Imprimir 2ª Via" style={{ cursor: 'pointer', border: '1px solid #e2e8f0', background: 'white', borderRadius: 6, padding: '5px 8px' }}>🖨️</button>
                    </div>
                  </div>
                ))
              }
            </div>

            <div style={{ marginTop: 20, borderTop: '2px solid #e2e8f0', paddingTop: 15, textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', color: '#718096' }}>TOTAL ACUMULADO</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2d3748' }}>
                R$ {historicoCliente.reduce((acc, v) => acc + Number(v.total), 0).toFixed(2)}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>     
  )
}

export default App