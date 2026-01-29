import { useEffect, useState } from 'react'
// ... imports ...
import { Login } from './TelaLogin' // <--- IMPORT NOVO

 
export function App() {
   // Tenta recuperar o usuário salvo na memória do navegador
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('usuario_vila_verde')
    return salvo ? JSON.parse(salvo) : null
  })

  // Função que salva o login
  function fazerLogin(dadosUsuario: any) {
    setUsuario(dadosUsuario)
    localStorage.setItem('usuario_vila_verde', JSON.stringify(dadosUsuario))
  }

  // Função de Logout (Sair)
  function sair() {
    setUsuario(null)
    localStorage.removeItem('usuario_vila_verde')
  }

  // SE NÃO TIVER USUÁRIO, MOSTRA TELA DE LOGIN
  if (!usuario) {
    return <Login onLogin={fazerLogin} />
  }

  // SE TIVER, SEGUE O BAILE (MOSTRA O PDV)
  // ... resto do seu código antigo (produtos, carrinho, etc)...

// --- TIPOS ---
interface Produto {
  id: number
  nome: string
  codigoBarra: string
  precoCusto: string // Importante para o cadastro
  precoVenda: string
  estoque: string
  unidade: string
  categoria: string
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

  // --- ESTADOS ---
  const [aba, setAba] = useState<'caixa' | 'historico'>('caixa')
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([])
  
  // Caixa
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')

  // Cadastro / Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null) // Se tiver algo aqui, é Edição. Se null, é Cadastro.
  const [formProduto, setFormProduto] = useState({
    nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral'
  })

