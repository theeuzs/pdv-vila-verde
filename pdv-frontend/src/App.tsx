import { useEffect, useState } from 'react'
import { Login } from './TelaLogin' 

// --- TIPOS ---
interface Produto {
  id: number; nome: string; codigoBarra?: string; precoCusto: number; precoVenda: number; estoque: number; unidade?: string; categoria?: string; fornecedor?: string; localizacao?: string; ipi?: number; icms?: number; frete?: number; ncm?: string; cest?: string; cfop?: string
}
interface Cliente {
  id: number; nome: string; cpfCnpj?: string; celular?: string; endereco?: string; 
  saldoHaver: string // Campo do Haver
}
interface ItemCarrinho { produto: Produto; quantidade: number }
interface Venda {
  id: number; data: string; total: string; formaPagamento: string; cliente?: Cliente;
  itens: { id: number; quantidade: string; precoUnit: string; produto: Produto }[]
}
interface ContaReceber { id: number; valor: string; data: string; status: string; cliente: Cliente; venda: Venda }

const estiloInput = { padding: '10px', borderRadius: '5px', border: '1px solid #ddd', outline: 'none', boxSizing: 'border-box' as const }

// ⚠️ SEU LINK DO RENDER AQUI
const API_URL = 'https://api-vila-verde.onrender.com'

