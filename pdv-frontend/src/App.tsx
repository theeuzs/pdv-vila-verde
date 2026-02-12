import { useState, useEffect, useMemo } from 'react'
import { TelaLogin } from './TelaLogin';
import { TelaEquipe } from './TelaEquipe';

// ============================================================================
// INTERFACES
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
  total: number
  cliente?: { nome: string }
  itens: any[]
  pagamentos: any[]
  nota_emitida: boolean
  nota_cancelada: boolean
  nota_url_pdf?: string
  entrega: boolean
  enderecoEntrega?: string
  statusEntrega?: string
}

const API_URL = 'https://api-vila-verde.onrender.com'

// Helper para ícones
const getCategoryIcon = (categoria?: string) => {
  const icons: any = {
    'bebidas': '🥤', 'padaria': '🍞', 'laticínios': '🥛', 'grãos': '🌾',
    'mercearia': '🛒', 'limpeza': '🧹', 'higiene': '🧼', 'hortifruti': '🥬',
    'carnes': '🥩', 'frios': '🧀'
  };
  const cat = categoria?.toLowerCase() || '';
  for (const key in icons) {
    if (cat.includes(key)) return icons[key];
  }
  return '📦';
};

export function App() {
  
  // ============================================================================
  // ESTADOS
  // ============================================================================
  const [usuarioLogado, setUsuarioLogado] = useState<any>(null);
  const [aba, setAba] = useState<string>('caixa');
  
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([]) // Recuperei isso!
  const [caixaAberto, setCaixaAberto] = useState<any>(null);
  const [caixa, setCaixa] = useState<any>(null);
  const [modalCaixaVisivel, setModalCaixaVisivel] = useState(false);
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [valorAbertura, setValorAbertura] = useState("");

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState('') 
  const [clienteSelecionado, setClienteSelecionado] = useState('') 
  const [listaPagamentos, setListaPagamentos] = useState<PagamentoVenda[]>([])
  const [valorPagamentoInput, setValorPagamentoInput] = useState('')
  const [formaPagamento, setFormaPagamento] = useState("Dinheiro");
  const [entrega, setEntrega] = useState(false);
  const [endereco, setEndereco] = useState('');
  const [contasReceber, setContasReceber] = useState<any[]>([])

  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  const [modalClienteAberto, setModalClienteAberto] = useState(false)

  const [formProduto, setFormProduto] = useState<Partial<Produto>>({
    nome: '', codigoBarra: '', precoCusto: 0, precoVenda: 0, estoque: 0,
    unidade: 'UN', categoria: ''
  });

  const [formCliente, setFormCliente] = useState<Partial<Cliente>>({
    nome: '', cpfCnpj: '', celular: '', endereco: ''
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    if (usuarioLogado) {
      if (usuarioLogado.cargo === 'MOTORISTA') {
          setAba('entregas');
      }
      carregarProdutos();
      carregarClientes();
      carregarVendas(); // Importante
      carregarContasReceber();
      verificarCaixaAberto();
    }
  }, [usuarioLogado]);

  // ============================================================================
  // FUNÇÕES DE CARREGAMENTO
  // ============================================================================
  async function carregarProdutos() {
    try {
      const res = await fetch(`${API_URL}/produtos`);
      if (res.ok) setProdutos(await res.json());
    } catch (err) { console.error(err); }
  }

  async function carregarClientes() {
    try {
      const res = await fetch(`${API_URL}/clientes`);
      if (res.ok) setClientes(await res.json());
    } catch (err) { console.error(err); }
  }

  async function carregarVendas() {
    try {
      const res = await fetch(`${API_URL}/vendas`);
      if (res.ok) setVendasRealizadas(await res.json());
    } catch (err) { console.error(err); }
  }

  async function carregarContasReceber() {
    try {
      const res = await fetch(`${API_URL}/contas-receber`);
      if (res.ok) setContasReceber(await res.json());
    } catch (err) { console.error(err); }
  }

  async function verificarCaixaAberto() {
    try {
      const res = await fetch(`${API_URL}/caixa/aberto`);
      if (res.ok) {
        const data = await res.json();
        setCaixaAberto(data.aberto ? data.caixa : null);
      }
    } catch (err) { console.error(err); }
  }

  // ============================================================================
  // FUNÇÕES DE CAIXA
  // ============================================================================
  async function abrirCaixa() {
    if (!valorAbertura || Number(valorAbertura) <= 0) {
      alert('Informe um valor válido!');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/caixa/abrir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          valorAbertura: Number(valorAbertura),
          usuarioId: usuarioLogado?.id 
        })
      });
      if (res.ok) {
        alert('✅ Caixa aberto!');
        verificarCaixaAberto();
        setModalAbrirCaixa(false);
        setValorAbertura('');
      }
    } catch (err) { console.error(err); }
  }

  async function fecharCaixa() {
    if (!confirm('Deseja realmente FECHAR o caixa?')) return;
    try {
      const res = await fetch(`${API_URL}/caixa/fechar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caixaId: caixa.id })
      });
      if (res.ok) {
        alert('✅ Caixa fechado!');
        setCaixaAberto(null);
        setModalCaixaVisivel(false);
        verificarCaixaAberto();
      }
    } catch (err) { console.error(err); }
  }

  async function abrirModalGerenciarCaixa() {
    try {
      const res = await fetch(`${API_URL}/caixa/${caixaAberto.id}`);
      if (res.ok) {
        setCaixa(await res.json());
        setModalCaixaVisivel(true);
      }
    } catch (err) { console.error(err); }
  }

  // ============================================================================
  // FUNÇÕES DE PRODUTO
  // ============================================================================
  function abrirModalNovoProduto() {
    setProdutoEmEdicao(null);
    setFormProduto({
      nome: '', codigoBarra: '', precoCusto: 0, precoVenda: 0, estoque: 0,
      unidade: 'UN', categoria: ''
    });
    setModalAberto(true);
  }

  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault();
    const url = produtoEmEdicao 
      ? `${API_URL}/produtos/${produtoEmEdicao.id}`
      : `${API_URL}/produtos`;
    const method = produtoEmEdicao ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formProduto)
      });
      if (res.ok) {
        alert('✅ Produto salvo!');
        carregarProdutos();
        setModalAberto(false);
      }
    } catch (err) { console.error(err); }
  }

  // ============================================================================
  // FUNÇÕES DE CLIENTE
  // ============================================================================
  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCliente)
      });
      if (res.ok) {
        alert('✅ Cliente salvo!');
        carregarClientes();
        setModalClienteAberto(false);
      }
    } catch (err) { console.error(err); }
  }

  // ============================================================================
  // FUNÇÕES DE VENDA (CANCELAMENTO)
  // ============================================================================
  async function cancelarVenda(vendaId: number) {
    const motivo = prompt("Motivo do cancelamento (Min. 15 letras):");
    if (!motivo) return;

    try {
        const res = await fetch(`${API_URL}/cancelar-fiscal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendaId, justificativa: motivo })
        });

        const data = await res.json();
        if (res.ok) {
            alert("✅ " + data.mensagem);
            carregarVendas();
            carregarProdutos(); // Estoque voltou
            verificarCaixaAberto(); // Dinheiro saiu
        } else {
            alert("❌ Erro: " + data.erro);
        }
    } catch (error) {
        alert("Erro de conexão.");
    }
  }

  async function marcarEntregue(vendaId: number) {
     if(!confirm("Marcar como entregue?")) return;
     try {
         await fetch(`${API_URL}/vendas/${vendaId}/entregar`, { method: 'PATCH' });
         carregarVendas();
     } catch (e) { alert("Erro ao atualizar"); }
  }

  // ============================================================================
  // FUNÇÕES DO CARRINHO
  // ============================================================================
  function adicionarAoCarrinho(produto: Produto) {
    const itemExistente = carrinho.find(item => item.produto.id === produto.id);
    if (itemExistente) {
      setCarrinho(carrinho.map(item =>
        item.produto.id === produto.id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setCarrinho([...carrinho, { produto, quantidade: 1 }]);
    }
    setBusca('');
  }

  function removerDoCarrinho(produtoId: number) {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  }

  function limparCarrinho() {
    setCarrinho([]);
    setClienteSelecionado('');
    setListaPagamentos([]);
    setEntrega(false);
    setEndereco('');
  }

  const subtotalCarrinho = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + (item.produto.precoVenda * item.quantidade), 0);
  }, [carrinho]);

  const totalPago = useMemo(() => {
    return listaPagamentos.reduce((acc, pag) => acc + pag.valor, 0);
  }, [listaPagamentos]);

  const faltaPagar = subtotalCarrinho - totalPago;

  function adicionarPagamento() {
    const valor = Number(valorPagamentoInput);
    if (!valor || valor <= 0) {
      alert('Informe um valor válido!');
      return;
    }
    setListaPagamentos([...listaPagamentos, { forma: formaPagamento, valor }]);
    setValorPagamentoInput('');
  }

  async function finalizarVenda() {
    if (!caixaAberto) {
      alert('⚠️ Abra o caixa primeiro!');
      return;
    }
    if (carrinho.length === 0) {
      alert('⚠️ Carrinho vazio!');
      return;
    }
    if (faltaPagar > 0) {
      alert(`⚠️ Falta pagar R$ ${faltaPagar.toFixed(2)}`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caixaId: caixaAberto.id,
          clienteId: clienteSelecionado ? Number(clienteSelecionado) : null,
          total: subtotalCarrinho,
          itens: carrinho.map(item => ({
            produtoId: item.produto.id,
            quantidade: item.quantidade,
            precoUnit: item.produto.precoVenda
          })),
          pagamentos: listaPagamentos,
          entrega,
          endereco: entrega ? endereco : null
        })
      });
      if (res.ok) {
        const troco = totalPago - subtotalCarrinho;
        alert(troco > 0 ? `✅ Venda finalizada!\n\nTroco: R$ ${troco.toFixed(2)}` : '✅ Venda finalizada!');
        limparCarrinho();
        carregarProdutos();
        carregarVendas(); // Atualiza histórico
        verificarCaixaAberto();
      }
    } catch (err) { console.error(err); }
  }

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtos.slice(0, 20);
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigoBarra?.includes(busca)
    );
  }, [produtos, busca]);

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================
  if (!usuarioLogado) {
    return <TelaLogin onLogin={setUsuarioLogado} />;
  }

  // Se for a tela de equipe (separada), ela tem seu próprio layout
  if (aba === 'equipe') {
     return (
        <div style={styles.appContainer}>
            <header style={styles.header}>
                <div style={styles.logoArea}>
                   <div style={styles.logo}>VV</div>
                   <div style={styles.companyInfo}><div style={styles.companyName}>Gestão de Equipe</div></div>
                </div>
                <button style={styles.btnSecondary} onClick={() => setAba('caixa')}>Voltar ao PDV</button>
            </header>
            <main style={styles.mainContent}>
<TelaEquipe usuario={usuarioLogado} onLogout={() => setUsuarioLogado(null)} />            </main>
        </div>
     )
  }

  const isMotorista = usuarioLogado.cargo === 'MOTORISTA';

  return (
    <>
      <div style={styles.appContainer}>
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.logoArea}>
            <div style={styles.logo}>VV</div>
            <div style={styles.companyInfo}>
              <div style={styles.companyName}>PDV Vila Verde</div>
              <div style={styles.modoBadge}>{isMotorista ? 'MODO MOTORISTA' : 'MODO CHEFE'}</div>
            </div>
          </div>
          
          <div style={styles.headerCenter}>
            {!isMotorista && (
                caixaAberto ? (
                <div style={{...styles.cashStatus, ...styles.cashOpen}} onClick={abrirModalGerenciarCaixa}>
                    <div style={{...styles.statusIndicator, ...styles.statusOpen}}></div>
                    <span>CAIXA ABERTO</span>
                </div>
                ) : (
                <div style={{...styles.cashStatus, ...styles.cashClosed}} onClick={() => setModalAbrirCaixa(true)}>
                    <div style={{...styles.statusIndicator, ...styles.statusClosed}}></div>
                    <span>CAIXA FECHADO</span>
                </div>
                )
            )}
          </div>

          <div style={styles.headerRight}>
            <div style={styles.userInfo}>
              <span>👤</span>
              <span>Olá, {usuarioLogado.nome}</span>
            </div>
            <button style={styles.btnLogout} onClick={() => setUsuarioLogado(null)}>
              🚪 Sair
            </button>
          </div>
        </header>

        {/* NAVEGAÇÃO */}
        <nav style={styles.navTabs}>
          {!isMotorista && (
             <>
                <button style={{...styles.navTab, ...(aba === 'caixa' && styles.navTabActive)}} onClick={() => setAba('caixa')}>
                    🛒 CAIXA
                </button>
                <button style={{...styles.navTab, ...(aba === 'vendas' && styles.navTabActive)}} onClick={() => setAba('vendas')}>
                    📊 VENDAS
                </button>
                <button style={{...styles.navTab, ...(aba === 'clientes' && styles.navTabActive)}} onClick={() => setAba('clientes')}>
                    👥 CLIENTES
                </button>
                <button style={{...styles.navTab, ...(aba === 'equipe' && styles.navTabActive)}} onClick={() => setAba('equipe')}>
                    👔 EQUIPE
                </button>
             </>
          )}
          <button style={{...styles.navTab, ...(aba === 'entregas' && styles.navTabActive)}} onClick={() => setAba('entregas')}>
            🚚 ENTREGAS
          </button>
        </nav>

        {/* CONTEÚDO PRINCIPAL */}
        <main style={styles.mainContent}>
          
          {/* ABA CAIXA */}
          {aba === 'caixa' && (
            <div style={styles.caixaContainer}>
              <div style={styles.caixaLeft}>
                {/* Busca */}
                <div style={styles.searchSection}>
                  <div style={styles.searchWrapper}>
                    <input
                      type="text"
                      style={styles.searchInput}
                      placeholder="🔍 Digite o nome ou código do produto..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div style={styles.keyboardHint}>
                    💡 Dica: Clique no cartão do produto para adicionar ao carrinho
                  </div>
                </div>

                {/* Grid de Produtos */}
                <div style={styles.productsGrid}>
                  <div style={styles.gridHeader}>
                    <div style={styles.gridTitle}>
                      📦 {busca ? 'Resultados da Busca' : 'Produtos em Destaque'}
                    </div>
                    <button style={styles.btnAddProduct} onClick={abrirModalNovoProduto}>
                      ➕ Novo Produto
                    </button>
                  </div>

                  <div style={styles.productsDisplay}>
                    {produtosFiltrados.map(produto => (
                      <div
                        key={produto.id}
                        style={styles.productCard}
                        onClick={() => adicionarAoCarrinho(produto)}
                      >
                        <div style={styles.productIcon}>
                          {getCategoryIcon(produto.categoria)}
                        </div>
                        <div style={styles.productName}>{produto.nome}</div>
                        <div style={styles.productPrice}>R$ {produto.precoVenda.toFixed(2)}</div>
                        <div style={styles.productStock}>
                          Estoque: {produto.estoque} {produto.unidade || 'UN'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Carrinho */}
              <div style={styles.caixaRight}>
                <div style={styles.cartHeader}>
                  <span style={styles.cartIcon}>🛒</span>
                  <span style={styles.cartTitle}>Carrinho</span>
                  <button onClick={limparCarrinho} style={{background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'0.8rem', marginLeft:'auto'}}>Limpar</button>
                </div>

                <div style={styles.cartItems}>
                  {carrinho.length === 0 ? (
                    <div style={styles.emptyState}>
                      <div style={styles.emptyIcon}>🛒</div>
                      <p>Carrinho vazio</p>
                      <p style={styles.emptySubtitle}>Adicione produtos para iniciar</p>
                    </div>
                  ) : (
                    carrinho.map((item, index) => (
                      <div key={index} style={styles.cartItem}>
                        <div style={styles.itemInfo}>
                          <div style={styles.itemName}>{item.produto.nome}</div>
                          <div style={styles.itemDetails}>
                            {item.quantidade}x R$ {item.produto.precoVenda.toFixed(2)}
                          </div>
                        </div>
                        <div style={styles.itemPrice}>
                          R$ {(item.produto.precoVenda * item.quantidade).toFixed(2)}
                        </div>
                        <button
                          style={styles.itemRemove}
                          onClick={() => removerDoCarrinho(item.produto.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div style={styles.cartSummary}>
                  <div style={styles.summaryRow}>
                    <span>Subtotal:</span>
                    <span>R$ {subtotalCarrinho.toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Pago:</span>
                    <span>R$ {totalPago.toFixed(2)}</span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Falta:</span>
                    <span>R$ {faltaPagar.toFixed(2)}</span>
                  </div>
                  <div style={{...styles.summaryRow, ...styles.summaryTotal}}>
                    <span>TOTAL:</span>
                    <span>R$ {subtotalCarrinho.toFixed(2)}</span>
                  </div>
                </div>

                <div style={styles.paymentSection}>
                  <label style={styles.paymentLabel}>Cliente (opcional)</label>
                  <select
                    style={styles.paymentInput}
                    value={clienteSelecionado}
                    onChange={(e) => setClienteSelecionado(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>

                  <label style={{...styles.paymentLabel, marginTop: '1rem'}}>Adicionar Pagamento</label>
                  <div style={{display: 'flex', gap: '0.5rem'}}>
                    <select
                      style={{...styles.paymentInput, marginBottom: 0}}
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                    >
                      <option value="Dinheiro">💵 Dinheiro</option>
                      <option value="Débito">💳 Débito</option>
                      <option value="Crédito">💳 Crédito</option>
                      <option value="PIX">📱 PIX</option>
                    </select>
                    <input
                      type="number"
                      style={{...styles.paymentInput, width: '100px', marginBottom: 0}}
                      placeholder="Valor"
                      value={valorPagamentoInput}
                      onChange={(e) => setValorPagamentoInput(e.target.value)}
                    />
                    <button style={styles.btnAddPayment} onClick={adicionarPagamento}>+</button>
                  </div>
                </div>

                <div style={styles.deliveryCheck}>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <input
                            type="checkbox"
                            id="delivery"
                            checked={entrega}
                            onChange={(e) => setEntrega(e.target.checked)}
                        />
                        <label htmlFor="delivery">🚚 É para entregar?</label>
                    </div>
                    {entrega && (
                         <input 
                            type="text" 
                            placeholder="Endereço da entrega..."
                            value={endereco}
                            onChange={e => setEndereco(e.target.value)}
                            style={{...styles.modalInput, marginTop: 10, marginBottom:0}}
                         />
                    )}
                </div>

                <div style={styles.actionButtons}>
                  <button style={styles.btnSell} onClick={finalizarVenda}>
                    ✓ FINALIZAR VENDA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA VENDAS */}
          {aba === 'vendas' && (
            <div style={styles.contentPanel}>
              <h2>📜 Histórico de Vendas</h2>
              <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 20}}>
                <thead>
                    <tr style={{borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left'}}>
                        <th style={{padding: 10}}>ID</th>
                        <th style={{padding: 10}}>Data</th>
                        <th style={{padding: 10}}>Cliente</th>
                        <th style={{padding: 10}}>Total</th>
                        <th style={{padding: 10}}>Status</th>
                        <th style={{padding: 10}}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {vendasRealizadas.map(v => (
                        <tr key={v.id} style={{borderBottom: '1px solid #1e293b', color: '#e2e8f0'}}>
                            <td style={{padding: 10}}>#{v.id}</td>
                            <td style={{padding: 10}}>{new Date(v.data).toLocaleString()}</td>
                            <td style={{padding: 10}}>{v.cliente?.nome || 'Consumidor'}</td>
                            <td style={{padding: 10, color: '#10b981', fontWeight: 'bold'}}>R$ {Number(v.total).toFixed(2)}</td>
                            <td style={{padding: 10}}>
                                {v.nota_cancelada ? <span style={{color:'#ef4444'}}>CANCELADA</span> : <span style={{color:'#10b981'}}>OK</span>}
                            </td>
                            <td style={{padding: 10}}>
                                {!v.nota_cancelada && (
                                    <button onClick={() => cancelarVenda(v.id)} style={{...styles.btnDanger, padding: '5px 10px', fontSize: '0.8rem'}}>
                                        Cancelar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

        {/* ABA CLIENTES */}
        {aba === 'clientes' && (
            <div style={styles.contentPanel}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h2>👥 Meus Clientes</h2>
                    <button style={styles.btnAddProduct} onClick={() => setModalClienteAberto(true)}>+ Novo Cliente</button>
                </div>
                <div style={{marginTop: 20, display:'grid', gap: 10}}>
                    {clientes.map(c => (
                        <div key={c.id} style={{background: '#0f172a', padding: 15, borderRadius: 8, display:'flex', justifyContent:'space-between'}}>
                            <div>
                                <div style={{fontWeight:'bold', color: '#e2e8f0'}}>{c.nome}</div>
                                <div style={{fontSize: '0.85rem', color: '#94a3b8'}}>{c.celular || 'Sem telefone'}</div>
                            </div>
                            <div style={{textAlign:'right'}}>
                                <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>Saldo Haver</div>
                                <div style={{color: '#3b82f6', fontWeight:'bold'}}>R$ {Number(c.saldoHaver || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ABA ENTREGAS */}
        {aba === 'entregas' && (
            <div style={styles.contentPanel}>
                <h2>🚚 Entregas Pendentes</h2>
                <div style={{marginTop: 20, display:'grid', gap: 15}}>
                    {vendasRealizadas
                        .filter(v => v.entrega === true && v.statusEntrega !== 'ENTREGUE' && !v.nota_cancelada)
                        .map(v => (
                        <div key={v.id} style={{background: '#0f172a', padding: 20, borderRadius: 8, borderLeft: '5px solid #f59e0b'}}>
                            <div style={{display:'flex', justifyContent:'space-between', marginBottom: 10}}>
                                <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>Venda #{v.id}</span>
                                <span style={{color:'#f59e0b'}}>PENDENTE</span>
                            </div>
                            <div style={{color:'#e2e8f0', marginBottom: 5}}>📍 {v.enderecoEntrega}</div>
                            <div style={{color:'#94a3b8', fontSize:'0.9rem', marginBottom: 15}}>👤 {v.cliente?.nome || 'Cliente Balcão'}</div>
                            
                            <div style={{display:'flex', gap: 10}}>
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.enderecoEntrega || '')}`} 
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{...styles.btnPrimary, textDecoration:'none', textAlign:'center', flex:1}}
                                >
                                    🗺️ Abrir Mapa
                                </a>
                                <button style={{...styles.btnAddProduct, flex:1}} onClick={() => marcarEntregue(v.id)}>
                                    ✅ Entregue
                                </button>
                            </div>
                        </div>
                    ))}
                    {vendasRealizadas.filter(v => v.entrega === true && v.statusEntrega !== 'ENTREGUE').length === 0 && (
                        <p style={{color:'#94a3b8', textAlign:'center'}}>Nenhuma entrega pendente!</p>
                    )}
                </div>
            </div>
        )}

        </main>

        {/* MODAIS */}
        {modalAbrirCaixa && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>🏦 Abrir Caixa</h2>
              <label style={styles.modalLabel}>Valor de Abertura</label>
              <input
                type="number"
                style={styles.modalInput}
                placeholder="R$ 0,00"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
              />
              <div style={styles.modalButtons}>
                <button style={styles.btnSecondary} onClick={() => setModalAbrirCaixa(false)}>
                  Cancelar
                </button>
                <button style={styles.btnPrimary} onClick={abrirCaixa}>
                  Abrir Caixa
                </button>
              </div>
            </div>
          </div>
        )}

        {modalAberto && (
          <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}}>
              <h2 style={styles.modalTitle}>📦 {produtoEmEdicao ? 'Editar' : 'Novo'} Produto</h2>
              <form onSubmit={salvarProduto}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div>
                    <label style={styles.modalLabel}>Nome</label>
                    <input
                      style={styles.modalInput}
                      value={formProduto.nome}
                      onChange={(e) => setFormProduto({...formProduto, nome: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label style={styles.modalLabel}>Código de Barras</label>
                    <input
                      style={styles.modalInput}
                      value={formProduto.codigoBarra}
                      onChange={(e) => setFormProduto({...formProduto, codigoBarra: e.target.value})}
                    />
                  </div>
                  <div>
                    <label style={styles.modalLabel}>Preço de Custo</label>
                    <input
                      type="number"
                      step="0.01"
                      style={styles.modalInput}
                      value={formProduto.precoCusto}
                      onChange={(e) => setFormProduto({...formProduto, precoCusto: Number(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <label style={styles.modalLabel}>Preço de Venda</label>
                    <input
                      type="number"
                      step="0.01"
                      style={styles.modalInput}
                      value={formProduto.precoVenda}
                      onChange={(e) => setFormProduto({...formProduto, precoVenda: Number(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <label style={styles.modalLabel}>Estoque</label>
                    <input
                      type="number"
                      style={styles.modalInput}
                      value={formProduto.estoque}
                      onChange={(e) => setFormProduto({...formProduto, estoque: Number(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <label style={styles.modalLabel}>Categoria</label>
                    <input
                      style={styles.modalInput}
                      value={formProduto.categoria}
                      onChange={(e) => setFormProduto({...formProduto, categoria: e.target.value})}
                    />
                  </div>
                </div>
                <div style={styles.modalButtons}>
                  <button type="button" style={styles.btnSecondary} onClick={() => setModalAberto(false)}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnPrimary}>
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalClienteAberto && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>👤 Novo Cliente</h2>
              <form onSubmit={salvarCliente}>
                <div>
                  <label style={styles.modalLabel}>Nome Completo</label>
                  <input
                    style={styles.modalInput}
                    value={formCliente.nome}
                    onChange={(e) => setFormCliente({...formCliente, nome: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label style={styles.modalLabel}>CPF / CNPJ</label>
                  <input
                    style={styles.modalInput}
                    value={formCliente.cpfCnpj}
                    onChange={(e) => setFormCliente({...formCliente, cpfCnpj: e.target.value})}
                  />
                </div>
                <div>
                    <label style={styles.modalLabel}>Celular</label>
                    <input
                        style={styles.modalInput}
                        value={formCliente.celular}
                        onChange={(e) => setFormCliente({...formCliente, celular: e.target.value})}
                    />
                </div>
                <div style={styles.modalButtons}>
                  <button type="button" style={styles.btnSecondary} onClick={() => setModalClienteAberto(false)}>
                    Cancelar
                  </button>
                  <button type="submit" style={styles.btnPrimary}>
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modalCaixaVisivel && caixa && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>🏦 Gerenciar Caixa</h2>
              <h3 style={{textAlign: 'center', color: '#10b981', fontSize: '1.8rem', margin: '1rem 0'}}>
                R$ {caixa.saldoAtual?.toFixed(2) || '0,00'}
              </h3>
              <div style={styles.modalButtons}>
                <button style={styles.btnSecondary} onClick={() => setModalCaixaVisivel(false)}>
                  Voltar
                </button>
                <button style={styles.btnDanger} onClick={fecharCaixa}>
                  🔒 FECHAR CAIXA
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.9); }
        }
      `}</style>
    </>
  );
}

// ============================================================================
// ESTILOS (Dark Mode Moderno)
// ============================================================================
const styles = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logo: {
    width: '45px',
    height: '45px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800 as const,
    fontSize: '1.3rem',
    color: 'white',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
  },
  companyInfo: {
    display: 'flex',
    flexDirection: 'column' as const
  },
  companyName: {
    fontSize: '1.3rem',
    fontWeight: 600 as const,
    color: 'white',
    lineHeight: 1.2
  },
  modoBadge: {
    fontSize: '0.65rem',
    color: '#fbbf24',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },
  headerCenter: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center'
  },
  cashStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '0.95rem'
  },
  cashOpen: {
    background: 'rgba(16, 185, 129, 0.2)',
    border: '2px solid #10b981'
  },
  cashClosed: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '2px solid #ef4444'
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  statusOpen: {
    background: '#10b981',
    boxShadow: '0 0 8px #10b981'
  },
  statusClosed: {
    background: '#ef4444',
    boxShadow: '0 0 8px #ef4444'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    fontSize: '0.9rem',
    color: 'white'
  },
  btnLogout: {
    padding: '0.6rem 1.2rem',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    color: '#fca5a5',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '0.9rem'
  },
  navTabs: {
    background: '#1e293b',
    padding: '0.5rem 2rem',
    display: 'flex',
    gap: '0.5rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    overflowX: 'auto' as const
  },
  navTab: {
    padding: '0.8rem 1.5rem',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    color: '#94a3b8',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap' as const,
    fontSize: '0.95rem'
  },
  navTabActive: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)'
  },
  mainContent: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto' as const,
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
  },
  caixaContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 420px',
    gap: '1rem',
    height: 'calc(100vh - 140px)'
  },
  caixaLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  searchSection: {
    background: '#1e293b',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
  },
  searchWrapper: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '0.8rem'
  },
  searchInput: {
    flex: 1,
    padding: '1rem',
    background: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '1rem',
    outline: 'none' as const
  },
  keyboardHint: {
    fontSize: '0.75rem',
    color: '#64748b',
    textAlign: 'center' as const
  },
  productsGrid: {
    flex: 1,
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1.5rem',
    overflowY: 'auto' as const,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
  },
  gridHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  gridTitle: {
    fontSize: '1.2rem',
    fontWeight: 600 as const,
    color: '#e2e8f0'
  },
  btnAddProduct: {
    padding: '0.6rem 1.2rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 600 as const,
    cursor: 'pointer'
  },
  productsDisplay: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '1rem'
  },
  productCard: {
    background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    borderRadius: '10px',
    padding: '1rem',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
    textAlign: 'center' as const
  },
  productIcon: {
    width: '60px',
    height: '60px',
    margin: '0 auto 0.8rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    boxShadow: '0 4px 8px rgba(16, 185, 129, 0.3)'
  },
  productName: {
    fontWeight: 600 as const,
    marginBottom: '0.4rem',
    fontSize: '0.9rem',
    color: '#e2e8f0'
  },
  productPrice: {
    color: '#10b981',
    fontWeight: 700 as const,
    fontSize: '1.1rem',
    marginBottom: '0.2rem'
  },
  productStock: {
    fontSize: '0.75rem',
    color: '#94a3b8'
  },
  caixaRight: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
  },
  cartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #334155'
  },
  cartIcon: {
    fontSize: '1.5rem'
  },
  cartTitle: {
    fontSize: '1.3rem',
    fontWeight: 600 as const,
    color: '#e2e8f0'
  },
  cartItems: {
    flex: 1,
    overflowY: 'auto' as const,
    marginBottom: '1rem',
    minHeight: '200px'
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.5
  },
  emptySubtitle: {
    fontSize: '0.85rem',
    marginTop: '0.5rem'
  },
  cartItem: {
    background: '#0f172a',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '0.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontWeight: 600 as const,
    marginBottom: '0.25rem',
    color: '#e2e8f0'
  },
  itemDetails: {
    fontSize: '0.85rem',
    color: '#94a3b8'
  },
  itemPrice: {
    fontWeight: 700 as const,
    color: '#10b981',
    fontSize: '1.1rem',
    marginRight: '0.5rem'
  },
  itemRemove: {
    background: '#ef4444',
    border: 'none',
    color: 'white',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  cartSummary: {
    background: '#0f172a',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
    fontSize: '0.95rem',
    color: '#94a3b8'
  },
  summaryTotal: {
    fontSize: '1.4rem',
    fontWeight: 700 as const,
    color: '#10b981',
    paddingTop: '0.75rem',
    borderTop: '2px solid #334155',
    marginTop: '0.5rem'
  },
  paymentSection: {
    marginBottom: '1rem'
  },
  paymentLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginBottom: '0.5rem',
    fontWeight: 600 as const,
    display: 'block' as const
  },
  paymentInput: {
    width: '100%',
    padding: '0.75rem',
    background: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '1rem',
    marginBottom: '0.5rem',
    boxSizing: 'border-box' as const
  },
  btnAddPayment: {
    padding: '0.75rem 1.5rem',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 600 as const,
    cursor: 'pointer',
    fontSize: '1.2rem'
  },
  deliveryCheck: {
    padding: '0.75rem',
    background: '#0f172a',
    borderRadius: '8px',
    marginBottom: '1rem',
    color: '#e2e8f0'
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  btnSell: {
    padding: '1.2rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 700 as const,
    cursor: 'pointer',
    fontSize: '1.1rem',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
  },
  contentPanel: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
    color: '#e2e8f0'
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  modalContent: {
    background: '#1e293b',
    padding: '2rem',
    borderRadius: '15px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: '1.5rem',
    color: '#e2e8f0',
    fontSize: '1.5rem'
  },
  modalLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: 600 as const,
    marginBottom: '0.5rem',
    display: 'block' as const
  },
  modalInput: {
    width: '100%',
    padding: '0.75rem',
    background: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '1rem',
    marginBottom: '1rem',
    boxSizing: 'border-box' as const,
    outline: 'none' as const
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem'
  },
  btnSecondary: {
    padding: '0.8rem 1.5rem',
    background: '#475569',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 600 as const,
    cursor: 'pointer'
  },
  btnPrimary: {
    padding: '0.8rem 1.5rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 600 as const,
    cursor: 'pointer'
  },
  btnDanger: {
    padding: '0.8rem 1.5rem',
    background: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 600 as const,
    cursor: 'pointer'
  }
};

export default App;