  // --- CARREGAMENTO DE DADOS ---
  async function carregarDados() {
    try {
      const resProdutos = await fetch('https://api-vila-verde.onrender.com/produtos')
      setProdutos(await resProdutos.json())

      const resVendas = await fetch('https://api-vila-verde.onrender.com/vendas')
      setVendasRealizadas(await resVendas.json())
    } catch (erro) {
      console.error("Erro ao carregar dados", erro)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

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
      const res = await fetch('https://api-vila-verde.onrender.com/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: carrinho.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade })) })
      })
      if (res.ok) {
        const venda = await res.json()
        imprimirCupom(carrinho, total, venda.id)
        setCarrinho([])
        alert("Venda Sucesso!")
        carregarDados() // Atualiza estoque e histórico
      } else {
        alert("Erro ao vender")
      }
    } catch (e) { alert("Erro de conexão") }
  }

  function imprimirCupom(itens: ItemCarrinho[], total: number, id: number) {
    // (Mesma função de impressão de antes, resumida aqui para caber)
    const html = `<html><body><h3>VILA VERDE #${id}</h3><hr/>${itens.map(i => `<div>${i.produto.nome}<br/>${i.quantidade}x R$${Number(i.produto.precoVenda).toFixed(2)}</div>`).join('')}<hr/><b>TOTAL: R$ ${total.toFixed(2)}</b><script>window.print()</script></body></html>`
    const win = window.open('', '', 'width=300,height=500'); win?.document.write(html);
  }

  // --- FUNÇÕES DE PRODUTO (CRIAR, EDITAR, DELETAR) ---
  
  function abrirModalCadastro() {
    setProdutoEmEdicao(null) // Modo Criação
    setFormProduto({ nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral' })
    setModalAberto(true)
  }

  function abrirModalEdicao(produto: Produto) {
    setProdutoEmEdicao(produto) // Modo Edição
    setFormProduto({
      nome: produto.nome,
      codigoBarra: produto.codigoBarra,
      precoCusto: produto.precoCusto,
      precoVenda: produto.precoVenda,
      estoque: produto.estoque,
      unidade: produto.unidade,
      categoria: produto.categoria || 'Geral'
    })
    setModalAberto(true)
  }

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...formProduto,
      precoCusto: Number(formProduto.precoCusto),
      precoVenda: Number(formProduto.precoVenda),
      estoque: Number(formProduto.estoque)
    }

    const url = produtoEmEdicao 
      ? `https://api-vila-verde.onrender.com/produtos/${produtoEmEdicao.id}` // URL de Editar
      : 'https://api-vila-verde.onrender.com/produtos' // URL de Criar
    
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
      const res = await fetch(`https://api-vila-verde.onrender.com/produtos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        alert("Produto excluído.")
        carregarDados()
      } else {
        const erro = await res.json()
        alert(`Erro do Servidor: ${erro.erro}`)
      }
    } catch (e: any) { 
      // AQUI MUDOU: Agora ele mostra o erro técnico
      alert(`Erro de Conexão: ${e.message}`) 
    }
  }

  // --- CÁLCULOS DO DASHBOARD (FINANCEIRO) ---
  const vendasHoje = vendasRealizadas.filter(v => {
    const dataVenda = new Date(v.data).toLocaleDateString()
    const hoje = new Date().toLocaleDateString()
    return dataVenda === hoje
  })
  const totalHoje = vendasHoje.reduce((acc, v) => acc + Number(v.total), 0)

  // Filtro de busca
  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigoBarra.includes(busca))
  const totalCarrinho = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)

  return (
    <div style={{ fontFamily: 'Arial', backgroundColor: '#f4f4f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. BARRA SUPERIOR (DASHBOARD) */}
      {/* 1. BARRA SUPERIOR COMPLETA (Título + Stats + Usuário) */}
      <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* ESQUERDA: Título */}
        <h2 style={{ margin: 0 }}>🏗️ PDV Vila Verde</h2>

        {/* DIREITA: Tudo agrupado (Stats + User) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          
          {/* Seus Contadores Originais */}
          <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
             <div>
               <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>VENDAS HOJE</div>
               <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>R$ {totalHoje.toFixed(2)}</div>
             </div>
             <div>
               <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>PRODUTOS</div>
               <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{produtos.length}</div>
             </div>
          </div>

          {/* Risquinho separador */}
          <div style={{ height: '30px', borderLeft: '1px solid rgba(255,255,255,0.3)' }}></div>

          {/* Novo: Área do Usuário */}
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: '0.9rem' }}>Olá, <strong>{usuario?.nome || 'Usuário'}</strong></div>
             <button 
               onClick={sair}
               style={{ 
                 marginTop: '4px',
                 backgroundColor: '#e74c3c', // Vermelho
                 border: 'none',
                 color: 'white',
                 padding: '4px 10px',
                 borderRadius: '4px',
                 cursor: 'pointer',
                 fontSize: '0.8rem',
                 fontWeight: 'bold'
               }}
             >
               SAIR 🚪
             </button>
          </div>

        </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO */}
      <div style={{ display: 'flex', backgroundColor: 'white', padding: '0 20px', borderBottom: '1px solid #ddd' }}>
        <button onClick={() => setAba('caixa')} style={{ padding: '15px', background: 'none', border: 'none', borderBottom: aba === 'caixa' ? '3px solid #007bff' : 'none', fontWeight: 'bold', cursor: 'pointer', color: aba === 'caixa' ? '#007bff' : '#666' }}>🛒 CAIXA (Venda)</button>
        <button onClick={() => setAba('historico')} style={{ padding: '15px', background: 'none', border: 'none', borderBottom: aba === 'historico' ? '3px solid #007bff' : 'none', fontWeight: 'bold', cursor: 'pointer', color: aba === 'historico' ? '#007bff' : '#666' }}>📜 HISTÓRICO DE VENDAS</button>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
        
        {/* TELA DO CAIXA */}
        {aba === 'caixa' && (
          <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
            {/* Esquerda: Lista de Produtos */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input 
                  autoFocus
                  placeholder="🔍 Buscar produto (Nome ou Código)..." 
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
                        {/* Botões de Editar/Excluir */}
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => abrirModalEdicao(prod)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.2rem' }} title="Editar">✏️</button>
                          <button onClick={() => excluirProduto(prod.id)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.2rem' }} title="Excluir">🗑️</button>
                        </div>
                      </div>
                      <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>Estoque: {prod.estoque} {prod.unidade}</p>
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '1.2rem' }}>R$ {Number(prod.precoVenda).toFixed(2)}</span>
                      <button onClick={() => adicionarAoCarrinho(prod)} style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>+ Add</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direita: Carrinho */}
            <div style={{ width: '350px', backgroundColor: 'white', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 10px rgba(0,0,0,0.05)' }}>
              <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', margin: '0 0 10px 0' }}>🛒 Carrinho</h2>
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

        {/* TELA DE HISTÓRICO */}
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
                      <button onClick={() => alert("Reimpressão ainda não implementada, mas fácil de adicionar!")} style={{ padding: '5px 10px', cursor: 'pointer' }}>🖨️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {modalAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '400px' }}>
            <h2 style={{ marginTop: 0 }}>{produtoEmEdicao ? 'Editar Produto' : 'Novo Produto'}</h2>
            <form onSubmit={salvarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input required placeholder="Nome" value={formProduto.nome} onChange={e => setFormProduto({...formProduto, nome: e.target.value})} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
              <input required placeholder="Cód. Barras" value={formProduto.codigoBarra} onChange={e => setFormProduto({...formProduto, codigoBarra: e.target.value})} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input required type="number" step="0.01" placeholder="Custo R$" value={formProduto.precoCusto} onChange={e => setFormProduto({...formProduto, precoCusto: e.target.value})} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                <input required type="number" step="0.01" placeholder="Venda R$" value={formProduto.precoVenda} onChange={e => setFormProduto({...formProduto, precoVenda: e.target.value})} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input required type="number" placeholder="Estoque" value={formProduto.estoque} onChange={e => setFormProduto({...formProduto, estoque: e.target.value})} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
                <input placeholder="UN" value={formProduto.unidade} onChange={e => setFormProduto({...formProduto, unidade: e.target.value})} style={{ width: '60px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalAberto(false)} style={{ flex: 1, padding: '10px', background: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App