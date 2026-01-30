import { useEffect, useState } from 'react'
import { Login } from './TelaLogin' 

// --- TIPOS ---
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
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
}

interface Venda {
  id: number
  data: string
  total: string
  formaPagamento: string
  cliente?: Cliente
  itens: {
    id: number
    quantidade: string
    precoUnit: string
    produto: Produto
  }[]
}

// NOVO TIPO: CONTA A RECEBER
interface ContaReceber {
  id: number
  valor: string
  data: string
  status: string
  cliente: Cliente
  venda: Venda
}

const estiloInput = {
  padding: '10px',
  borderRadius: '5px',
  border: '1px solid #ddd',
  outline: 'none',
  boxSizing: 'border-box' as const
}

// ⚠️ ATENÇÃO: SE FOR SUBIR PRO RENDER, TROQUE PELO LINK DA SUA API!
const API_URL = 'https://api-vila-verde.onrender.com' 

export function App() {
  // --- LOGIN ---
  const [usuario] = useState(() => {
    const salvo = localStorage.getItem('usuario_vila_verde')
    return salvo ? JSON.parse(salvo) : null
  })

  function fazerLogin(dadosUsuario: any) {
    localStorage.setItem('usuario_vila_verde', JSON.stringify(dadosUsuario))
    window.location.reload()
  }

  function sair() {
    localStorage.removeItem('usuario_vila_verde')
    window.location.reload()
  }

  // --- ESTADOS GERAIS ---
  // Agora temos a aba 'financeiro'
  const [aba, setAba] = useState<'caixa' | 'historico' | 'clientes' | 'financeiro'>('caixa') 
  
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  
  // NOVO ESTADO: CONTAS A RECEBER
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])

  // Caixa
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState('') 
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO') // <--- NOVO

  // Modais
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  
  // Clientes
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null)
  const [modalHistoricoCliente, setModalHistoricoCliente] = useState(false)
  const [historicoCliente, setHistoricoCliente] = useState<Venda[]>([])
  const [clienteDoHistorico, setClienteDoHistorico] = useState<Cliente | null>(null)

  // --- FORMULÁRIOS ---
  const [formProduto, setFormProduto] = useState({
    nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral',
    fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '', ncm: '', cest: '', cfop: '' 
  })

  const [formCliente, setFormCliente] = useState({
    nome: '', cpfCnpj: '', celular: '', endereco: ''
  })

  // --- CARREGAMENTO DE DADOS ---
  async function carregarDados() {
    try {
      const resProdutos = await fetch(`${API_URL}/produtos`)
      setProdutos(await resProdutos.json())

      const resVendas = await fetch(`${API_URL}/vendas`)
      setVendasRealizadas(await resVendas.json())

      const resClientes = await fetch(`${API_URL}/clientes`)
      setClientes(await resClientes.json())
      
      // Carrega o Financeiro
      const resContas = await fetch(`${API_URL}/contas-receber`)
      setContasReceber(await resContas.json())

    } catch (erro) {
      console.error("Erro ao carregar dados", erro)
    }
  }

  useEffect(() => {
    if (usuario) carregarDados()
  }, [usuario])

  // --- FUNÇÕES DE CLIENTES ---
  function abrirModalNovoCliente() {
    setClienteEmEdicao(null)
    setFormCliente({ nome: '', cpfCnpj: '', celular: '', endereco: '' })
    setModalClienteAberto(true)
  }

  function abrirModalEditarCliente(cliente: Cliente) {
    setClienteEmEdicao(cliente)
    setFormCliente({
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj || '',
      celular: cliente.celular || '',
      endereco: cliente.endereco || ''
    })
    setModalClienteAberto(true)
  }

  async function verHistoricoCliente(cliente: Cliente) {
    try {
      const res = await fetch(`${API_URL}/clientes/${cliente.id}/vendas`)
      if (res.ok) {
        setHistoricoCliente(await res.json())
        setClienteDoHistorico(cliente)
        setModalHistoricoCliente(true)
      } else {
        alert("Erro ao buscar histórico.")
      }
    } catch (e) { alert("Erro de conexão") }
  }

  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault()
    const url = clienteEmEdicao ? `${API_URL}/clientes/${clienteEmEdicao.id}` : `${API_URL}/clientes`
    const metodo = clienteEmEdicao ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCliente)
      })
      if (res.ok) {
        setModalClienteAberto(false)
        carregarDados()
        alert(clienteEmEdicao ? "Cliente atualizado!" : "Cliente cadastrado!")
      } else {
        alert("Erro ao salvar cliente.")
      }
    } catch (error) { alert("Erro de conexão") }
  }

  async function excluirCliente(id: number) {
    if(!confirm("Tem certeza?")) return
    try {
      await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE' })
      carregarDados()
      alert("Cliente removido.")
    } catch (error) { alert("Erro ao excluir") }
  }

  // --- FUNÇÕES DO FINANCEIRO (NOVO) ---
  async function baixarConta(id: number) {
    if(!confirm("Confirmar recebimento deste valor?")) return
    
    try {
      const res = await fetch(`${API_URL}/contas-receber/${id}/pagar`, { method: 'PUT' })
      if(res.ok) {
        alert("Pagamento recebido com sucesso!")
        carregarDados()
      } else {
        alert("Erro ao baixar conta")
      }
    } catch (e) { alert("Erro de conexão") }
  }

  // --- FUNÇÕES DO CAIXA ---
  function adicionarAoCarrinho(produto: Produto) {
    if (Number(produto.estoque) <= 0) {
      alert("Produto sem estoque!")
      return
    }
    setCarrinho(lista => {
      const existe = lista.find(item => item.produto.id === produto.id)
      if (existe) {
        return lista.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item)
      }
      return [...lista, { produto, quantidade: 1 }]
    })
  }

  async function finalizarVenda() {
    if (carrinho.length === 0) return

    // VALIDAÇÃO DO FIADO
    if (formaPagamento === 'A PRAZO' && !clienteSelecionado) {
      alert("⚠️ Para vender FIADO, você precisa selecionar um CLIENTE!")
      return
    }

    const total = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)
    
    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itens: carrinho.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
          clienteId: clienteSelecionado || null,
          formaPagamento: formaPagamento // <--- MANDA COMO PAGOU
        })
      })

      if (res.ok) {
        const venda = await res.json()
        const nomeCliente = clientes.find(c => c.id === Number(clienteSelecionado))?.nome || 'Consumidor Final'
        
        // Se for fiado, avisa no cupom
        const obs = formaPagamento === 'A PRAZO' ? '(PENDENTE DE PAGAMENTO)' : ''
        
        imprimirCupom(carrinho, total, venda.id, nomeCliente + ' ' + obs)
        setCarrinho([])
        setClienteSelecionado('') 
        setFormaPagamento('DINHEIRO') // Reseta para dinheiro
        alert(formaPagamento === 'A PRAZO' ? "Venda registrada no FIADO!" : "Venda Sucesso!")
        carregarDados() 
      } else {
        alert("Erro ao vender")
      }
    } catch (e) { alert("Erro de conexão") }
  }

  function imprimirCupom(itens: ItemCarrinho[], total: number, id: number, clienteNome: string = '') {
    const html = `<html><body style="font-family: monospace;"><h3 style="margin-bottom:5px">VILA VERDE #${id}</h3><p style="margin:0; font-size: 12px">Cliente: ${clienteNome}</p><hr/>${itens.map(i => `<div>${i.produto.nome}<br/>${i.quantidade}x R$${Number(i.produto.precoVenda).toFixed(2)}</div>`).join('')}<hr/><b>TOTAL: R$ ${total.toFixed(2)}</b><script>window.print()</script></body></html>`
    const win = window.open('', '', 'width=300,height=500'); win?.document.write(html);
  }

  // --- FUNÇÕES DE PRODUTO ---
  function abrirModalCadastro() {
    setProdutoEmEdicao(null)
    setFormProduto({ nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral', fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '', ncm: '', cest: '', cfop: '' })
    setModalAberto(true)
  }

  function abrirModalEdicao(produto: Produto) {
    setProdutoEmEdicao(produto) 
    setFormProduto({ nome: produto.nome, codigoBarra: produto.codigoBarra || '', precoCusto: String(produto.precoCusto), precoVenda: String(produto.precoVenda), estoque: String(produto.estoque), unidade: produto.unidade || 'UN', categoria: produto.categoria || 'Geral', fornecedor: produto.fornecedor || '', localizacao: produto.localizacao || '', ipi: produto.ipi ? String(produto.ipi) : '', icms: produto.icms ? String(produto.icms) : '', frete: produto.frete ? String(produto.frete) : '', ncm: produto.ncm || '', cest: produto.cest || '', cfop: produto.cfop || '' })
    setModalAberto(true)
  }

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...formProduto, precoCusto: Number(formProduto.precoCusto), precoVenda: Number(formProduto.precoVenda), estoque: Number(formProduto.estoque), ipi: Number(formProduto.ipi || 0), icms: Number(formProduto.icms || 0), frete: Number(formProduto.frete || 0) }
    const url = produtoEmEdicao ? `${API_URL}/produtos/${produtoEmEdicao.id}` : `${API_URL}/produtos`
    const metodo = produtoEmEdicao ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { setModalAberto(false); carregarDados(); alert("Salvo com sucesso!"); } else { alert("Erro ao salvar."); }
    } catch (e) { alert("Erro de conexão") }
  }

  async function excluirProduto(id: number) {
    if(!confirm("Excluir produto?")) return
    try { await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' }); carregarDados(); } catch (e) { alert("Erro ao excluir") }
  }

  if (!usuario) return <Login onLogin={fazerLogin} />

  // --- CÁLCULOS DO DASHBOARD ---
  // Vendas Hoje (SÓ O QUE ENTROU DE DINHEIRO/PIX/CARTÃO) - FIADO NÃO ENTRA AQUI!
  const vendasHoje = vendasRealizadas.filter(v => {
    const dataVenda = new Date(v.data).toLocaleDateString()
    const hoje = new Date().toLocaleDateString()
    return dataVenda === hoje && v.formaPagamento !== 'A PRAZO'
  })
  const totalHoje = vendasHoje.reduce((acc, v) => acc + Number(v.total), 0)

  // Total a Receber (Fiado)
  const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0)

  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigoBarra || '').includes(busca))
  const totalCarrinho = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)

  return (
    <div style={{ fontFamily: 'Arial', backgroundColor: '#f4f4f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. BARRA SUPERIOR */}
      <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🏗️ PDV Vila Verde</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
             <div>
               <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>CAIXA HOJE</div>
               <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#2ecc71' }}>R$ {totalHoje.toFixed(2)}</div>
             </div>
             <div>
               <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>A RECEBER (FIADO)</div>
               <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#e74c3c' }}>R$ {totalReceber.toFixed(2)}</div>
             </div>
          </div>
          <div style={{ height: '30px', borderLeft: '1px solid rgba(255,255,255,0.3)' }}></div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: '0.9rem' }}>Olá, <strong>{usuario?.nome || 'Usuário'}</strong></div>
             <button onClick={sair} style={{ marginTop: '4px', backgroundColor: '#e74c3c', border: 'none', color: 'white', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>SAIR 🚪</button>
          </div>
        </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO */}
      <div style={{ display: 'flex', backgroundColor: 'white', padding: '0 20px', borderBottom: '1px solid #ddd', gap: '10px' }}>
        <button onClick={() => setAba('caixa')} style={{ padding: '15px', background: 'none', border: 'none', borderBottom: aba === 'caixa' ? '3px solid #007bff' : 'none', fontWeight: 'bold', cursor: 'pointer', color: aba === 'caixa' ? '#007bff' : '#666' }}>🛒 CAIXA</button>
        <button onClick={() => setAba('clientes')} style={{ padding: '15px', background: 'none', border: 'none', borderBottom: aba === 'clientes' ? '3px solid #007bff' : 'none', fontWeight: 'bold', cursor: 'pointer', color: aba === 'clientes' ? '#007bff' : '#666' }}>👥 CLIENTES</button>
        <button onClick={() => setAba('financeiro')} style={{ padding: '15px', background: 'none', border: 'none', borderBottom: aba === 'financeiro' ? '3px solid #007bff' : 'none', fontWeight: 'bold', cursor: 'pointer', color: aba === 'financeiro' ? '#e74c3c' : '#666' }}>💲 FINANCEIRO (Fiado)</button>
        <button onClick={() => setAba('historico')} style={{ padding: '15px', background: 'none', border: 'none', borderBottom: aba === 'historico' ? '3px solid #007bff' : 'none', fontWeight: 'bold', cursor: 'pointer', color: aba === 'historico' ? '#007bff' : '#666' }}>📜 VENDAS</button>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
        
        {/* === TELA DO CAIXA === */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input autoFocus placeholder="🔍 Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
                <button onClick={abrirModalCadastro} style={{ padding: '0 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ NOVO</button>
              </div>
              <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px', paddingBottom: '20px' }}>
                {produtosFiltrados.map(prod => (
                  <div key={prod.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{prod.nome}</h3>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => abrirModalEdicao(prod)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.2rem' }}>✏️</button>
                          <button onClick={() => excluirProduto(prod.id)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.2rem' }}>🗑️</button>
                        </div>
                      </div>
                      <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>Est: {prod.estoque} {prod.unidade}</p>
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '1.2rem' }}>R$ {Number(prod.precoVenda).toFixed(2)}</span>
                      <button onClick={() => adicionarAoCarrinho(prod)} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* --- CARRINHO COM OPÇÕES DE PAGAMENTO --- */}
            <div style={{ width: '350px', backgroundColor: 'white', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 10px rgba(0,0,0,0.05)' }}>
              <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', margin: '0 0 10px 0' }}>🛒 Carrinho</h2>
              
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>Cliente:</label>
              <select value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)} style={{ marginBottom: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', width: '100%', fontSize: '0.9rem' }}>
                <option value="">👤 Consumidor Final</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>

              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555' }}>Forma de Pagamento:</label>
              <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} style={{ marginBottom: '15px', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', width: '100%', fontSize: '0.9rem', backgroundColor: formaPagamento === 'A PRAZO' ? '#ffebee' : 'white', color: formaPagamento === 'A PRAZO' ? '#c0392b' : 'black', fontWeight: formaPagamento === 'A PRAZO' ? 'bold' : 'normal' }}>
                <option value="DINHEIRO">💵 Dinheiro</option>
                <option value="PIX">💠 PIX</option>
                <option value="CARTAO">💳 Cartão</option>
                <option value="A PRAZO">📒 A PRAZO (FIADO)</option>
              </select>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {carrinho.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #f9f9f9', paddingBottom: '5px' }}>
                    <div><b>{item.produto.nome}</b><div style={{ fontSize: '0.8rem', color: '#666' }}>{item.quantidade}x R$ {Number(item.produto.precoVenda).toFixed(2)}</div></div>
                    <b>R$ {(item.quantidade * Number(item.produto.precoVenda)).toFixed(2)}</b>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '2px solid #333', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '15px' }}><span>Total</span><span>R$ {totalCarrinho.toFixed(2)}</span></div>
                <button onClick={finalizarVenda} disabled={carrinho.length === 0} style={{ width: '100%', padding: '15px', backgroundColor: carrinho.length > 0 ? (formaPagamento === 'A PRAZO' ? '#e74c3c' : '#28a745') : '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: carrinho.length > 0 ? 'pointer' : 'not-allowed' }}>
                  {formaPagamento === 'A PRAZO' ? 'GRAVAR FIADO 📒' : 'FINALIZAR (F5)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === TELA FINANCEIRO (NOVO) === */}
        {aba === 'financeiro' && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowY: 'auto', height: '100%' }}>
            <h2>💲 Contas a Receber (Fiado)</h2>
            {contasReceber.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}><h3>Ninguém devendo! Tudo em dia. 🎉</h3></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#c0392b' }}>
                    <th style={{ padding: '10px' }}>Data</th>
                    <th style={{ padding: '10px' }}>Cliente</th>
                    <th style={{ padding: '10px' }}>Valor</th>
                    <th style={{ padding: '10px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contasReceber.map(conta => (
                    <tr key={conta.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '12px 10px' }}>{new Date(conta.data).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{conta.cliente.nome}</td>
                      <td style={{ padding: '12px 10px', color: '#c0392b', fontWeight: 'bold' }}>R$ {Number(conta.valor).toFixed(2)}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <button onClick={() => baixarConta(conta.id)} style={{ padding: '8px 15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>RECEBER ✅</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* === TELA DE CLIENTES === */}
        {aba === 'clientes' && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowY: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h2>👥 Cadastro de Clientes</h2>
               <button onClick={abrirModalNovoCliente} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>+ Cadastrar Cliente</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#555' }}>
                  <th style={{ padding: '10px' }}>Nome</th>
                  <th style={{ padding: '10px' }}>Celular</th>
                  <th style={{ padding: '10px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(cliente => (
                  <tr key={cliente.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{cliente.nome}</td>
                    <td style={{ padding: '12px 10px' }}>{cliente.celular || '-'}</td>
                    <td style={{ padding: '12px 10px', display: 'flex', gap: '10px' }}>
                      <button onClick={() => verHistoricoCliente(cliente)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>📜</button>
                      <button onClick={() => abrirModalEditarCliente(cliente)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✏️</button>
                      <button onClick={() => excluirCliente(cliente.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* === TELA DE HISTÓRICO GERAL === */}
        {aba === 'historico' && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowY: 'auto', height: '100%' }}>
            <h2>📜 Vendas Recentes</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Data</th>
                  <th style={{ padding: '10px' }}>Cliente</th>
                  <th style={{ padding: '10px' }}>Pagamento</th> {/* NOVO */}
                  <th style={{ padding: '10px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {vendasRealizadas.map(venda => (
                  <tr key={venda.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>#{venda.id}</td>
                    <td style={{ padding: '10px' }}>{new Date(venda.data).toLocaleString()}</td>
                    <td style={{ padding: '10px', color: '#007bff' }}>{venda.cliente?.nome || 'Consumidor'}</td>
                    <td style={{ padding: '10px', fontSize: '0.8rem', fontWeight: 'bold', color: venda.formaPagamento === 'A PRAZO' ? '#c0392b' : '#2ecc71' }}>{venda.formaPagamento || 'DINHEIRO'}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>R$ {Number(venda.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === MODAIS (PRODUTO, CLIENTE, HISTORICO) === */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>{produtoEmEdicao ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={salvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Nome" value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})} style={estiloInput} required />
              <div style={{ display: 'flex', gap: '10px' }}>
                 <input placeholder="Custo" type="number" value={formProduto.precoCusto} onChange={e => setFormProduto({...formProduto, precoCusto: e.target.value})} style={{...estiloInput, flex:1}} />
                 <input placeholder="Venda" type="number" value={formProduto.precoVenda} onChange={e => setFormProduto({...formProduto, precoVenda: e.target.value})} style={{...estiloInput, flex:1}} required />
              </div>
              <input placeholder="Estoque" type="number" value={formProduto.estoque} onChange={e => setFormProduto({...formProduto, estoque: e.target.value})} style={estiloInput} required />
              
              <hr/>
              <strong>Fiscais</strong>
              <div style={{ display: 'flex', gap: '10px' }}>
                 <input placeholder="NCM" value={formProduto.ncm || ''} onChange={e => setFormProduto({...formProduto, ncm: e.target.value})} style={{...estiloInput, flex:1}} />
                 <input placeholder="CEST" value={formProduto.cest || ''} onChange={e => setFormProduto({...formProduto, cest: e.target.value})} style={{...estiloInput, flex:1}} />
                 <input placeholder="CFOP" value={formProduto.cfop || ''} onChange={e => setFormProduto({...formProduto, cfop: e.target.value})} style={{...estiloInput, flex:1}} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)}>Cancelar</button>
                <button type="submit">Salvar</button>
              </div>
            </form> 
          </div> 
        </div>   
      )} 
      
      {/* MODAL CLIENTE */}
      {modalClienteAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '400px' }}>
            <h2>{clienteEmEdicao ? 'Editar' : 'Novo'} Cliente</h2>
            <form onSubmit={salvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input placeholder="Nome" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} style={estiloInput} required />
              <input placeholder="Celular" value={formCliente.celular} onChange={e => setFormCliente({...formCliente, celular: e.target.value})} style={estiloInput} />
              <input placeholder="Endereço" value={formCliente.endereco} onChange={e => setFormCliente({...formCliente, endereco: e.target.value})} style={estiloInput} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalClienteAberto(false)}>Cancelar</button>
                <button type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORICO CLIENTE */}
      {modalHistoricoCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <h2>Histórico: {clienteDoHistorico?.nome}</h2>
               <button onClick={() => setModalHistoricoCliente(false)}>X</button>
            </div>
            {historicoCliente.map(v => (
               <div key={v.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                 <div>Data: {new Date(v.data).toLocaleDateString()}</div>
                 <div style={{fontWeight: 'bold'}}>Total: R$ {Number(v.total).toFixed(2)}</div>
               </div>
            ))}
          </div>
        </div>
      )}

    </div>     
  )
}

export default App