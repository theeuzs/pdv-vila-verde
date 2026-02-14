import React, { useState, useEffect } from 'react';

// Tipagem simples para o exemplo
interface ModalProps {
  onClose: () => void;
  onSave: (dados: any) => void;
  produto?: any; // Se vier preenchido, é edição
}

export default function ModalProdutoPro({ onClose, onSave, produto }: ModalProps) {
  // --- ESTADOS DE CONTROLE ---
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'precos' | 'estoque' | 'fiscal'>('geral');

  // --- DADOS DO PRODUTO ---
  // Identificação
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [codigoBarra, setCodigoBarra] = useState('');
  const [sku, setSku] = useState(''); // Novo
  
  // Classificação
  const [categoria, setCategoria] = useState('');
  const [marca, setMarca] = useState(''); // Novo
  const [unidade, setUnidade] = useState('UN');
  const [fornecedorId, setFornecedorId] = useState('');

  // Financeiro (Lógica Inteligente)
  const [precoCusto, setPrecoCusto] = useState(0);
  const [margemLucro, setMargemLucro] = useState(0);
  const [precoVenda, setPrecoVenda] = useState(0);
  const [lucroReal, setLucroReal] = useState(0);

  // Estoque
  const [estoqueAtual, setEstoqueAtual] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(5); // Novo
  const [localizacao, setLocalizacao] = useState(''); // Novo
  const [controlarEstoque, setControlarEstoque] = useState(true);

  // Fiscal
  const [ncm, setNcm] = useState('');
  const [cest, setCest] = useState(''); // Novo
  const [cfop, setCfop] = useState('5102');
  const [origem, setOrigem] = useState('0');

  // --- EFEITO: CARREGAR DADOS NA EDIÇÃO ---
  useEffect(() => {
    if (produto) {
      setNome(produto.nome);
      setCodigoBarra(produto.codigoBarra);
      setPrecoVenda(Number(produto.precoVenda));
      setEstoqueAtual(Number(produto.estoque));
      // ... carregar outros campos ...
    }
  }, [produto]);

  // --- CÁLCULOS AUTOMÁTICOS DE PREÇO ---
  
  // 1. Mudou o Custo ou Margem? Calcula Venda.
  const atualizarPorMargem = (novoCusto: number, novaMargem: number) => {
    const vendaCalculada = novoCusto + (novoCusto * (novaMargem / 100));
    setPrecoVenda(parseFloat(vendaCalculada.toFixed(2)));
    setLucroReal(vendaCalculada - novoCusto);
  };

  // 2. Mudou o Custo ou Venda Final? Calcula Margem.
  const atualizarPorVenda = (novoCusto: number, novaVenda: number) => {
    if (novoCusto > 0) {
      const margemCalculada = ((novaVenda - novoCusto) / novoCusto) * 100;
      setMargemLucro(parseFloat(margemCalculada.toFixed(2)));
    }
    setLucroReal(novaVenda - novoCusto);
  };


  // --- COMPONENTES VISUAIS (ESTILOS INLINE PARA FACILITAR) ---
  const styles = {
    overlay: {
      position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(3px)'
    },
    modal: {
      backgroundColor: '#fff', width: '900px', maxWidth: '95%',
      borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column' as 'column', overflow: 'hidden',
      height: '85vh' // Altura fixa para permitir scroll no corpo
    },
    header: {
      padding: '20px', borderBottom: '1px solid #eee',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: '#f8fafc'
    },
    tabs: {
      display: 'flex', padding: '0 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #ddd'
    },
    tabButton: (ativo: boolean) => ({
      padding: '12px 20px', cursor: 'pointer', fontWeight: 600,
      borderBottom: ativo ? '3px solid #10b981' : '3px solid transparent',
      color: ativo ? '#10b981' : '#64748b', transition: 'all 0.2s'
    }),
    body: {
      padding: '25px', overflowY: 'auto' as 'auto', flex: 1, backgroundColor: '#fff'
    },
    footer: {
      padding: '15px 25px', borderTop: '1px solid #eee',
      display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#f8fafc'
    },
    row: { display: 'flex', gap: '15px', marginBottom: '15px' },
    col: (size: number) => ({ flex: size, display: 'flex', flexDirection: 'column' as 'column', gap: '5px' }),
    label: { fontSize: '0.85rem', color: '#475569', fontWeight: 600 },
    input: {
      padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem',
      outline: 'none', transition: 'border 0.2s'
    },
    sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '15px', borderLeft: '4px solid #10b981', paddingLeft: '10px' },
    cardVerde: { backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '20px' },
    cardAzul: { backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '20px' }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        
        {/* 1. CABEÇALHO FIXO: Nome e Status */}
        <div style={styles.header}>
          <div style={{ flex: 1, marginRight: '20px' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>NOME DO PRODUTO (DESCRIÇÃO COMPLETA)</label>
            <input 
              value={nome} 
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Cimento CP II Votoran 50kg"
              style={{ ...styles.input, width: '100%', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '5px' }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: ativo ? '#dcfce7' : '#f1f5f9', padding: '5px 10px', borderRadius: '20px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: ativo ? '#166534' : '#64748b' }}>
              {ativo ? '🟢 ATIVO' : '⚫ INATIVO'}
            </span>
            <input 
              type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* 2. BARRA DE ABAS */}
        <div style={styles.tabs}>
          <div onClick={() => setAbaAtiva('geral')} style={styles.tabButton(abaAtiva === 'geral')}>📋 Geral</div>
          <div onClick={() => setAbaAtiva('precos')} style={styles.tabButton(abaAtiva === 'precos')}>💲 Preços</div>
          <div onClick={() => setAbaAtiva('estoque')} style={styles.tabButton(abaAtiva === 'estoque')}>📦 Estoque</div>
          <div onClick={() => setAbaAtiva('fiscal')} style={styles.tabButton(abaAtiva === 'fiscal')}>📄 Fiscal</div>
        </div>

        {/* 3. CORPO DO MODAL (Muda conforme a aba) */}
        <div style={styles.body}>

          {/* ABA GERAL */}
          {abaAtiva === 'geral' && (
            <>
              <div style={styles.sectionTitle}>Identificação Básica</div>
              <div style={styles.row}>
                <div style={styles.col(2)}>
                  <label style={styles.label}>Código de Barras / EAN</label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <input style={styles.input} value={codigoBarra} onChange={e => setCodigoBarra(e.target.value)} placeholder="Escaneie aqui..." />
                    <button style={{ padding: '0 15px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer' }}>📷</button>
                  </div>
                </div>
                <div style={styles.col(1)}>
                  <label style={styles.label}>SKU / Cód. Interno</label>
                  <input style={styles.input} value={sku} onChange={e => setSku(e.target.value)} placeholder="Auto" />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col(1)}>
                  <label style={styles.label}>Categoria</label>
                  <input style={styles.input} value={categoria} onChange={e => setCategoria(e.target.value)} list="categorias" />
                  <datalist id="categorias"><option value="Hidráulica" /><option value="Elétrica" /></datalist>
                </div>
                <div style={styles.col(1)}>
                  <label style={styles.label}>Marca / Fabricante</label>
                  <input style={styles.input} value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ex: Tigre" />
                </div>
                <div style={styles.col(1)}>
                  <label style={styles.label}>Unidade</label>
                  <select style={styles.input} value={unidade} onChange={e => setUnidade(e.target.value)}>
                    <option value="UN">UN - Unidade</option>
                    <option value="KG">KG - Quilo</option>
                    <option value="M">M - Metro</option>
                    <option value="CX">CX - Caixa</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ABA PREÇOS (A Inteligente) */}
          {abaAtiva === 'precos' && (
            <>
              <div style={styles.cardVerde}>
                <div style={styles.sectionTitle}>Precificação Automática</div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
                  💡 Dica: Preencha o Custo e a Margem para calcular a Venda automaticamente.
                </p>
                
                <div style={styles.row}>
                  <div style={styles.col(1)}>
                    <label style={styles.label}>Custo de Compra (R$)</label>
                    <input 
                      type="number" style={styles.input} 
                      value={precoCusto} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        setPrecoCusto(val);
                        atualizarPorMargem(val, margemLucro);
                      }} 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', fontWeight: 'bold', color: '#ccc' }}>+</div>

                  <div style={styles.col(1)}>
                    <label style={styles.label}>Margem de Lucro (%)</label>
                    <input 
                      type="number" style={{ ...styles.input, borderColor: '#22c55e', color: '#166534', fontWeight: 'bold' }} 
                      value={margemLucro} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        setMargemLucro(val);
                        atualizarPorMargem(precoCusto, val);
                      }} 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', fontWeight: 'bold', color: '#ccc' }}>=</div>

                  <div style={styles.col(1)}>
                    <label style={styles.label}>Preço de Venda (R$)</label>
                    <input 
                      type="number" style={{ ...styles.input, backgroundColor: '#dcfce7', borderColor: '#166534', fontWeight: 'bold', fontSize: '1.1rem' }} 
                      value={precoVenda} 
                      onChange={e => {
                        const val = Number(e.target.value);
                        setPrecoVenda(val);
                        atualizarPorVenda(precoCusto, val);
                      }} 
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '0.9rem', color: '#166534' }}>
                  Lucro Líquido Estimado: <strong>R$ {lucroReal.toFixed(2)}</strong> por unidade
                </div>
              </div>
            </>
          )}

          {/* ABA ESTOQUE */}
          {abaAtiva === 'estoque' && (
            <>
              <div style={styles.sectionTitle}>Controle de Estoque</div>
              
              <div style={styles.row}>
                <div style={styles.col(1)}>
                  <label style={styles.label}>Estoque Atual</label>
                  <input type="number" style={styles.input} value={estoqueAtual} onChange={e => setEstoqueAtual(Number(e.target.value))} />
                </div>
                <div style={styles.col(1)}>
                  <label style={styles.label}>Estoque Mínimo (Alerta)</label>
                  <input type="number" style={styles.input} value={estoqueMinimo} onChange={e => setEstoqueMinimo(Number(e.target.value))} />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col(2)}>
                  <label style={styles.label}>Localização Física (Rua / Prateleira)</label>
                  <input style={styles.input} value={localizacao} onChange={e => setLocalizacao(e.target.value)} placeholder="Ex: Corredor B, Prateleira 2" />
                </div>
                <div style={styles.col(1)}>
                  <label style={styles.label}>Gerenciar Estoque?</label>
                  <select style={styles.input} value={String(controlarEstoque)} onChange={e => setControlarEstoque(e.target.value === 'true')}>
                    <option value="true">Sim, abater vendas</option>
                    <option value="false">Não (Serviços/Digital)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ABA FISCAL */}
          {abaAtiva === 'fiscal' && (
            <>
              <div style={styles.cardAzul}>
                <div style={{ ...styles.sectionTitle, borderLeftColor: '#3b82f6', color: '#1e3a8a' }}>Dados Tributários</div>
                
                <div style={styles.row}>
                  <div style={styles.col(1)}>
                    <label style={styles.label}>NCM (Obrigatório NF-e)</label>
                    <input style={styles.input} value={ncm} onChange={e => setNcm(e.target.value)} placeholder="0000.00.00" />
                  </div>
                  <div style={styles.col(1)}>
                    <label style={styles.label}>CEST (Subst. Tributária)</label>
                    <input style={styles.input} value={cest} onChange={e => setCest(e.target.value)} />
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={styles.col(1)}>
                    <label style={styles.label}>Origem da Mercadoria</label>
                    <select style={styles.input} value={origem} onChange={e => setOrigem(e.target.value)}>
                      <option value="0">0 - Nacional</option>
                      <option value="1">1 - Importação Direta</option>
                      <option value="2">2 - Estrangeira (Mercado Interno)</option>
                    </select>
                  </div>
                  <div style={styles.col(1)}>
                    <label style={styles.label}>CFOP Padrão</label>
                    <input style={styles.input} value={cfop} onChange={e => setCfop(e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* 4. RODAPÉ FIXO */}
        <div style={styles.footer}>
          <button onClick={onClose} style={{ padding: '12px 25px', borderRadius: '6px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => onSave({ nome, precoVenda })} style={{ padding: '12px 40px', borderRadius: '6px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}>
            SALVAR PRODUTO
          </button>
        </div>

      </div>
    </div>
  );
}