export function App() {
  const [usuario] = useState(() => { const salvo = localStorage.getItem('usuario_vila_verde'); return salvo ? JSON.parse(salvo) : null })
  function fazerLogin(dados: any) { localStorage.setItem('usuario_vila_verde', JSON.stringify(dados)); window.location.reload() }
  function sair() { localStorage.removeItem('usuario_vila_verde'); window.location.reload() }

  const [aba, setAba] = useState<'caixa' | 'historico' | 'clientes' | 'financeiro'>('caixa') 
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendasRealizadas, setVendasRealizadas] = useState<Venda[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])

  // Caixa
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState(''); const [clienteSelecionado, setClienteSelecionado] = useState('') 
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO') 

  // Modais
  const [modalAberto, setModalAberto] = useState(false); const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null)
  const [modalClienteAberto, setModalClienteAberto] = useState(false); const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null)
  const [modalHistoricoCliente, setModalHistoricoCliente] = useState(false); const [historicoCliente, setHistoricoCliente] = useState<Venda[]>([]); const [clienteDoHistorico, setClienteDoHistorico] = useState<Cliente | null>(null)

  const [formProduto, setFormProduto] = useState({ nome: '', codigoBarra: '', precoCusto: '', precoVenda: '', estoque: '', unidade: 'UN', categoria: 'Geral', fornecedor: '', localizacao: '', ipi: '', icms: '', frete: '', ncm: '', cest: '', cfop: '' })
  const [formCliente, setFormCliente] = useState({ nome: '', cpfCnpj: '', celular: '', endereco: '' })

  async function carregarDados() {
    try {
      setProdutos(await (await fetch(`${API_URL}/produtos`)).json())
      setVendasRealizadas(await (await fetch(`${API_URL}/vendas`)).json())
      setClientes(await (await fetch(`${API_URL}/clientes`)).json())
      setContasReceber(await (await fetch(`${API_URL}/contas-receber`)).json())
    } catch (erro) { console.error("Erro", erro) }
  }
  useEffect(() => { if (usuario) carregarDados() }, [usuario])

  // --- HAVER (GERAR CRÉDITO) ---
  async function gerarHaver(cliente: Cliente) {
    const valorStr = prompt(`Gerar HAVER para ${cliente.nome}.\n\nQual o valor da devolução? (Ex: 50.00)`)
    if (!valorStr) return
    const valor = parseFloat(valorStr.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido")

    try {
      const res = await fetch(`${API_URL}/clientes/${cliente.id}/haver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor })
      })
      if (res.ok) { alert(`Haver de R$ ${valor.toFixed(2)} gerado!`); carregarDados() }
      else alert("Erro ao gerar haver")
    } catch (e) { alert("Erro conexão") }
  }

  // --- FUNÇÕES BÁSICAS ---
  function adicionarAoCarrinho(p: Produto) {
    if (Number(p.estoque) <= 0) return alert("Sem estoque!")
    setCarrinho(l => { const ex = l.find(i => i.produto.id === p.id); return ex ? l.map(i => i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i) : [...l, { produto: p, quantidade: 1 }] })
  }
  async function salvarProduto(e: React.FormEvent) {
    e.preventDefault(); const pl = { ...formProduto, precoCusto: Number(formProduto.precoCusto), precoVenda: Number(formProduto.precoVenda), estoque: Number(formProduto.estoque), ipi: Number(formProduto.ipi||0), icms: Number(formProduto.icms||0), frete: Number(formProduto.frete||0) }
    const url = produtoEmEdicao ?(`${API_URL}/produtos/${produtoEmEdicao.id}`):(`${API_URL}/produtos`); const met = produtoEmEdicao?'PUT':'POST'
    try { if((await fetch(url,{method:met,headers:{'Content-Type':'application/json'},body:JSON.stringify(pl)})).ok){setModalAberto(false);carregarDados();alert("Salvo!")}else alert("Erro") } catch(e){alert("Erro")}
  }
  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault(); const url = clienteEmEdicao ?(`${API_URL}/clientes/${clienteEmEdicao.id}`):(`${API_URL}/clientes`); const met = clienteEmEdicao?'PUT':'POST'
    try { if((await fetch(url,{method:met,headers:{'Content-Type':'application/json'},body:JSON.stringify(formCliente)})).ok){setModalClienteAberto(false);carregarDados();alert("Salvo!")}else alert("Erro") } catch(e){alert("Erro")}
  }
  async function baixarConta(id: number) { if(confirm("Receber valor?")) { await fetch(`${API_URL}/contas-receber/${id}/pagar`,{method:'PUT'}); carregarDados(); alert("Recebido!") } }
  async function excluirProduto(id: number) { if(confirm("Excluir?")) { await fetch(`${API_URL}/produtos/${id}`,{method:'DELETE'}); carregarDados() } }
  async function excluirCliente(id: number) { if(confirm("Excluir?")) { await fetch(`${API_URL}/clientes/${id}`,{method:'DELETE'}); carregarDados() } }
  async function verHistorico(c: Cliente) { setHistoricoCliente(await (await fetch(`${API_URL}/clientes/${c.id}/vendas`)).json()); setClienteDoHistorico(c); setModalHistoricoCliente(true) }
  
  // --- VENDA ---
  async function finalizarVenda() {
    if (carrinho.length === 0) return
    const total = carrinho.reduce((acc, item) => acc + (Number(item.produto.precoVenda) * item.quantidade), 0)

    if ((formaPagamento === 'A PRAZO' || formaPagamento === 'HAVER') && !clienteSelecionado) return alert("⚠️ Selecione um CLIENTE!")
    
    // Validação Visual do Haver
    if (formaPagamento === 'HAVER') {
      const cli = clientes.find(c => c.id === Number(clienteSelecionado))
      if (cli && Number(cli.saldoHaver) < total) return alert(`⚠️ Saldo de Haver insuficiente!\nSaldo: R$ ${Number(cli.saldoHaver).toFixed(2)}\nTotal Venda: R$ ${total.toFixed(2)}`)
    }

    try {
      const res = await fetch(`${API_URL}/vendas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: carrinho.map(i => ({ produtoId: i.produto.id, quantidade: i.quantidade })), clienteId: clienteSelecionado || null, formaPagamento })
      })
      if (res.ok) {
        const v = await res.json(); const nome = clientes.find(c => c.id === Number(clienteSelecionado))?.nome || 'Consumidor'
        imprimirCupom(carrinho, total, v.id, `${nome} (${formaPagamento})`)
        setCarrinho([]); setClienteSelecionado(''); setFormaPagamento('DINHEIRO'); alert("Venda Sucesso!"); carregarDados()
      } else { const err = await res.json(); alert(`Erro: ${err.erro || 'Erro ao vender'}`) }
    } catch (e) { alert("Conexão") }
  }

  // --- IMPRESSÃO (AGORA SIM!) ---
  function reimprimirVenda(venda: Venda) {
    const itensParaCupom = venda.itens.map(i => ({ produto: i.produto, quantidade: Number(i.quantidade) }))
    const nome = venda.cliente?.nome || 'Consumidor'
    const obs = venda.formaPagamento === 'A PRAZO' ? '(2ª VIA - A PRAZO)' : '(2ª VIA)'
    imprimirCupom(itensParaCupom, Number(venda.total), venda.id, `${nome} ${obs}`)
  }

  function imprimirCupom(itens: ItemCarrinho[], total: number, id: number, clienteNome: string) {
    const win = window.open('', '', 'width=300,height=500'); 
    win?.document.write(`<html><body style="font-family: monospace;"><h3>VILA VERDE #${id}</h3><p>Cli: ${clienteNome}</p><hr/>${itens.map(i => `<div>${i.produto.nome}<br/>${i.quantidade}x R$${Number(i.produto.precoVenda).toFixed(2)}</div>`).join('')}<hr/><b>TOTAL: R$ ${total.toFixed(2)}</b><script>window.print()</script></body></html>`);
  }

  if (!usuario) return <Login onLogin={fazerLogin} />

  // CÁLCULOS
  const totalHoje = vendasRealizadas.filter(v => new Date(v.data).toLocaleDateString() === new Date().toLocaleDateString() && v.formaPagamento !== 'A PRAZO' && v.formaPagamento !== 'HAVER').reduce((acc, v) => acc + Number(v.total), 0)
  
  // AQUI TAVA O ERRO! Agora estamos usando a variável:
  const totalReceber = contasReceber.reduce((acc, c) => acc + Number(c.valor), 0)

  const prodsFilt = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigoBarra||'').includes(busca))
  const totalCarrinho = carrinho.reduce((acc, i) => acc + (Number(i.produto.precoVenda) * i.quantidade), 0)
  const clienteObjSelecionado = clientes.find(c => c.id === Number(clienteSelecionado))

  return (
    <div style={{ fontFamily: 'Arial', backgroundColor: '#f4f4f9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: '#2c3e50', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>🏗️ PDV Vila Verde</h2>
        <div style={{ textAlign: 'right', display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>CAIXA HOJE</div>
            <div style={{ fontWeight: 'bold' }}>R$ {totalHoje.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, color: '#e74c3c' }}>A RECEBER</div>
            <div style={{ fontWeight: 'bold', color: '#e74c3c' }}>R$ {totalReceber.toFixed(2)}</div> {/* VOLTOU! */}
          </div>
          <button onClick={sair} style={{background:'red',border:'none',color:'white',borderRadius:4, height: 30, alignSelf: 'center'}}>SAIR</button>
        </div>
      </div>

      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #ddd', padding: '0 20px' }}>
        {['caixa','clientes','financeiro','historico'].map(t => (
          <button key={t} onClick={() => setAba(t as any)} style={{ padding: '15px', border: 'none', background: 'none', borderBottom: aba === t ? '3px solid #007bff' : 'none', fontWeight: 'bold', color: aba===t?'#007bff':'#666', cursor:'pointer' }}>{t.toUpperCase()}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
        {aba === 'caixa' && (
          <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}><input autoFocus placeholder="🔍 Buscar..." value={busca} onChange={e=>setBusca(e.target.value)} style={{flex:1,padding:12}} /><button onClick={()=> {setProdutoEmEdicao(null);setFormProduto({nome:'',codigoBarra:'',precoCusto:'',precoVenda:'',estoque:'',unidade:'UN',categoria:'Geral',fornecedor:'',localizacao:'',ipi:'',icms:'',frete:'',ncm:'',cest:'',cfop:''});setModalAberto(true)}} style={{padding:'0 20px',background:'#28a745',color:'white',border:'none',borderRadius:8}}>+ NOVO</button></div>
              <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 15 }}>
                {prodsFilt.map(p => (
                  <div key={p.id} style={{ background: 'white', padding: 15, borderRadius: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><b>{p.nome}</b><div><button onClick={()=>{setProdutoEmEdicao(p);setFormProduto({nome:p.nome,codigoBarra:p.codigoBarra||'',precoCusto:String(p.precoCusto),precoVenda:String(p.precoVenda),estoque:String(p.estoque),unidade:p.unidade||'UN',categoria:p.categoria||'Geral',fornecedor:p.fornecedor||'',localizacao:p.localizacao||'',ipi:String(p.ipi||''),icms:String(p.icms||''),frete:String(p.frete||''),ncm:p.ncm||'',cest:p.cest||'',cfop:p.cfop||''});setModalAberto(true)}}>✏️</button><button onClick={()=>excluirProduto(p.id)}>🗑️</button></div></div>
                    <div style={{marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontWeight:'bold',fontSize:'1.2rem'}}>R$ {Number(p.precoVenda).toFixed(2)}</span><button onClick={()=>adicionarAoCarrinho(p)} style={{background:'#007bff',color:'white',border:'none',padding:'5px 15px',borderRadius:5}}>+ Add</button></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 350, background: 'white', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column' }}>
              <h2>🛒 Carrinho</h2>
              <select value={clienteSelecionado} onChange={e=>setClienteSelecionado(e.target.value)} style={{marginBottom:10,padding:10,width:'100%'}}><option value="">👤 Consumidor</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              
              {/* MOSTRA SALDO HAVER SE TIVER */}
              {clienteObjSelecionado && Number(clienteObjSelecionado.saldoHaver) > 0 && (
                <div style={{marginBottom:10, padding:10, background:'#d4edda', color:'#155724', borderRadius:5, fontSize:'0.9rem'}}>💰 Haver disponível: <b>R$ {Number(clienteObjSelecionado.saldoHaver).toFixed(2)}</b></div>
              )}

              <select value={formaPagamento} onChange={e=>setFormaPagamento(e.target.value)} style={{marginBottom:15,padding:10,width:'100%'}}>
                <option value="DINHEIRO">💵 Dinheiro</option><option value="PIX">💠 PIX</option><option value="CARTAO">💳 Cartão</option><option value="A PRAZO">📒 Fiado</option>
                <option value="HAVER">💰 Haver (Crédito)</option> 
              </select>
              <div style={{flex:1,overflowY:'auto'}}>{carrinho.map((i,x)=><div key={x} style={{borderBottom:'1px solid #eee',padding:5}}><b>{i.produto.nome}</b><br/>{i.quantidade}x R$ {Number(i.produto.precoVenda).toFixed(2)}</div>)}</div>
              <div style={{borderTop:'2px solid #333',paddingTop:15}}><div style={{display:'flex',justifyContent:'space-between',fontSize:'1.5rem'}}><b>Total</b><b>R$ {totalCarrinho.toFixed(2)}</b></div><button onClick={finalizarVenda} style={{width:'100%',padding:15,background:'#28a745',color:'white',border:'none',borderRadius:8,marginTop:10,fontSize:'1.2rem'}}>FINALIZAR</button></div>
            </div>
          </div>
        )}

        {aba === 'clientes' && (
          <div style={{ background: 'white', borderRadius: 10, padding: 20, height: '100%', overflowY: 'auto' }}>
            <div style={{display:'flex',justifyContent:'space-between'}}><h2>👥 Clientes</h2><button onClick={()=>{setClienteEmEdicao(null);setFormCliente({nome:'',cpfCnpj:'',celular:'',endereco:''});setModalClienteAberto(true)}} style={{padding:'10px 20px',background:'#28a745',color:'white',border:'none',borderRadius:5}}>+ Cadastrar</button></div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{textAlign:'left',borderBottom:'2px solid #eee'}}><th style={{padding:10}}>Nome</th><th style={{padding:10}}>Haver (Saldo)</th><th style={{padding:10}}>Ações</th></tr></thead>
              <tbody>{clientes.map(c => (
                <tr key={c.id} style={{borderBottom:'1px solid #f5f5f5'}}>
                  <td style={{padding:10}}><b>{c.nome}</b><br/><span style={{fontSize:'0.8rem',color:'#666'}}>{c.cpfCnpj} - {c.celular}</span></td>
                  <td style={{padding:10, color: Number(c.saldoHaver)>0 ? 'green':'#aaa', fontWeight:'bold'}}>R$ {Number(c.saldoHaver).toFixed(2)}</td>
                  <td style={{padding:10}}>
                    <button onClick={()=>gerarHaver(c)} title="Gerar Haver/Devolução" style={{border:'1px solid green',background:'#e8f5e9',cursor:'pointer',marginRight:5,borderRadius:4,padding:5}}>💰 Gerar Haver</button>
                    <button onClick={()=>verHistorico(c)} title="Histórico" style={{border:'none',background:'none',cursor:'pointer',fontSize:'1.2rem'}}>📜</button>
                    <button onClick={()=>{setClienteEmEdicao(c);setFormCliente({nome:c.nome,cpfCnpj:c.cpfCnpj||'',celular:c.celular||'',endereco:c.endereco||''});setModalClienteAberto(true)}} title="Editar" style={{border:'none',background:'none',cursor:'pointer',fontSize:'1.2rem'}}>✏️</button>
                    <button onClick={()=>excluirCliente(c.id)} title="Excluir" style={{border:'none',background:'none',cursor:'pointer',fontSize:'1.2rem'}}>🗑️</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {aba === 'financeiro' && (
           <div style={{ background: 'white', borderRadius: 10, padding: 20, height: '100%', overflowY: 'auto' }}>
              <h2>💲 A Receber</h2>
              {contasReceber.length===0?<p>Nada a receber.</p>:<table style={{width:'100%'}}><thead><tr style={{textAlign:'left'}}><th style={{padding:10}}>Cliente</th><th style={{padding:10}}>Valor</th><th></th></tr></thead><tbody>{contasReceber.map(c=><tr key={c.id} style={{borderBottom:'1px solid #eee'}}><td style={{padding:10}}>{c.cliente.nome}</td><td style={{padding:10,color:'red',fontWeight:'bold'}}>R$ {Number(c.valor).toFixed(2)}</td><td><button onClick={()=>baixarConta(c.id)} style={{background:'#2ecc71',color:'white',border:'none',padding:'5px 10px',borderRadius:5,cursor:'pointer'}}>RECEBER</button></td></tr>)}</tbody></table>}
           </div>
        )}

        {aba === 'historico' && (
           <div style={{ background: 'white', borderRadius: 10, padding: 20, height: '100%', overflowY: 'auto' }}>
              <h2>📜 Vendas</h2>
              <table style={{width:'100%'}}><thead><tr style={{textAlign:'left'}}><th style={{padding:10}}>ID</th><th style={{padding:10}}>Cliente</th><th style={{padding:10}}>Pgto</th><th style={{padding:10}}>Total</th><th style={{padding:10}}>Ação</th></tr></thead>
              <tbody>{vendasRealizadas.map(v=><tr key={v.id} style={{borderBottom:'1px solid #eee'}}><td style={{padding:10}}>#{v.id}</td><td style={{padding:10}}>{v.cliente?.nome||'Consumidor'}</td><td style={{padding:10}}>{v.formaPagamento}</td><td style={{padding:10}}>R$ {Number(v.total).toFixed(2)}</td><td style={{padding:10}}><button onClick={()=>reimprimirVenda(v)} style={{cursor:'pointer',border:'none',background:'none',fontSize:'1.2rem'}}>🖨️</button></td></tr>)}</tbody></table>
           </div>
        )}
      </div>

      {/* MODAIS */}
      {modalAberto && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center'}}><div style={{background:'white',padding:20,borderRadius:10,width:500}}><form onSubmit={salvarProduto} style={{display:'flex',flexDirection:'column',gap:10}}><input placeholder="Nome" value={formProduto.nome} onChange={e=>setFormProduto({...formProduto,nome:e.target.value})} style={estiloInput} required /><input placeholder="Preço Venda" type="number" value={formProduto.precoVenda} onChange={e=>setFormProduto({...formProduto,precoVenda:e.target.value})} style={estiloInput} required /><input placeholder="Estoque" type="number" value={formProduto.estoque} onChange={e=>setFormProduto({...formProduto,estoque:e.target.value})} style={estiloInput} /><div style={{display:'flex',justifyContent:'flex-end',gap:10}}><button type="button" onClick={()=>setModalAberto(false)}>Cancelar</button><button type="submit">Salvar</button></div></form></div></div>}
      {modalClienteAberto && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center'}}><div style={{background:'white',padding:20,borderRadius:10,width:400}}><form onSubmit={salvarCliente} style={{display:'flex',flexDirection:'column',gap:10}}><input placeholder="Nome" value={formCliente.nome} onChange={e=>setFormCliente({...formCliente,nome:e.target.value})} style={estiloInput} required /><input placeholder="CPF" value={formCliente.cpfCnpj} onChange={e=>setFormCliente({...formCliente,cpfCnpj:e.target.value})} style={estiloInput} /><div style={{display:'flex',justifyContent:'flex-end',gap:10}}><button type="button" onClick={()=>setModalClienteAberto(false)}>Cancelar</button><button type="submit">Salvar</button></div></form></div></div>}
      
      {/* HISTORICO (COM BOTÃO IMPRIMIR AGORA!) */}
      {modalHistoricoCliente && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center'}}><div style={{background:'white',padding:20,borderRadius:10,width:500,maxHeight:'80vh',overflowY:'auto'}}><h3>Histórico: {clienteDoHistorico?.nome}</h3>
        {historicoCliente.map(v=> (
          <div key={v.id} style={{borderBottom:'1px solid #eee',padding:10, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>Data: {new Date(v.data).toLocaleDateString()} - Total: R$ {Number(v.total).toFixed(2)}</div>
            <button onClick={() => reimprimirVenda(v)} title="Imprimir 2ª Via" style={{cursor: 'pointer', border: '1px solid #ddd', background: '#f9f9f9', borderRadius: 4, padding: '2px 8px'}}>🖨️</button>
          </div>
        ))}
        <button onClick={()=>setModalHistoricoCliente(false)} style={{marginTop:10}}>Fechar</button></div></div>}

    </div>     
  )
}
export default App