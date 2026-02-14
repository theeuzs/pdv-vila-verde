import React, { useState, useEffect } from 'react';

// Tipagem das props
interface ModalProps {
  onClose: () => void;
  onSave: (dados: any) => void;
  produto?: any;
}

export default function ModalProdutoPro({ onClose, onSave, produto }: ModalProps) {
  // --- NAVEGAÇÃO ---
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'precos' | 'estoque' | 'avancado'>('geral');
  const [modoRapido, setModoRapido] = useState(false);

  // --- DADOS GERAIS ---
  const [nome, setNome] = useState('');
  const [codigoBarra, setCodigoBarra] = useState('');
  const [sku, setSku] = useState('');
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [ativo, setAtivo] = useState(true);
  const [permitirDesconto, setPermitirDesconto] = useState(true);

  // --- FINANCEIRO (COM IMPOSTOS) ---
  const [precoCustoBase, setPrecoCustoBase] = useState(0); // Preço na Nota
  const [ipi, setIpi] = useState(0); // %
  const [icms, setIcms] = useState(0); // % (Ou ICMS ST se preferir somar direto)
  const [custoFinal, setCustoFinal] = useState(0); // Custo + Impostos
  
  const [margemLucro, setMargemLucro] = useState(0);
  const [precoVenda, setPrecoVenda] = useState(0);
  const [lucroReal, setLucroReal] = useState(0);

  // --- ESTOQUE ---
  const [estoqueAtual, setEstoqueAtual] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(5);
  const [estoqueIdeal, setEstoqueIdeal] = useState(10);
  const [localizacao, setLocalizacao] = useState('');
  const [venderSemEstoque, setVenderSemEstoque] = useState(false);

  // --- AVANÇADO / FISCAL ---
  const [fornecedorId, setFornecedorId] = useState('');
  const [ncm, setNcm] = useState('');
  const [origem, setOrigem] = useState('0');
  const [csosn, setCsosn] = useState('102');
  const [cfop, setCfop] = useState('5102');

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    if (produto) {
      setNome(produto.nome);
      setCodigoBarra(produto.codigoBarra || '');
      setSku(produto.sku || '');
      setCategoria(produto.categoria || '');
      setMarca(produto.marca || '');
      setUnidade(produto.unidade || 'UN');
      setEstoqueAtual(Number(produto.estoque));
      
      // Carrega preços
      const custo = Number(produto.precoCusto || 0);
      const venda = Number(produto.precoVenda || 0);
      setPrecoCustoBase(custo);
      setPrecoVenda(venda);
      
      // Recalcula o resto baseados nos valores carregados
      // (Assume IPI/ICMS zerados na edição se não tiver salvo no banco ainda)
      setCustoFinal(custo); 
      if(custo > 0) {
        const margem = ((venda - custo) / custo) * 100;
        setMargemLucro(Number(margem.toFixed(2)));
        setLucroReal(venda - custo);
      }
    }
  }, [produto]);

  // --- CÁLCULOS FINANCEIROS ---

  // 1. Atualiza o Custo Final sempre que mudar Base ou Impostos
  useEffect(() => {
    const valorIpi = precoCustoBase * (ipi / 100);
    const valorIcms = precoCustoBase * (icms / 100); // Aqui assumindo que o ICMS soma ao custo (ST) ou Encargo
    const total = precoCustoBase + valorIpi + valorIcms;
    
    setCustoFinal(Number(total.toFixed(2)));
    
    // Se já tem preço de venda, recalcula a margem
    if (precoVenda > 0 && total > 0) {
       const novaMargem = ((precoVenda - total) / total) * 100;
       setMargemLucro(Number(novaMargem.toFixed(2)));
       setLucroReal(precoVenda - total);
    }
  }, [precoCustoBase, ipi, icms]);

  // 2. Mudou a Margem? Calcula Venda (Baseado no Custo Final)
  const atualizarPorMargem = (novaMargem: number) => {
    setMargemLucro(novaMargem);
    if (custoFinal > 0) {
      const venda = custoFinal + (custoFinal * (novaMargem / 100));
      setPrecoVenda(Number(venda.toFixed(2)));
      setLucroReal(venda - custoFinal);
    }
  };

  // 3. Mudou a Venda? Calcula Margem
  const atualizarPorVenda = (novaVenda: number) => {
    setPrecoVenda(novaVenda);
    if (custoFinal > 0) {
      const margem = ((novaVenda - custoFinal) / custoFinal) * 100;
      setMargemLucro(Number(margem.toFixed(2)));
    }
    setLucroReal(novaVenda - custoFinal);
  };


  // --- ESTILOS "CLAUDE STYLE" ---
  const s = {
    overlay: {
      position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(4px)'
    },
    modal: {
      backgroundColor: '#f8fafc', width: '950px', maxWidth: '98%', height: '90vh',
      borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      display: 'flex', flexDirection: 'column' as 'column', overflow: 'hidden', border: '1px solid #e2e8f0'
    },
    header: {
      padding: '20px 30px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    titleId: { fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' },
    tabsContainer: {
      display: 'flex', padding: '0 30px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', gap: '30px'
    },
    tab: (active: boolean) => ({
      padding: '16px 0', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
      color: active ? '#10b981' : '#64748b',
      borderBottom: active ? '3px solid #10b981' : '3px solid transparent',
      display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
    }),
    content: {
      flex: 1, overflowY: 'auto' as 'auto', padding: '30px', backgroundColor: '#f8fafc' // Fundo cinza bem clarinho
    },
    card: {
      backgroundColor: '#fff', borderRadius: '12px', padding: '24px', 
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      marginBottom: '20px', border: '1px solid #f1f5f9'
    },
    inputGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' },
    input: {
      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
      fontSize: '0.95rem', color: '#0f172a', transition: 'border-color 0.2s', outline: 'none'
    },
    inputFocus: { borderColor: '#10b981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)' }, // Pseudo-classe simulada
    row: { display: 'flex', gap: '20px', alignItems: 'flex-start' },
    col: (flex = 1) => ({ flex: flex }),
    
    // Alertas e Boxes Especiais
    greenBox: {
      backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '20px',
      marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    yellowBox: {
      backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px',
      marginBottom: '20px'
    },
    bigNumber: { fontSize: '1.5rem', fontWeight: 800, color: '#059669' },
    footer: {
      padding: '20px 30px', backgroundColor: '#fff', borderTop: '1px solid #e2e8f0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    btnCancel: {
      padding: '12px 24px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569',
      fontWeight: 600, border: 'none', cursor: 'pointer'
    },
    btnSave: {
      padding: '12px 32px', borderRadius: '8px', backgroundColor: '#10b981', color: '#fff',
      fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)'
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        
        {/* 1. CABEÇALHO */}
        <div style={s.header}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>
              {produto ? '✏️ Editar Produto' : '✨ Novo Produto'}
            </h2>
            <div style={s.titleId}>
               {modoRapido ? '⚡ Cadastro Expresso' : '🛠️ Cadastro Detalhado'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button 
               onClick={() => setModoRapido(!modoRapido)} 
               style={{ 
                 ...s.btnCancel, 
                 backgroundColor: modoRapido ? '#3b82f6' : '#f59e0b', 
                 color: '#fff',
                 fontSize: '0.85rem', 
                 padding: '8px 16px',
                 display: 'flex', alignItems: 'center', gap: '6px'
               }}
             >
                {modoRapido ? '📝 Mudar para Completo' : '⚡ Mudar para Rápido'}
             </button>
             <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
          </div>
        </div>

        {/* 2. ABAS (Só aparecem se NÃO estiver no modo rápido) */}
        {!modoRapido && (
          <div style={s.tabsContainer}>
            <div onClick={() => setAbaAtiva('geral')} style={s.tab(abaAtiva === 'geral')}>📝 Geral</div>
            <div onClick={() => setAbaAtiva('precos')} style={s.tab(abaAtiva === 'precos')}>💲 Preços</div>
            <div onClick={() => setAbaAtiva('estoque')} style={s.tab(abaAtiva === 'estoque')}>📦 Estoque</div>
            <div onClick={() => setAbaAtiva('avancado')} style={s.tab(abaAtiva === 'avancado')}>⚙️ Avançado</div>
          </div>
        )}

        {/* 3. CONTEÚDO PRINCIPAL */}
        <div style={s.content}>

          {/* === MODO RÁPIDO (VISUALIGUAL AO PRINT) === */}
          {modoRapido ? (
            <div>
               {/* Aviso Amarelo */}
               <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>
                  <span style={{ fontWeight: 500 }}><b>Modo Rápido:</b> Cadastre apenas o essencial. O resto (NCM, Fornecedor, Estoque Mínimo) pode ser preenchido depois.</span>
               </div>

               {/* Campos Essenciais */}
               <div style={s.inputGroup}>
                  <label style={s.label}>Nome do Produto <span style={{color: 'red'}}>*</span></label>
                  <input 
                    style={{ ...s.input, fontSize: '1.1rem', padding: '12px' }} 
                    value={nome} onChange={e => setNome(e.target.value)} 
                    placeholder="Ex: Cimento Votoran CP-II 50kg" 
                    autoFocus
                  />
               </div>

               <div style={s.row}>
                  <div style={s.col(1)}>
                     <label style={s.label}>Código de Barras</label>
                     <div style={{ display: 'flex', gap: '8px' }}>
                       <input style={s.input} value={codigoBarra} onChange={e => setCodigoBarra(e.target.value)} placeholder="Escaneie..." />
                       <button style={{ ...s.btnCancel, padding: '0 15px' }}>📷</button>
                     </div>
                  </div>
                  <div style={s.col(1)}>
                     <label style={s.label}>Preço de Venda (R$) <span style={{color: 'red'}}>*</span></label>
                     <input 
                        type="number" 
                        style={{ ...s.input, fontWeight: 'bold', color: '#166534', borderColor: '#10b981' }} 
                        value={precoVenda} onChange={e => atualizarPorVenda(Number(e.target.value))} 
                      />
                  </div>
               </div>

               <div style={{ ...s.row, marginTop: '20px' }}>
                  <div style={{ ...s.col(1), maxWidth: '200px' }}>
                     <label style={s.label}>Estoque Atual <span style={{color: 'red'}}>*</span></label>
                     <input 
                        type="number" style={s.input} 
                        value={estoqueAtual} onChange={e => setEstoqueAtual(Number(e.target.value))} 
                      />
                  </div>
                   <div style={s.col(1)}>
                    <label style={s.label}>Unidade</label>
                    <select style={s.input} value={unidade} onChange={e => setUnidade(e.target.value)}>
                      <option value="UN">UN - Unidade</option>
                      <option value="KG">KG - Quilo</option>
                      <option value="M">M - Metro</option>
                    </select>
                  </div>
               </div>
            </div>
          ) : (
            
            /* === MODO COMPLETO (ABAS) === */
            <>
              {/* ABA GERAL */}
              {abaAtiva === 'geral' && (
                <div style={s.card}>
                  <div style={s.inputGroup}>
                    <label style={s.label}>Nome do Produto <span style={{color: 'red'}}>*</span></label>
                    <input 
                      style={{ ...s.input, fontSize: '1.1rem', padding: '12px' }} 
                      value={nome} onChange={e => setNome(e.target.value)} 
                      placeholder="Ex: Cimento Votoran CP-II 50kg" 
                    />
                  </div>

                  <div style={s.row}>
                    <div style={s.col(2)}>
                      <label style={s.label}>Código de Barras / EAN</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input style={s.input} value={codigoBarra} onChange={e => setCodigoBarra(e.target.value)} placeholder="789..." />
                        <button style={{ ...s.btnCancel, padding: '0 15px' }}>📷</button>
                      </div>
                    </div>
                    <div style={s.col(1)}>
                      <label style={s.label}>SKU / Ref. Interna</label>
                      <input style={s.input} value={sku} onChange={e => setSku(e.target.value)} placeholder="CIM-01" />
                    </div>
                  </div>

                 <div style={{ ...s.row, marginTop: '16px' }}>
                    
                    {/* CATEGORIA - AGORA É SELECT */}
                    <div style={s.col(1)}>
                      <label style={s.label}>Categoria</label>
                      <select 
                        style={s.input} 
                        value={categoria} 
                        onChange={e => setCategoria(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        <option value="Geral">Geral</option>
                        <option value="Material Básico">Material Básico</option>
                        <option value="Hidráulica">Hidráulica</option>
                        <option value="Elétrica">Elétrica</option>
                        <option value="Ferragens">Ferragens</option>
                        <option value="Tintas">Tintas</option>
                        <option value="Ferramentas">Ferramentas</option>
                        <option value="Acabamentos">Acabamentos</option>
                      </select>
                    </div>

                    {/* MARCA - AGORA É SELECT */}
                    <div style={s.col(1)}>
                      <label style={s.label}>Marca</label>
                      <select 
                        style={s.input} 
                        value={marca} 
                        onChange={e => setMarca(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        <option value="Geral">Geral / Diversos</option>
                        <option value="Votoran">Votoran</option>
                        <option value="Tigre">Tigre</option>
                        <option value="Amanco">Amanco</option>
                        <option value="Suvinil">Suvinil</option>
                        <option value="Tramontina">Tramontina</option>
                        <option value="Gerdau">Gerdau</option>
                        <option value="Quartzolit">Quartzolit</option>
                      </select>
                    </div>

                    {/* UNIDADE (MANTIDA IGUAL) */}
                    <div style={s.col(1)}>
                      <label style={s.label}>Unidade</label>
                      <select style={s.input} value={unidade} onChange={e => setUnidade(e.target.value)}>
                        <option value="UN">UN - Unidade</option>
                        <option value="KG">KG - Quilo</option>
                        <option value="SC">SC - Saco</option>
                        <option value="M">M - Metro</option>
                        <option value="CX">CX - Caixa</option>
                        <option value="L">L - Litro</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                        <span style={{ fontWeight: 600, color: ativo ? '#166534' : '#64748b' }}>Produto Ativo</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={permitirDesconto} onChange={e => setPermitirDesconto(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                        <span style={{ fontWeight: 600, color: '#334155' }}>Permitir Desconto</span>
                    </label>
                  </div>
                </div>
              )}

              {/* ABA PREÇOS */}
              {abaAtiva === 'precos' && (
                <>
                  <div style={s.card}>
                    <div style={s.row}>
                      <div style={s.col(1)}>
                        <label style={s.label}>Preço de Custo (Nota Fiscal) <span style={{color: 'red'}}>*</span></label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }}>R$</span>
                          <input 
                            type="number" style={{ ...s.input, paddingLeft: '35px' }} 
                            value={precoCustoBase} onChange={e => setPrecoCustoBase(Number(e.target.value))} 
                          />
                        </div>
                      </div>
                      
                      <div style={s.col(0.5)}>
                        <label style={s.label}>+ IPI (%)</label>
                        <input type="number" style={s.input} value={ipi} onChange={e => setIpi(Number(e.target.value))} />
                      </div>
                      <div style={s.col(0.5)}>
                        <label style={s.label}>+ ICMS/Encargos (%)</label>
                        <input type="number" style={s.input} value={icms} onChange={e => setIcms(Number(e.target.value))} />
                      </div>

                      <div style={s.col(1)}>
                        <label style={{ ...s.label, color: '#dc2626' }}>= Custo Real Final</label>
                        <div style={{ ...s.input, backgroundColor: '#fef2f2', fontWeight: 'bold', color: '#991b1b', borderColor: '#fecaca' }}>
                          R$ {custoFinal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={s.card}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#334155' }}>Definição de Venda</h3>
                    <div style={s.row}>
                      <div style={s.col(1)}>
                        <label style={s.label}>Margem de Lucro (%)</label>
                        <input 
                          type="number" style={s.input} 
                          value={margemLucro} onChange={e => atualizarPorMargem(Number(e.target.value))} 
                        />
                      </div>
                      <div style={s.col(1)}>
                        <label style={s.label}>Preço de Venda Final (R$)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }}>R$</span>
                          <input 
                            type="number" style={{ ...s.input, paddingLeft: '35px', fontWeight: 'bold', color: '#166534', fontSize: '1.1rem', borderColor: '#10b981' }} 
                            value={precoVenda} onChange={e => atualizarPorVenda(Number(e.target.value))} 
                          />
                        </div>
                      </div>
                    </div>

                    <div style={s.greenBox}>
                      <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>MARGEM REAL</div>
                          <div style={s.bigNumber}>{margemLucro.toFixed(1)}%</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>LUCRO UNITÁRIO</div>
                          <div style={s.bigNumber}>R$ {lucroReal.toFixed(2)}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>MARKUP</div>
                          <div style={{ ...s.bigNumber, color: '#059669' }}>{(precoVenda/custoFinal || 0).toFixed(2)}x</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ABA ESTOQUE */}
              {abaAtiva === 'estoque' && (
                <>
                  <div style={s.card}>
                    <div style={s.row}>
                      <div style={{ ...s.col(2), borderRight: '1px solid #eee', paddingRight: '20px' }}>
                          <label style={s.label}>Estoque Atual</label>
                          <input 
                            type="number" style={{ ...s.input, fontSize: '1.5rem', fontWeight: 'bold', width: '150px' }} 
                            value={estoqueAtual} onChange={e => setEstoqueAtual(Number(e.target.value))} 
                          />
                          <span style={{ marginLeft: '10px', fontWeight: 600, color: '#64748b' }}>{unidade}</span>
                      </div>
                      <div style={s.col(3)}>
                          <label style={s.label}>Localização Física</label>
                          <input style={s.input} value={localizacao} onChange={e => setLocalizacao(e.target.value)} placeholder="Ex: Corredor A, Prateleira 4" />
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '5px' }}>Ajuda a encontrar o produto no depósito.</div>
                      </div>
                    </div>
                  </div>

                  <div style={s.yellowBox}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚠️ Alertas de Estoque
                    </h4>
                    <div style={s.row}>
                        <div style={s.col(1)}>
                          <label style={s.label}>Estoque Mínimo</label>
                          <input type="number" style={s.input} value={estoqueMinimo} onChange={e => setEstoqueMinimo(Number(e.target.value))} />
                          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px' }}>Avisa quando baixar disto.</div>
                        </div>
                        <div style={s.col(1)}>
                          <label style={s.label}>Estoque Ideal</label>
                          <input type="number" style={s.input} value={estoqueIdeal} onChange={e => setEstoqueIdeal(Number(e.target.value))} />
                          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px' }}>Meta para compras.</div>
                        </div>
                    </div>
                  </div>

                  <div style={{ padding: '0 10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={venderSemEstoque} onChange={e => setVenderSemEstoque(e.target.checked)} />
                        <span style={{ color: '#475569' }}>Permitir venda mesmo com estoque negativo</span>
                    </label>
                  </div>
                </>
              )}

              {/* ABA AVANÇADO */}
              {abaAtiva === 'avancado' && (
                <>
                  <div style={s.card}>
                      <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#334155' }}>🏢 Fornecedor Padrão</h3>
                      <select style={s.input} value={fornecedorId} onChange={e => setFornecedorId(e.target.value)}>
                        <option value="">Selecione um fornecedor...</option>
                        <option value="1">Votorantim S.A.</option>
                        <option value="2">Tigre Tubos e Conexões</option>
                      </select>
                  </div>

                  <div style={{ ...s.card, borderLeft: '4px solid #3b82f6' }}>
                      <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#1e3a8a' }}>📄 Dados Fiscais (NF-e/NFC-e)</h3>
                      
                      <div style={s.row}>
                        <div style={s.col(1)}>
                          <label style={s.label}>NCM (Obrigatório)</label>
                          <input style={s.input} value={ncm} onChange={e => setNcm(e.target.value)} placeholder="0000.00.00" />
                        </div>
                        <div style={s.col(2)}>
                          <label style={s.label}>Origem da Mercadoria</label>
                          <select style={s.input} value={origem} onChange={e => setOrigem(e.target.value)}>
                              <option value="0">0 - Nacional</option>
                              <option value="1">1 - Estrangeira (Importação direta)</option>
                              <option value="2">2 - Estrangeira (Adquirida no mercado interno)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ ...s.row, marginTop: '16px' }}>
                        <div style={s.col(1)}>
                          <label style={s.label}>CFOP Padrão</label>
                          <select style={s.input} value={cfop} onChange={e => setCfop(e.target.value)}>
                              <option value="5102">5102 - Venda de Mercadoria</option>
                              <option value="5405">5405 - Venda (ST)</option>
                          </select>
                        </div>
                        <div style={s.col(2)}>
                          <label style={s.label}>CSOSN (Simples Nacional)</label>
                          <select style={s.input} value={csosn} onChange={e => setCsosn(e.target.value)}>
                              <option value="102">102 - Tributada sem permissão de crédito</option>
                              <option value="500">500 - ICMS cobrado anteriormente (ST)</option>
                          </select>
                        </div>
                      </div>
                  </div>
                </>
              )}
            </>
          )}

        </div>

        {/* 4. RODAPÉ */}
        <div style={s.footer}>
          <button onClick={onClose} style={s.btnCancel}>Cancelar</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={{ ...s.btnCancel, backgroundColor: '#fff', border: '1px solid #cbd5e1' }}>📄 Duplicar</button>
            <button onClick={() => onSave({
                nome, codigoBarra, sku, categoria, marca, unidade, estoque: estoqueAtual,
                precoCusto: precoCustoBase, precoVenda, ncm, fornecedorId
            })} style={s.btnSave}>
               💾 SALVAR PRODUTO
            </button>
          </div>
        </div>

      </div>
    </div>
  )};