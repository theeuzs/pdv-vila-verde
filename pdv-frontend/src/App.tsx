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
  // Fiscais
  fornecedor?: string
  localizacao?: string
  ipi?: number
  icms?: number
  frete?: number
  ncm?: string
  cest?: string
  cfop?: string
}

// NOVO TIPO: CLIENTE
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
  itens: {
    id: number
    quantidade: string
    precoUnit: string
    produto: Produto
  }[]
}

const estiloInput = {
  padding: '10px',
  borderRadius: '5px',
  border: '1px solid #ddd',
  outline: 'none',
  boxSizing: 'border-box' as const
}

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
  // Agora a aba pode ser 'clientes' também
  const [aba, setAba] = useState<'caixa' | 'historico' | 'clientes'>('caixa') 
  
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([])
  
  // NOVO ESTADO: CLIENTES
  const [clientes, setClientes] = useState<Cliente[]>([])

  // ... outros estados ...
  const [modalClienteAberto, setModalClienteAberto] = useState(false)
  
  // NOVO: Cliente selecionado no caixa
  const [clienteSelecionado, setClienteSelecionado] = useState('')

  // Caixa
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')

  // Modais
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)

  // --- FORMULÁRIOS ---
  const [formProduto, setFormProduto] = useState({
    nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral',
    fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '', ncm: '', cest: '', cfop: '' 
  })

  // NOVO FORMULÁRIO: CLIENTE
  const [formCliente, setFormCliente] = useState({
    nome: '', cpfCnpj: '', celular: '', endereco: ''
  })

  // --- CARREGAMENTO DE DADOS ---
  async function carregarDados() {
    try {
      const resProdutos = await fetch('http://localhost:3333/produtos')
      setProdutos(await resProdutos.json())

      const resVendas = await fetch('http://localhost:3333/vendas')
      setVendasRealizadas(await resVendas.json())

      // Carrega Clientes Também
      const resClientes = await fetch('http://localhost:3333/clientes')
      setClientes(await resClientes.json())

    } catch (erro) {
      console.error("Erro ao carregar dados", erro)
    }
  }

  useEffect(() => {
    if (usuario) carregarDados()
  }, [usuario])

  // --- FUNÇÕES DE CLIENTES (NOVAS) ---
  function abrirModalCliente() {
    setFormCliente({ nome: '', cpfCnpj: '', celular: '', endereco: '' })
    setModalClienteAberto(true)
  }

  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:3333/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCliente)
      })
      if (res.ok) {
        setModalClienteAberto(false)
        carregarDados()
        alert("Cliente cadastrado com sucesso!")
      } else {
        alert("Erro ao cadastrar cliente.")
      }
    } catch (error) { alert("Erro de conexão") }
  }

  async function excluirCliente(id: number) {
    if(!confirm("Tem certeza que deseja excluir este cliente?")) return
    try {
      await fetch(`http://localhost:3333/clientes/${id}`, { method: 'DELETE' })
      carregarDados()
      alert("Cliente removido.")
    } catch (error) { alert("Erro ao excluir") }
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
    const total = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)
    
    try {
      const res = await fetch('http://localhost:3333/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itens: carrinho.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
          clienteId: clienteSelecionado || null // <--- MANDA O CLIENTE PRO SERVIDOR
        })
      })

      if (res.ok) {
        const venda = await res.json()
        
        // Se tiver cliente, imprime o nome dele no cupom
        const nomeCliente = clientes.find(c => c.id === Number(clienteSelecionado))?.nome || 'Consumidor Final'
        
        imprimirCupom(carrinho, total, venda.id, nomeCliente)
        
        setCarrinho([])
        setClienteSelecionado('') // Limpa o cliente depois da venda
        alert("Venda Sucesso!")
        carregarDados() 
      } else {
        alert("Erro ao vender")
      }
    } catch (e) { alert("Erro de conexão") }
  }

  function imprimirCupom(itens: ItemCarrinho[], total: number, id: number, clienteNome: string = '') {
    const html = `
      <html>
        <body style="font-family: monospace;">
          <h3 style="margin-bottom:5px">VILA VERDE #${id}</h3>
          <p style="margin:0; font-size: 12px">Cliente: ${clienteNome}</p>
          <hr/>
          ${itens.map(i => `<div>${i.produto.nome}<br/>${i.quantidade}x R$${Number(i.produto.precoVenda).toFixed(2)}</div>`).join('')}
          <hr/>
          <b>TOTAL: R$ ${total.toFixed(2)}</b>
          <script>window.print()</script>
        </body>
      </html>`
    const win = window.open('', '', 'width=300,height=500'); 
    win?.document.write(html);
  }

  // --- FUNÇÕES DE PRODUTO ---
  function abrirModalCadastro() {
    setProdutoEmEdicao(null)
    setFormProduto({
      nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral',
      fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '', ncm: '', cest: '', cfop: '' 
    })
    setModalAberto(true)
  }

  function abrirModalEdicao(produto: Produto) {
    setProdutoEmEdicao(produto) 
    setFormProduto({
      nome: produto.nome,
      codigoBarra: produto.codigoBarra || '',
      precoCusto: String(produto.precoCusto),
      precoVenda: String(produto.precoVenda),
      estoque: String(produto.estoque),
      unidade: produto.unidade || 'UN',
      categoria: produto.categoria || 'Geral',
      fornecedor: produto.fornecedor || '',
      localizacao: produto.localizacao || '',
      ipi: produto.ipi ? String(produto.ipi) : '',
      icms: produto.icms ? String(produto.icms) : '',
      frete: produto.frete ? String(produto.frete) : '',
      ncm: produto.ncm || '',
      cest: produto.cest || '',
      cfop: produto.cfop || ''
    })
    setModalAberto(true)
  }

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

    const url = produtoEmEdicao 
      ? `http://localhost:3333/produtos/${produtoEmEdicao.id}` 
      : 'http://localhost:3333/produtos' 
    
    const metodo = produtoEmEdicao ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setModalAberto(false)
        carregarDados()
        alert(produtoEmEdicao ? "Produto atualizado!" : "Produto cadastrado!")
      } else {
        alert("Erro ao salvar.")
      }
    } catch (e) { alert("Erro de conexão") }
  }

  async function excluirProduto(id: number) {
    if(!confirm("Tem certeza que deseja excluir este produto?")) return
    try {
      const res = await fetch(`http://localhost:3333/produtos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        alert("Produto excluído.")
        carregarDados()
      } else {
        const erro = await res.json()
        alert(`Erro do Servidor: ${erro.erro}`)
      }
    } catch (e: any) { alert(`Erro de Conexão: ${e.message}`) }
  }

  // SE NÃO TIVER USUÁRIO
  if (!usuario) return <Login onLogin={fazerLogin} />

  // CÁLCULOS DO DASHBOARD
  const vendasHoje = vendasRealizadas.filter(v => {
    const dataVenda = new Date(v.data).toLocaleDateString()
    const hoje = new Date().toLocaleDateString()
    return dataVenda === hoje
  })
  const totalHoje = vendasHoje.reduce((acc, v) => acc + Number(v.total), 0)

  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigoBarra || '').includes(busca))
  const totalCarrinho = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)

  // --- RENDERIZAÇÃO DO APP ---
  return (
    <div style={{ fontFamily: 'Arial', backgroundColor: '#f4f4f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. BARRA SUPERIOR */}
      <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🏗️ PDV Vila Verde</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
             <div>
               <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>VENDAS HOJE</div>
               <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>R$ {totalHoje.toFixed(2)}</div>
             </div>
             <div>
               <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>CLIENTES</div>
               <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{clientes.length}</div>
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
        <button onClick={() => setAba('historico')} style={{ padding: '15px', background: 'none', border: 'none', borderBottom: aba === 'historico' ? '3px solid #007bff' : 'none', fontWeight: 'bold', cursor: 'pointer', color: aba === 'historico' ? '#007bff' : '#666' }}>📜 VENDAS</button>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
        
        {/* === TELA DO CAIXA === */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
            {/* Lista de Produtos */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input 
                  autoFocus
                  placeholder="🔍 Buscar produto..." 
                  value={busca} 
                  onChange={e => setBusca(e.target.value)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                />
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

            {/* Carrinho Lateral */}
            <div style={{ width: '350px', backgroundColor: 'white', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 10px rgba(0,0,0,0.05)' }}>
              <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', margin: '0 0 10px 0' }}>🛒 Carrinho</h2>
              
              {/* --- NOVO SELETOR DE CLIENTE --- */}
              <select 
                value={clienteSelecionado} 
                onChange={e => setClienteSelecionado(e.target.value)}
                style={{ marginBottom: '15px', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', width: '100%' }}
              >
                <option value="">👤 Consumidor Final (Sem cadastro)</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {carrinho.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #f9f9f9', paddingBottom: '5px' }}>
                    <div>
                      <b>{item.produto.nome}</b>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>{item.quantidade}x R$ {Number(item.produto.precoVenda).toFixed(2)}</div>
                    </div>
                    <b>R$ {(item.quantidade * Number(item.produto.precoVenda)).toFixed(2)}</b>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '2px solid #333', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '15px' }}>
                  <span>Total</span>
                  <span>R$ {totalCarrinho.toFixed(2)}</span>
                </div>
                <button onClick={finalizarVenda} disabled={carrinho.length === 0} style={{ width: '100%', padding: '15px', backgroundColor: carrinho.length > 0 ? '#28a745' : '#ccc', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: carrinho.length > 0 ? 'pointer' : 'not-allowed' }}>FINALIZAR (F5)</button>
              </div>
            </div>
          </div>
        )}

        {/* === TELA DE CLIENTES (NOVA!) === */}
        {aba === 'clientes' && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowY: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h2>👥 Cadastro de Clientes</h2>
               <button onClick={abrirModalCliente} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>+ Cadastrar Cliente</button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee', color: '#555' }}>
                  <th style={{ padding: '10px' }}>Nome</th>
                  <th style={{ padding: '10px' }}>CPF / CNPJ</th>
                  <th style={{ padding: '10px' }}>Celular (Zap)</th>
                  <th style={{ padding: '10px' }}>Endereço</th>
                  <th style={{ padding: '10px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(cliente => (
                  <tr key={cliente.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>{cliente.nome}</td>
                    <td style={{ padding: '12px 10px' }}>{cliente.cpfCnpj || '-'}</td>
                    <td style={{ padding: '12px 10px', color: '#007bff' }}>{cliente.celular || '-'}</td>
                    <td style={{ padding: '12px 10px', fontSize: '0.9rem' }}>{cliente.endereco || '-'}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <button onClick={() => excluirCliente(cliente.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Excluir</button>
                    </td>
                  </tr>
                ))}
                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Nenhum cliente cadastrado ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* === TELA DE HISTÓRICO === */}
        {aba === 'historico' && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflowY: 'auto', height: '100%' }}>
            <h2>📜 Últimas Vendas</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '10px' }}>#ID</th>
                  <th style={{ padding: '10px' }}>Data/Hora</th>
                  <th style={{ padding: '10px' }}>Itens</th>
                  <th style={{ padding: '10px' }}>Total</th>
                  <th style={{ padding: '10px' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {vendasRealizadas.map(venda => (
                  <tr key={venda.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>#{venda.id}</td>
                    <td style={{ padding: '10px' }}>{new Date(venda.data).toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{venda.itens.map(i => `${i.quantidade}x ${i.produto.nome}`).join(', ')}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#28a745' }}>R$ {Number(venda.total).toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => alert("Reimpressão em breve!")} style={{ padding: '5px 10px', cursor: 'pointer', border: 'none', background: 'transparent' }}>🖨️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === MODAL DE CADASTRO PRODUTO === */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>{produtoEmEdicao ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={salvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <input placeholder="Nome do Produto" value={formProduto.nome || ''} onChange={e => setFormProduto({ ...formProduto, nome: e.target.value })} style={estiloInput} required />
              <input placeholder="Código de Barras" value={formProduto.codigoBarra || ''} onChange={e => setFormProduto({ ...formProduto, codigoBarra: e.target.value })} style={estiloInput} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder="Custo (R$)" type="number" step="0.01" value={formProduto.precoCusto || ''} onChange={e => setFormProduto({ ...formProduto, precoCusto: e.target.value })} style={{ ...estiloInput, flex: 1 }} />
                <input placeholder="Venda (R$)" type="number" step="0.01" value={formProduto.precoVenda || ''} onChange={e => setFormProduto({ ...formProduto, precoVenda: e.target.value })} style={{ ...estiloInput, flex: 1 }} required />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder="Estoque Atual" type="number" value={formProduto.estoque || ''} onChange={e => setFormProduto({ ...formProduto, estoque: e.target.value })} style={{ ...estiloInput, flex: 2 }} required />
                <input placeholder="UN (Ex: CX)" value={formProduto.unidade || ''} onChange={e => setFormProduto({ ...formProduto, unidade: e.target.value })} style={{ ...estiloInput, flex: 1 }} />
              </div>

              <hr style={{ margin: '15px 0', border: '0', borderTop: '1px solid #eee' }} />
              <strong style={{ fontSize: '14px', color: '#666' }}>Dados Fiscais & Fornecedor</strong>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder="Fornecedor" value={formProduto.fornecedor || ''} onChange={e => setFormProduto({ ...formProduto, fornecedor: e.target.value })} style={{ ...estiloInput, flex: 2 }} />
                <input placeholder="Local (Ex: Corredor B)" value={formProduto.localizacao || ''} onChange={e => setFormProduto({ ...formProduto, localizacao: e.target.value })} style={{ ...estiloInput, flex: 1 }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder="% IPI" type="number" value={formProduto.ipi || ''} onChange={e => setFormProduto({ ...formProduto, ipi: e.target.value })} style={{ ...estiloInput, flex: 1 }} />
                <input placeholder="% ICMS" type="number" value={formProduto.icms || ''} onChange={e => setFormProduto({ ...formProduto, icms: e.target.value })} style={{ ...estiloInput, flex: 1 }} />
                <input placeholder="R$ Frete" type="number" value={formProduto.frete || ''} onChange={e => setFormProduto({ ...formProduto, frete: e.target.value })} style={{ ...estiloInput, flex: 1 }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                 <input placeholder="NCM" value={formProduto.ncm || ''} onChange={e => setFormProduto({...formProduto, ncm: e.target.value})} style={{ ...estiloInput, flex: 1 }} />
                 <input placeholder="CEST" value={formProduto.cest || ''} onChange={e => setFormProduto({...formProduto, cest: e.target.value})} style={{ ...estiloInput, flex: 1 }} />
                 <input placeholder="CFOP" value={formProduto.cfop || ''} onChange={e => setFormProduto({...formProduto, cfop: e.target.value})} style={{ ...estiloInput, flex: 1 }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ padding: '10px 20px', border: 'none', background: '#ccc', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', background: '#007bff', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Salvar</button>
              </div>
            </form> 
          </div> 
        </div>   
      )} 

      {/* === NOVO MODAL: CADASTRO DE CLIENTE === */}
      {modalClienteAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '400px' }}>
            <h2 style={{ marginTop: 0 }}>Novo Cliente</h2>
            <form onSubmit={salvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <input placeholder="Nome Completo" value={formCliente.nome} onChange={e => setFormCliente({ ...formCliente, nome: e.target.value })} style={estiloInput} required />
              <input placeholder="CPF ou CNPJ" value={formCliente.cpfCnpj} onChange={e => setFormCliente({ ...formCliente, cpfCnpj: e.target.value })} style={estiloInput} />
              <input placeholder="Celular / WhatsApp" value={formCliente.celular} onChange={e => setFormCliente({ ...formCliente, celular: e.target.value })} style={estiloInput} />
              
              <textarea 
                placeholder="Endereço Completo (Rua, Número, Bairro)" 
                value={formCliente.endereco} 
                onChange={e => setFormCliente({ ...formCliente, endereco: e.target.value })} 
                style={{ ...estiloInput, height: '80px', resize: 'none' }} 
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalClienteAberto(false)} style={{ padding: '10px 20px', border: 'none', background: '#ccc', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', border: 'none', background: '#28a745', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>Cadastrar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>     
  )
}

export default App