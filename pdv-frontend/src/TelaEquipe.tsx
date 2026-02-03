import { useState, useEffect } from 'react';

// Ajuste para o seu link do Render se precisar
const API_URL = 'https://api-vila-verde.onrender.com';

export function TelaEquipe() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [cargo, setCargo] = useState('VENDEDOR');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const res = await fetch(`${API_URL}/usuarios`);
      setUsuarios(await res.json());
    } catch (e) { console.error("Erro conexao"); }
  }

  async function cadastrar(e: any) {
    e.preventDefault();
    if(!nome || !senha) return alert("Preencha tudo!");
    setCarregando(true);

    await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ nome, senha, cargo })
    });
    
    setNome(''); setSenha(''); setCarregando(false);
    carregar(); alert("Cadastrado com sucesso!");
  }

  async function demitir(id: number) {
    if(confirm("Tem certeza que deseja demitir este funcionário?")) {
      await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
      carregar();
    }
  }

  // NOVA FUNÇÃO: O GERENTE TROCA A SENHA DE QUEM QUISER
  async function trocarSenha(id: number, nomeUser: string) {
    const novaSenha = prompt(`Digite a nova senha para ${nomeUser}:`);
    if (novaSenha) {
      await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ senha: novaSenha })
      });
      alert(`Senha de ${nomeUser} alterada com sucesso!`);
      carregar();
    }
  }

  return (
    <div style={{ padding: 30, background: 'white', borderRadius: 10, maxWidth: 800, margin: '0 auto', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: 10 }}>Gestão de Equipe 👥</h2>
      
      {/* Formulário */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 30, border: '1px solid #e9ecef' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#666' }}>Novo Funcionário</h3>
        <form onSubmit={cadastrar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 5, border: '1px solid #ccc' }} required />
          <input type="password" placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} style={{ width: 100, padding: 10, borderRadius: 5, border: '1px solid #ccc' }} required />
          <select value={cargo} onChange={e=>setCargo(e.target.value)} style={{ padding: 10, borderRadius: 5, border: '1px solid #ccc' }}>
            <option value="VENDEDOR">Vendedor</option>
            <option value="MOTORISTA">Motorista</option>
            <option value="GERENTE">Gerente</option>
          </select>
          <button type="submit" disabled={carregando} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}>
            {carregando ? '...' : '+ CADASTRAR'}
          </button>
        </form>
      </div>

      {/* Lista Segura */}
      <h3 style={{ fontSize: '1rem', color: '#666' }}>Funcionários Ativos ({usuarios.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {usuarios.map(u => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: 8, background: 'white' }}>
            <div>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{u.nome}</span>
              <span style={{ marginLeft: 10, background: u.cargo === 'GERENTE' ? '#2c3e50' : '#e2e8f0', color: u.cargo === 'GERENTE' ? 'white' : '#4a5568', padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem' }}>{u.cargo}</span>
              {/* SENHA ESCONDIDA AQUI 👇 */}
              <div style={{ fontSize: '0.85rem', color: '#a0aec0', marginTop: 3 }}>Senha: ••••••</div>
            </div>
            
            {u.nome !== 'Matheus' && (
              <div style={{ display: 'flex', gap: 10 }}>
                {/* BOTÃO DE TROCAR SENHA (PODER DE GERENTE) */}
                <button 
                  onClick={() => trocarSenha(u.id, u.nome)}
                  style={{ color: '#3182ce', border: '1px solid #bee3f8', background: '#ebf8ff', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}
                >
                  🔑 Trocar Senha
                </button>

                <button 
                  onClick={() => demitir(u.id)}
                  style={{ color: '#e53e3e', border: '1px solid #fed7d7', background: '#fff5f5', padding: '5px 10px', borderRadius: 5, cursor: 'pointer' }}
                >
                  🗑️ Demitir
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}