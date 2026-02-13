import { useState, useEffect } from 'react';

const API_URL = 'https://api-vila-verde.onrender.com';

export function TelaEquipe() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cargo, setCargo] = useState('VENDEDOR');
  
  const [carregando, setCarregando] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const res = await fetch(`${API_URL}/usuarios`);
      setUsuarios(await res.json());
    } catch (e) { console.error("Erro conexão"); }
  }

  async function cadastrar(e: any) {
    e.preventDefault();
    if(!nome || !senha || !username) return alert("Preencha Nome, Usuário e Senha!");
    
    setCarregando(true);

    try {
        const res = await fetch(`${API_URL}/usuarios`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
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

  async function demitir(id: string) {
    if(confirm("Tem certeza que deseja remover este funcionário?")) {
      try {
          await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
          carregar();
      } catch (err) {
          alert("Erro ao demitir.");
      }
    }
  }

  return (
    <div style={{ 
      padding: 30, 
      background: 'white', 
      borderRadius: 15, 
      maxWidth: 900, 
      margin: '0 auto', 
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)' 
    }}>
      <h2 style={{ 
        color: '#1e3c72', 
        borderBottom: '2px solid #e2e8f0', 
        paddingBottom: 15,
        marginTop: 0,
        marginBottom: 30
      }}>
        👥 Gestão de Equipe
      </h2>
      
      {/* Formulário de Cadastro */}
      <div style={{ 
        background: '#f8fafc', 
        padding: 25, 
        borderRadius: 12, 
        marginBottom: 30, 
        border: '1px solid #e2e8f0' 
      }}>
        <h3 style={{ 
          marginTop: 0, 
          fontSize: '1.1rem', 
          color: '#64748b',
          marginBottom: 20
        }}>
          ➕ Novo Membro
        </h3>
        
        <form onSubmit={cadastrar} style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 15 
        }}>
          
          {/* Nome */}
          <div>
              <label style={{
                fontSize:'0.9rem', 
                fontWeight:'bold', 
                color:'#475569',
                display: 'block',
                marginBottom: '8px'
              }}>
                Nome Completo
              </label>
              <input 
                placeholder="Ex: João da Silva" 
                value={nome} 
                onChange={e=>setNome(e.target.value)} 
                style={{ 
                  width:'100%', 
                  padding: 12, 
                  borderRadius: 8, 
                  border: '1px solid #cbd5e1', 
                  boxSizing:'border-box',
                  fontSize: '1rem'
                }} 
                required 
              />
          </div>

          {/* Username */}
          <div>
              <label style={{
                fontSize:'0.9rem', 
                fontWeight:'bold', 
                color:'#475569',
                display: 'block',
                marginBottom: '8px'
              }}>
                Login (Usuário)
              </label>
              <input 
                placeholder="Ex: joao.vendas" 
                value={username} 
                onChange={e=>setUsername(e.target.value.toLowerCase().trim())}
                style={{ 
                  width:'100%', 
                  padding: 12, 
                  borderRadius: 8, 
                  border: '1px solid #cbd5e1', 
                  boxSizing:'border-box',
                  fontSize: '1rem'
                }} 
                required 
              />
          </div>

           {/* Email */}
           <div>
              <label style={{
                fontSize:'0.9rem', 
                fontWeight:'bold', 
                color:'#475569',
                display: 'block',
                marginBottom: '8px'
              }}>
                E-mail (Opcional)
              </label>
              <input 
                type="email"
                placeholder="joao@vilaverde.com" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                style={{ 
                  width:'100%', 
                  padding: 12, 
                  borderRadius: 8, 
                  border: '1px solid #cbd5e1', 
                  boxSizing:'border-box',
                  fontSize: '1rem'
                }} 
              />
          </div>

          {/* Senha */}
          <div>
              <label style={{
                fontSize:'0.9rem', 
                fontWeight:'bold', 
                color:'#475569',
                display: 'block',
                marginBottom: '8px'
              }}>
                Senha Inicial
              </label>
              <input 
                type="password" 
                placeholder="******" 
                value={senha} 
                onChange={e=>setSenha(e.target.value)} 
                style={{ 
                  width:'100%', 
                  padding: 12, 
                  borderRadius: 8, 
                  border: '1px solid #cbd5e1', 
                  boxSizing:'border-box',
                  fontSize: '1rem'
                }} 
                required 
              />
          </div>

          {/* Cargo */}
          <div style={{ gridColumn: '1 / -1' }}>
             <label style={{
               fontSize:'0.9rem', 
               fontWeight:'bold', 
               color:'#475569',
               display: 'block',
               marginBottom: '8px'
             }}>
               Cargo / Função
             </label>
             <select 
                value={cargo} 
                onChange={e=>setCargo(e.target.value)} 
                style={{ 
                  width:'100%', 
                  padding: 12, 
                  borderRadius: 8, 
                  border: '1px solid #cbd5e1', 
                  background:'white',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
             >
                <option value="VENDEDOR">🛒 VENDEDOR (Acesso Padrão)</option>
                <option value="MOTORISTA">🚚 MOTORISTA (Acesso Entregas)</option>
                <option value="GERENTE">💼 GERENTE (Acesso Total)</option>
             </select>
          </div>

          <button 
            type="submit" 
            disabled={carregando} 
            style={{ 
                gridColumn: '1 / -1',
                background: 'linear-gradient(135deg, #4ade80, #22c55e)', 
                color: 'white', 
                border: 'none', 
                padding: '14px', 
                borderRadius: 8, 
                cursor: 'pointer', 
                fontWeight: 'bold',
                marginTop: 10,
                fontSize: '1rem',
                opacity: carregando ? 0.7 : 1,
                boxShadow: '0 4px 15px rgba(74, 222, 128, 0.3)'
            }}
          >
            {carregando ? 'Salvando...' : '💾 CADASTRAR FUNCIONÁRIO'}
          </button>
        </form>
      </div>

      {/* Lista de Funcionários */}
      <h3 style={{ 
        fontSize: '1.1rem', 
        color: '#64748b',
        marginBottom: 15
      }}>
        Equipe Atual ({usuarios.length})
      </h3>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12 
      }}>
        {usuarios.map(u => (
          <div 
            key={u.id} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '18px', 
              border: '1px solid #e2e8f0', 
              borderRadius: 10, 
              background: '#fafafa',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.borderColor = '#e2e8f0'
            }}
          >
            <div>
              <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8}}>
                  <span style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold', 
                    color: '#1e293b' 
                  }}>
                    {u.nome}
                  </span>
                  <span style={{ 
                    background: u.cargo === 'GERENTE' ? '#1e3c72' : u.cargo === 'MOTORISTA' ? '#0ea5e9' : '#64748b', 
                    color: 'white', 
                    padding: '4px 12px', 
                    borderRadius: 15, 
                    fontSize: '0.75rem', 
                    fontWeight:'bold' 
                  }}>
                      {u.cargo}
                  </span>
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#64748b', 
                marginBottom: 3 
              }}>
                 Login: <b>{u.username}</b>
              </div>
              {u.email && (
                <div style={{ 
                  fontSize: '0.85rem', 
                  color: '#94a3b8' 
                }}>
                  📧 {u.email}
                </div>
              )}
            </div>
            
            {/* Proteção para não excluir o Admin principal */}
            {u.username !== 'admin' && (
              <button 
                onClick={() => demitir(u.id)}
                style={{ 
                  color: '#dc2626', 
                  border: '1px solid #fecaca', 
                  background: '#fef2f2', 
                  padding: '8px 16px', 
                  borderRadius: 8, 
                  cursor: 'pointer', 
                  display:'flex', 
                  alignItems:'center', 
                  gap: 6,
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fef2f2'
                }}
              >
                🗑️ Remover
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
