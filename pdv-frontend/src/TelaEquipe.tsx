import { useState, useEffect } from 'react';

// SEU LINK DO RENDER AQUI:
const API_URL = 'https://api-vila-verde.onrender.com';

export function TelaEquipe() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [cargo, setCargo] = useState('VENDEDOR');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const res = await fetch(`${API_URL}/usuarios`);
    setUsuarios(await res.json());
  }

  async function cadastrar(e: any) {
    e.preventDefault();
    await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ nome, senha, cargo })
    });
    setNome(''); setSenha(''); carregar(); alert("Cadastrado!");
  }

  async function demitir(id: number) {
    if(confirm("Tem certeza?")) {
      await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
      carregar();
    }
  }

  return (
    <div style={{ padding: 30, background: 'white', borderRadius: 10, maxWidth: 600, margin: '20px auto' }}>
      <h2 style={{ color: '#2c3e50' }}>Gestão de Equipe 👥</h2>
      
      {/* Formulário */}
      <form onSubmit={cadastrar} style={{ display: 'flex', gap: 10, marginBottom: 20, background: '#f8f9fa', padding: 15, borderRadius: 8 }}>
        <input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc' }} required />
        <input placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} style={{ padding: 8, borderRadius: 5, border: '1px solid #ccc' }} required />
        <select value={cargo} onChange={e=>setCargo(e.target.value)} style={{ padding: 8, borderRadius: 5 }}>
          <option value="VENDEDOR">Vendedor</option>
          <option value="MOTORISTA">Motorista</option>
          <option value="GERENTE">Gerente</option>
        </select>
        <button type="submit" style={{ background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: 5, cursor: 'pointer' }}>+ Add</button>
      </form>

      {/* Lista */}
      <div>
        {usuarios.map(u => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
            <div>
              <strong>{u.nome}</strong> <small>({u.cargo})</small> - Senha: {u.senha}
            </div>
            {u.cargo !== 'GERENTE' && (
              <button onClick={() => demitir(u.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>🗑️ Demitir</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}