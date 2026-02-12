import { useState, useEffect } from 'react';

// Ajuste para o seu link do Render se precisar
const API_URL = 'https://api-vila-verde.onrender.com';

export function TelaEquipe() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  // Novos estados para o formulário
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState(''); // <--- NOVO
  const [email, setEmail] = useState('');       // <--- NOVO
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
    if(!nome || !senha || !username) return alert("Preencha Nome, Usuário e Senha!");
    
    setCarregando(true);

    try {
        const res = await fetch(`${API_URL}/usuarios`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          // 👇 Mandando a estrutura nova pro Backend
          body: JSON.stringify({ nome, username, email, senha, cargo })
        });
        
        const data = await res.json();

        if (res.ok) {
            setNome(''); 
            setUsername(''); 
            setEmail('');
            setSenha(''); 
            setCargo('VENDEDOR');
            alert(`✅ ${cargo} cadastrado com sucesso!`);
            carregar(); 
        } else {
            alert(data.erro || "Erro ao cadastrar.");
        }
    } catch (err) {
        alert("Erro de conexão ao cadastrar.");
    } finally {
        setCarregando(false);
    }
  }

  async function demitir(id: string) { // ID agora é string (UUID)
    if(confirm("Tem certeza que deseja remover este funcionário?")) {
      try {
          await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
          carregar();
      } catch (err) {
          alert("Erro ao demitir.");
      }
    }
  }

  // Função extra para resetar senha (se o backend suportar PUT /usuarios/:id)
  // Se não tiver rota de editar senha no backend ainda, isso pode não funcionar,
  // mas deixei aqui caso você implemente depois.

  return (
    <div style={{ padding: 30, background: 'white', borderRadius: 10, maxWidth: 900, margin: '0 auto', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: 10 }}>Gestão de Equipe 👥</h2>
      
      {/* Formulário de Cadastro */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 30, border: '1px solid #e9ecef' }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#666' }}>➕ Novo Membro</h3>
        
        <form onSubmit={cadastrar} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          
          {/* Nome */}
          <div>
              <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#555'}}>Nome Completo</label>
              <input 
                placeholder="Ex: João da Silva" 
                value={nome} 
                onChange={e=>setNome(e.target.value)} 
                style={{ width:'100%', padding: 10, borderRadius: 5, border: '1px solid #ccc', boxSizing:'border-box' }} 
                required 
              />
          </div>

          {/* Username (Login) */}
          <div>
              <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#555'}}>Login (Usuário)</label>
              <input 
                placeholder="Ex: joao.vendas" 
                value={username} 
                onChange={e=>setUsername(e.target.value.toLowerCase().trim())} // Força minúsculo
                style={{ width:'100%', padding: 10, borderRadius: 5, border: '1px solid #ccc', boxSizing:'border-box' }} 
                required 
              />
          </div>

           {/* Email */}
           <div>
              <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#555'}}>E-mail (Opcional)</label>
              <input 
                type="email"
                placeholder="joao@vilaverde.com" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                style={{ width:'100%', padding: 10, borderRadius: 5, border: '1px solid #ccc', boxSizing:'border-box' }} 
              />
          </div>

          {/* Senha */}
          <div>
              <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#555'}}>Senha Inicial</label>
              <input 
                type="password" 
                placeholder="******" 
                value={senha} 
                onChange={e=>setSenha(e.target.value)} 
                style={{ width:'100%', padding: 10, borderRadius: 5, border: '1px solid #ccc', boxSizing:'border-box' }} 
                required 
              />
          </div>

          {/* Cargo */}
          <div style={{ gridColumn: '1 / -1' }}>
             <label style={{fontSize:'0.85rem', fontWeight:'bold', color:'#555'}}>Cargo / Função</label>
             <select 
                value={cargo} 
                onChange={e=>setCargo(e.target.value)} 
                style={{ width:'100%', padding: 10, borderRadius: 5, border: '1px solid #ccc', background:'white' }}
             >
                <option value="VENDEDOR">🛒 VENDEDOR (Acesso Padrão)</option>
                <option value="MOTORISTA">🚚 MOTORISTA (Acesso Entregas)</option>
                <option value="GERENTE">👔 GERENTE (Acesso Total)</option>
             </select>
          </div>

          <button 
            type="submit" 
            disabled={carregando} 
            style={{ 
                gridColumn: '1 / -1',
                background: '#27ae60', 
                color: 'white', 
                border: 'none', 
                padding: '12px', 
                borderRadius: 5, 
                cursor: 'pointer', 
                fontWeight: 'bold',
                marginTop: 10
            }}
          >
            {carregando ? 'Salvando...' : '💾 CADASTRAR FUNCIONÁRIO'}
          </button>
        </form>
      </div>

      {/* Lista de Funcionários */}
      <h3 style={{ fontSize: '1rem', color: '#666' }}>Equipe Atual ({usuarios.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {usuarios.map(u => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: 8, background: 'white' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap: 10}}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2d3748' }}>{u.nome}</span>
                  <span style={{ background: u.cargo === 'GERENTE' ? '#2c3e50' : '#e2e8f0', color: u.cargo === 'GERENTE' ? 'white' : '#4a5568', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight:'bold' }}>
                      {u.cargo}
                  </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#718096', marginTop: 3 }}>
                 Login: <b>{u.username}</b>
              </div>
              {u.email && <div style={{ fontSize: '0.85rem', color: '#a0aec0' }}>{u.email}</div>}
            </div>
            
            {/* Proteção para não excluir o Admin principal */}
            {u.username !== 'admin' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => demitir(u.id)}
                  style={{ color: '#e53e3e', border: '1px solid #fed7d7', background: '#fff5f5', padding: '6px 12px', borderRadius: 5, cursor: 'pointer', display:'flex', alignItems:'center', gap:5 }}
                >
                  🗑️ Remover
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}