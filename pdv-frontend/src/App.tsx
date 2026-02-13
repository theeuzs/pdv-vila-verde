import { useState, useEffect } from 'react'
import { TelaLogin } from './TelaLogin';
import { TelaEquipe } from './TelaEquipe';

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

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const API_URL = 'https://api-vila-verde.onrender.com'

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function App() {
  
  // ESTADOS DE AUTENTICAÇÃO
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  
  // ESTADOS DE NAVEGAÇÃO
  const [aba, setAba] = useState<string>('caixa');
  
  // ESTADOS DE DADOS
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [contasReceber, setContasReceber] = useState<any[]>([])
  const [entregas, setEntregas] = useState<Venda[]>([])
  
  // ESTADOS DO CAIXA
  const [caixaAberto, setCaixaAberto] = useState<any>(null)
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [valorAbertura, setValorAbertura] = useState('')
  
  // ESTADOS DO CARRINHO
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('')
  const [entrega, setEntrega] = useState(false)
  const [endereco, setEndereco] = useState('')
  
  // ESTADOS DO DASHBOARD
  const [dashboard, setDashboard] = useState<any>(null)
  
  // ESTADOS DE PAGINAÇÃO
  const [produtosVisiveis, setProdutosVisiveis] = useState(30)
  
  // MODAIS
  const [modalPagamento, setModalPagamento] = useState(false)
  const [modalProduto, setModalProduto] = useState(false)
  const [modalCliente, setModalCliente] = useState(false)
  const [modalOrcamento, setModalOrcamento] = useState(false)
  
  // FORMULÁRIOS
  const [formProduto, setFormProduto] = useState<any>({})
  const [formCliente, setFormCliente] = useState<any>({})
  const [listaPagamentos, setListaPagamentos] = useState<any[]>([])
  const [valorPagamento, setValorPagamento] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Dinheiro')

  // ============================================================================
  // EFEITOS
  // ============================================================================

  useEffect(() => {
    if (usuarioLogado) {
      carregarDados()
    }
  }, [usuarioLogado])

  useEffect(() => {
    carregarDashboard()
  }, [vendas])

  // Reset paginação ao trocar de aba
  useEffect(() => {
    setProdutosVisiveis(30)
  }, [aba])

  // ============================================================================
  // FUNÇÕES DE CARREGAMENTO
  // ============================================================================

  async function carregarDados() {
    try {
      const [resProdutos, resClientes, resVendas, resOrcamentos, resCaixa, resContas, resEntregas] = await Promise.all([
        fetch(`${API_URL}/produtos`),
        fetch(`${API_URL}/clientes`),
        fetch(`${API_URL}/vendas`),
        fetch(`${API_URL}/orcamentos`),
        fetch(`${API_URL}/caixa/aberto`),
        fetch(`${API_URL}/contas-receber`),
        fetch(`${API_URL}/entregas`)
      ])

      if (resProdutos.ok) setProdutos(await resProdutos.json())
      if (resClientes.ok) setClientes(await resClientes.json())
      if (resVendas.ok) setVendas(await resVendas.json())
      if (resOrcamentos.ok) setOrcamentos(await resOrcamentos.json())
      if (resCaixa.ok) setCaixaAberto(await resCaixa.json())
      if (resContas.ok) setContasReceber(await resContas.json())
      if (resEntregas.ok) setEntregas(await resEntregas.json())
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
          observacoes: `Abertura por ${usuarioLogado.nome}`
        })
      })
      
      if (res.ok) {
        const caixa = await res.json()
        setCaixaAberto(caixa)
        setModalAbrirCaixa(false)
        setValorAbertura('')
        alert('✅ Caixa aberto com sucesso!')
      } else {
        const erro = await res.json()
        alert('❌ Erro: ' + (erro.erro || 'Não foi possível abrir o caixa'))
      }
    } catch (e) {
      console.error(e)
      alert('❌ Erro ao abrir caixa')
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
  }

  const totalCarrinho = carrinho.reduce((acc, item) => 
    acc + (item.produto.precoVenda * item.quantidade), 0
  )

  const totalPago = listaPagamentos.reduce((acc, p) => acc + p.valor, 0)
  const faltaPagar = totalCarrinho - totalPago
  const troco = totalPago > totalCarrinho ? totalPago - totalCarrinho : 0

  // ============================================================================
  // FUNÇÕES DE VENDA
  // ============================================================================

  function adicionarPagamento() {
    const valor = Number(valorPagamento)
    if (!valor || valor <= 0) return
    
    setListaPagamentos([...listaPagamentos, { 
      forma: formaPagamento, 
      valor 
    }])
    setValorPagamento('')
  }

  async function finalizarVenda() {
    if (!caixaAberto) {
      alert('⚠️ Caixa fechado! Abra o caixa para continuar.')
      return
    }

    if (carrinho.length === 0) {
      alert('⚠️ Carrinho vazio!')
      return
    }

    if (faltaPagar > 0.01) {
      alert('⚠️ Falta pagar R$ ' + faltaPagar.toFixed(2))
      return
    }

    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total: totalCarrinho,
          clienteId: clienteSelecionado || null,
          caixaId: caixaAberto.id,
          entrega,
          enderecoEntrega: endereco,
          itens: carrinho.map(i => ({
            produtoId: i.produto.id,
            quantidade: i.quantidade,
            precoUnit: i.produto.precoVenda
          })),
          pagamentos: listaPagamentos
        })
      })

      if (res.ok) {
        alert('✅ Venda finalizada com sucesso!')
        limparCarrinho()
        setModalPagamento(false)
        carregarDados()
      }
    } catch (e) {
      alert('Erro ao finalizar venda')
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
  // FUNÇÕES DE PRODUTOS
  // ============================================================================

  async function salvarProduto() {
    try {
      const metodo = formProduto.id ? 'PUT' : 'POST'
      const url = formProduto.id 
        ? `${API_URL}/produtos/${formProduto.id}`
        : `${API_URL}/produtos`

      const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formProduto)
      })

      if (res.ok) {
        alert('✅ Produto salvo com sucesso!')
        setModalProduto(false)
        setFormProduto({})
        carregarDados()
      }
    } catch (e) {
      alert('Erro ao salvar produto')
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
  // RENDERIZAÇÃO - LOGIN
  // ============================================================================

  if (!usuarioLogado) {
    return <TelaLogin onLoginSucesso={setUsuarioLogado} />
  }

  // ============================================================================
  // RENDERIZAÇÃO - SISTEMA
  // ============================================================================

  const produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigoBarra?.includes(busca)
  ).slice(0, 30) // Limita a 30 produtos para melhor performance

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* BARRA SUPERIOR */}
      <div style={{ 
        background: 'linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ 
            width: '45px', 
            height: '45px', 
            background: '#4ade80', 
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.3rem',
            color: '#1e3c72'
          }}>VV</div>
          <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
            PDV Vila Verde
          </span>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {caixaAberto ? (
            <>
              <div style={{ 
                background: 'rgba(74, 222, 128, 0.2)',
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid #4ade80',
                color: '#4ade80',
                fontWeight: 'bold'
              }}>
                CAIXA ABERTO - R$ {Number(caixaAberto.saldoAtual).toFixed(2)}
              </div>
              {usuarioLogado.cargo === 'GERENTE' && (
                <button
                  onClick={fecharCaixa}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Fechar Caixa
                </button>
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
        background: 'rgba(255,255,255,0.15)',
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
              background: aba === a.id ? 'white' : 'transparent',
              color: aba === a.id ? '#1e3c72' : 'white',
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
                flex: 1,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '15px',
                alignContent: 'start'
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
                  produtosFiltrados.map(p => (
                    <div
                      key={p.id}
                      onClick={() => adicionarAoCarrinho(p)}
                      style={{
                        background: p.estoque <= 0 
                          ? 'linear-gradient(135deg, #e5e7eb 0%, #9ca3af 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '12px',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s',
                        color: 'white',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        opacity: p.estoque <= 0 ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (p.estoque > 0) e.currentTarget.style.transform = 'translateY(-5px)'
                      }}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.95rem' }}>
                        {p.nome}
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '5px' }}>
                        R$ {p.precoVenda.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                        {p.estoque <= 0 ? 'SEM ESTOQUE' : `Estoque: ${p.estoque} ${p.unidade || 'UN'}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                          R$ {item.produto.precoVenda.toFixed(2)} x {item.quantidade}
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
                          R$ {(item.produto.precoVenda * item.quantidade).toFixed(2)}
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
                  <span>R$ {totalCarrinho.toFixed(2)}</span>
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
                  <span>R$ {totalCarrinho.toFixed(2)}</span>
                </div>
              </div>

              {/* BOTÕES */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button
                  onClick={() => setModalOrcamento(true)}
                  disabled={carrinho.length === 0}
                  style={{
                    flex: 1,
                    padding: '15px',
                    borderRadius: '10px',
                    border: '2px solid #3b82f6',
                    background: 'white',
                    color: '#3b82f6',
                    fontWeight: 'bold',
                    cursor: carrinho.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: carrinho.length === 0 ? 0.5 : 1
                  }}
                >
                  📋 ORÇAMENTO
                </button>

                <button
                  onClick={() => setModalPagamento(true)}
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  R$ {dashboard.totalHoje.toFixed(2)}
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
                  R$ {dashboard.totalMes.toFixed(2)}
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
                  R$ {dashboard.ticketMedio.toFixed(2)}
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
                  setFormProduto({})
                  setModalProduto(true)
                }}
                style={{
                  padding: '12px 25px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                        R$ {p.precoVenda.toFixed(2)}
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
                          onClick={() => {
                            setFormProduto(p)
                            setModalProduto(true)
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
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          <div style={{ background: 'white', borderRadius: '15px', padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72', marginBottom: '25px' }}>
              💰 Histórico de Vendas
            </h2>

            {vendas.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>💰</div>
                <div style={{ fontSize: '1.2rem' }}>Nenhuma venda registrada</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>ID</th>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Data</th>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Cliente</th>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Total</th>
                      <th style={{ padding: '15px', textAlign: 'left', color: '#64748b' }}>Status</th>
                      <th style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.slice().reverse().map(v => (
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
                          ) : v.nota_emitida ? (
                            <span style={{ 
                              background: '#dcfce7', 
                              color: '#059669',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold'
                            }}>
                              NOTA EMITIDA
                            </span>
                          ) : (
                            <span style={{ 
                              background: '#fef3c7', 
                              color: '#d97706',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold'
                            }}>
                              SEM NOTA
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          {!v.nota_emitida && !v.nota_cancelada && (
                            <button
                              onClick={() => emitirNota(v.id)}
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
                              📄 Emitir NFC-e
                            </button>
                          )}
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
                              📄 Ver Nota
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
            width: '800px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Cabeçalho */}
            <div style={{
              padding: '20px 30px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h2 style={{ margin: 0, color: '#1e3c72' }}>💸 Finalizar Venda</h2>
              <button
                onClick={() => setModalPagamento(false)}
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

            {/* Conteúdo */}
            <div style={{ display: 'flex', height: '500px' }}>
              
              {/* Resumo */}
              <div style={{
                width: '40%',
                padding: '20px',
                background: '#f8fafc',
                borderRight: '1px solid #e2e8f0',
                overflowY: 'auto'
              }}>
                <h3 style={{ marginTop: 0, color: '#64748b', fontSize: '1rem' }}>
                  Resumo do Pedido
                </h3>
                
                {carrinho.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.9rem',
                    marginBottom: '10px',
                    color: '#1e3c72'
                  }}>
                    <span>{item.quantidade}x {item.produto.nome}</span>
                    <span style={{ fontWeight: 'bold' }}>
                      R$ {(item.quantidade * item.produto.precoVenda).toFixed(2)}
                    </span>
                  </div>
                ))}

                <div style={{
                  marginTop: '20px',
                  paddingTop: '15px',
                  borderTop: '2px solid #cbd5e1',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#1e3c72',
                  textAlign: 'right'
                }}>
                  Total: R$ {totalCarrinho.toFixed(2)}
                </div>
              </div>

              {/* Pagamento */}
              <div style={{
                flex: 1,
                padding: '30px',
                overflowY: 'auto'
              }}>
                
                {/* Cliente */}
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    color: '#1e3c72'
                  }}>
                    👤 Cliente (Opcional)
                  </label>
                  <select
                    value={clienteSelecionado}
                    onChange={e => setClienteSelecionado(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Sem cliente</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Forma de Pagamento */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 'bold', 
                    marginBottom: '10px',
                    color: '#1e3c72'
                  }}>
                    💳 Forma de Pagamento
                  </label>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input
                      type="number"
                      value={valorPagamento}
                      onChange={e => setValorPagamento(e.target.value)}
                      placeholder="Valor"
                      style={{
                        width: '120px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    />
                    <select
                      value={formaPagamento}
                      onChange={e => setFormaPagamento(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <option value="Dinheiro">💵 Dinheiro</option>
                      <option value="Pix">💠 Pix</option>
                      <option value="Cartão Crédito">💳 Crédito</option>
                      <option value="Cartão Débito">💳 Débito</option>
                      <option value="A Prazo">📅 A Prazo</option>
                      <option value="Haver">🤝 Haver</option>
                    </select>
                    <button
                      onClick={adicionarPagamento}
                      disabled={faltaPagar <= 0.01}
                      style={{
                        padding: '0 20px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: faltaPagar <= 0.01 ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        opacity: faltaPagar <= 0.01 ? 0.5 : 1
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Lista de Pagamentos */}
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '15px', 
                    borderRadius: '8px',
                    marginBottom: '15px'
                  }}>
                    {listaPagamentos.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '10px' }}>
                        Nenhum pagamento adicionado
                      </div>
                    ) : (
                      listaPagamentos.map((p, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: i < listaPagamentos.length - 1 ? '1px dashed #e2e8f0' : 'none'
                        }}>
                          <span>{p.forma}: R$ {p.valor.toFixed(2)}</span>
                          <button
                            onClick={() => setListaPagamentos(listaPagamentos.filter((_, idx) => idx !== i))}
                            style={{
                              color: '#dc2626',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            ✖
                          </button>
                        </div>
                      ))
                    )}
                    
                    <div style={{
                      marginTop: '15px',
                      paddingTop: '15px',
                      borderTop: '2px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 'bold'
                    }}>
                      <span style={{ color: faltaPagar > 0 ? '#dc2626' : '#059669' }}>
                        Falta: R$ {Math.max(0, faltaPagar).toFixed(2)}
                      </span>
                      {troco > 0 && (
                        <span style={{ color: '#059669' }}>
                          Troco: R$ {troco.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Entrega */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '15px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={entrega}
                    onChange={e => setEntrega(e.target.checked)}
                  />
                  🚛 É para entregar?
                </label>

                {entrega && (
                  <input
                    type="text"
                    placeholder="Endereço de entrega..."
                    value={endereco}
                    onChange={e => setEndereco(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: '20px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                )}

                {/* Checkbox Emitir NFC-e */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                  cursor: 'pointer',
                  padding: '12px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #86efac'
                }}>
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                  />
                  <span style={{ fontWeight: 'bold', color: '#059669' }}>
                    📄 Emitir NFC-e (Nota Fiscal)
                  </span>
                </label>

                {/* Botão Finalizar */}
                <button
                  onClick={finalizarVenda}
                  disabled={faltaPagar > 0.01}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: faltaPagar > 0.01 
                      ? '#e2e8f0' 
                      : 'linear-gradient(135deg, #4ade80, #22c55e)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    cursor: faltaPagar > 0.01 ? 'not-allowed' : 'pointer',
                    boxShadow: faltaPagar <= 0.01 ? '0 4px 15px rgba(34, 197, 94, 0.3)' : 'none'
                  }}
                >
                  ✅ CONCLUIR VENDA COM NFC-e
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRODUTO */}
      {modalProduto && (
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
          zIndex: 9999,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '15px',
            padding: '30px',
            width: '600px',
            maxWidth: '100%'
          }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72' }}>
              {formProduto.id ? '✏️ Editar Produto' : '+ Novo Produto'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={formProduto.nome || ''}
                  onChange={e => setFormProduto({...formProduto, nome: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Código de Barras
                </label>
                <input
                  type="text"
                  value={formProduto.codigoBarra || ''}
                  onChange={e => setFormProduto({...formProduto, codigoBarra: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Categoria
                </label>
                <input
                  type="text"
                  value={formProduto.categoria || ''}
                  onChange={e => setFormProduto({...formProduto, categoria: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Preço de Custo *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formProduto.precoCusto || ''}
                  onChange={e => setFormProduto({...formProduto, precoCusto: Number(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Preço de Venda *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formProduto.precoVenda || ''}
                  onChange={e => setFormProduto({...formProduto, precoVenda: Number(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Estoque *
                </label>
                <input
                  type="number"
                  value={formProduto.estoque || ''}
                  onChange={e => setFormProduto({...formProduto, estoque: Number(e.target.value)})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Unidade
                </label>
                <select
                  value={formProduto.unidade || 'UN'}
                  onChange={e => setFormProduto({...formProduto, unidade: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <option value="UN">Unidade</option>
                  <option value="KG">Quilograma</option>
                  <option value="L">Litro</option>
                  <option value="CX">Caixa</option>
                  <option value="PCT">Pacote</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button
                onClick={salvarProduto}
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
                ✓ Salvar Produto
              </button>
              <button
                onClick={() => {
                  setModalProduto(false)
                  setFormProduto({})
                }}
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

      {/* MODAL: CLIENTE */}
      {modalCliente && (
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
            width: '500px'
          }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72' }}>
              {formCliente.id ? '✏️ Editar Cliente' : '+ Novo Cliente'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formCliente.nome || ''}
                  onChange={e => setFormCliente({...formCliente, nome: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  CPF/CNPJ
                </label>
                <input
                  type="text"
                  value={formCliente.cpfCnpj || ''}
                  onChange={e => setFormCliente({...formCliente, cpfCnpj: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Celular
                </label>
                <input
                  type="tel"
                  value={formCliente.celular || ''}
                  onChange={e => setFormCliente({...formCliente, celular: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Endereço
                </label>
                <input
                  type="text"
                  value={formCliente.endereco || ''}
                  onChange={e => setFormCliente({...formCliente, endereco: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
              <button
                onClick={salvarCliente}
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
                ✓ Salvar Cliente
              </button>
              <button
                onClick={() => {
                  setModalCliente(false)
                  setFormCliente({})
                }}
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

      {/* MODAL: ORÇAMENTO */}
      {modalOrcamento && (
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
            width: '400px',
            textAlign: 'center'
          }}>
            <h2 style={{ marginTop: 0, color: '#1e3c72' }}>📋 Salvar Orçamento</h2>
            
            <p style={{ color: '#64748b', marginBottom: '25px' }}>
              Deseja salvar este carrinho como orçamento?
              <br />
              <strong>O estoque NÃO será baixado.</strong>
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={salvarOrcamento}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✓ Sim, Salvar
              </button>
              <button
                onClick={() => setModalOrcamento(false)}
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

    </div>
  )
}

export default App
