import React from 'react';

interface ModalProps {
  onClose: () => void;
  produto: any;
}

export default function ModalDetalhesProduto({ onClose, produto }: ModalProps) {
  if (!produto) return null;

  // Estilos (Modo Light para leitura fácil)
  const s = {
    overlay: {
      position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1100, // Z-index alto
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(3px)'
    },
    modal: {
      backgroundColor: '#fff', width: '500px', maxWidth: '90%',
      borderRadius: '12px', padding: '0', overflow: 'hidden',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    },
    header: {
      backgroundColor: '#f8fafc', padding: '20px', borderBottom: '1px solid #e2e8f0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    body: { padding: '25px', display: 'flex', flexDirection: 'column' as 'column', gap: '15px' },
    row: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' },
    label: { color: '#64748b', fontSize: '0.9rem', fontWeight: 600 },
    value: { color: '#0f172a', fontWeight: 600, fontSize: '1rem', textAlign: 'right' as 'right' },
    tag: { 
      backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', 
      borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' 
    },
    footer: { padding: '15px 25px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' as 'right' },
    btn: {
        padding: '10px 20px', borderRadius: '6px', border: 'none', 
        backgroundColor: '#334155', color: '#fff', cursor: 'pointer', fontWeight: 'bold'
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        
        {/* Cabeçalho */}
        <div style={s.header}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {produto.id}</span>
            <h2 style={{ margin: '5px 0 0 0', color: '#1e293b' }}>{produto.nome}</h2>
          </div>
          <span style={s.tag}>{produto.categoria || 'Geral'}</span>
        </div>

        {/* Informações */}
        <div style={s.body}>
           
           <div style={s.row}>
              <span style={s.label}>Código de Barras</span>
              <span style={s.value}>{produto.codigoBarra || '-'}</span>
           </div>
           
           <div style={s.row}>
              <span style={s.label}>Preço de Venda</span>
              <span style={{ ...s.value, color: '#166534', fontSize: '1.2rem' }}>
                R$ {Number(produto.precoVenda).toFixed(2)}
              </span>
           </div>

           <div style={s.row}>
              <span style={s.label}>Estoque Atual</span>
              <span style={s.value}>{produto.estoque} {produto.unidade}</span>
           </div>

           <div style={s.row}>
              <span style={s.label}>Marca</span>
              <span style={s.value}>{produto.marca || 'Genérica'}</span>
           </div>

           <div style={s.row}>
              <span style={s.label}>Localização</span>
              <span style={s.value}>{produto.localizacao || 'Não informado'}</span>
           </div>

           {/* Seção Fiscal (Discreta) */}
           <div style={{ marginTop: '10px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '5px' }}>DADOS FISCAIS</div>
              <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem' }}>
                 <span><b>NCM:</b> {produto.ncm || '-'}</span>
                 <span><b>Origem:</b> {produto.origem || '0'}</span>
              </div>
           </div>

        </div>

        {/* Rodapé */}
        <div style={s.footer}>
           <button style={s.btn} onClick={onClose}>Fechar</button>
        </div>

      </div>
    </div>
  );
}