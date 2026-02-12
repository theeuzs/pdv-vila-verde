import { useState, useEffect } from 'react';

const API_URL = 'https://api-vila-verde.onrender.com';

interface Usuario {
  id: string;
  nome: string;
  username: string;
  email?: string;
  cargo: string;
}

interface TelaEquipeProps {
  usuario: any;
  onLogout: () => void;
}

export function TelaEquipe({ usuario, onLogout }: TelaEquipeProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [cargo, setCargo] = useState('VENDEDOR');
  
  const [carregando, setCarregando] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { 
    carregar(); 
  }, []);

  async function carregar() {
    try {
      const res = await fetch(`${API_URL}/usuarios`);
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (e) { 
      console.error("Erro ao carregar usuários:", e); 
    }
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome || !senha || !username) {
      alert("Preencha Nome, Usuário e Senha!");
      return;
    }
    
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
        setShowForm(false);
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
    if (confirm("Tem certeza que deseja remover este funcionário?")) {
      try {
        const res = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
        if (res.ok) {
          alert('✅ Funcionário removido com sucesso!');
          carregar();
        } else {
          alert('Erro ao remover funcionário.');
        }
      } catch (err) {
        alert("Erro ao demitir.");
      }
    }
  }

  function getCargoIcon(cargo: string) {
    const icons: any = {
      'VENDEDOR': '🛒',
      'MOTORISTA': '🚚',
      'GERENTE': '👔',
      'ADMIN': '👑'
    };
    return icons[cargo] || '👤';
  }

  function getCargoColor(cargo: string) {
    const colors: any = {
      'VENDEDOR': '#3b82f6',
      'MOTORISTA': '#f59e0b',
      'GERENTE': '#8b5cf6',
      'ADMIN': '#ef4444'
    };
    return colors[cargo] || '#64748b';
  }

  return (
    <>
      <div style={styles.container}>
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.logoSmall}>VV</div>
            <div style={styles.headerInfo}>
              <h1 style={styles.headerTitle}>Gestão de Equipe</h1>
              <p style={styles.headerSubtitle}>Painel de Administração</p>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.userBadge}>
              <span style={styles.userIcon}>👤</span>
              <span style={styles.userName}>{usuario?.nome}</span>
            </div>
            <button style={styles.btnLogout} onClick={onLogout}>
              🚪 Sair
            </button>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main style={styles.main}>
          <div style={styles.contentWrapper}>
            
            {/* STATS CARDS */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}}>
                  👥
                </div>
                <div style={styles.statInfo}>
                  <div style={styles.statLabel}>Total de Funcionários</div>
                  <div style={styles.statValue}>{usuarios.length}</div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                  🛒
                </div>
                <div style={styles.statInfo}>
                  <div style={styles.statLabel}>Vendedores</div>
                  <div style={styles.statValue}>
                    {usuarios.filter(u => u.cargo === 'VENDEDOR').length}
                  </div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                  🚚
                </div>
                <div style={styles.statInfo}>
                  <div style={styles.statLabel}>Motoristas</div>
                  <div style={styles.statValue}>
                    {usuarios.filter(u => u.cargo === 'MOTORISTA').length}
                  </div>
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={{...styles.statIcon, background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}>
                  👔
                </div>
                <div style={styles.statInfo}>
                  <div style={styles.statLabel}>Gerentes</div>
                  <div style={styles.statValue}>
                    {usuarios.filter(u => u.cargo === 'GERENTE').length}
                  </div>
                </div>
              </div>
            </div>

            {/* AÇÕES */}
            <div style={styles.actionsBar}>
              <button 
                style={styles.btnAddMember}
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? '❌ Cancelar' : '➕ Adicionar Funcionário'}
              </button>
            </div>

            {/* FORMULÁRIO DE CADASTRO */}
            {showForm && (
              <div style={styles.formCard}>
                <div style={styles.formHeader}>
                  <h3 style={styles.formTitle}>➕ Novo Membro da Equipe</h3>
                  <p style={styles.formSubtitle}>Preencha os dados do novo funcionário</p>
                </div>

                <form onSubmit={cadastrar} style={styles.equipeForm}>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span style={styles.labelIcon}>👤</span>
                        Nome Completo
                      </label>
                      <input 
                        style={styles.formInput}
                        placeholder="Ex: João da Silva" 
                        value={nome} 
                        onChange={e => setNome(e.target.value)} 
                        required 
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span style={styles.labelIcon}>🔑</span>
                        Login (Usuário)
                      </label>
                      <input 
                        style={styles.formInput}
                        placeholder="Ex: joao.vendas" 
                        value={username} 
                        onChange={e => setUsername(e.target.value.toLowerCase().trim())}
                        required 
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span style={styles.labelIcon}>📧</span>
                        E-mail (Opcional)
                      </label>
                      <input 
                        type="email"
                        style={styles.formInput}
                        placeholder="joao@vilaverde.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>
                        <span style={styles.labelIcon}>🔒</span>
                        Senha Inicial
                      </label>
                      <input 
                        type="password" 
                        style={styles.formInput}
                        placeholder="Mínimo 6 caracteres" 
                        value={senha} 
                        onChange={e => setSenha(e.target.value)}
                        required 
                      />
                    </div>

                    <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                      <label style={styles.formLabel}>
                        <span style={styles.labelIcon}>💼</span>
                        Cargo / Função
                      </label>
                      <select 
                        style={styles.formSelect}
                        value={cargo} 
                        onChange={e => setCargo(e.target.value)}
                      >
                        <option value="VENDEDOR">🛒 VENDEDOR (Acesso Padrão)</option>
                        <option value="MOTORISTA">🚚 MOTORISTA (Acesso Entregas)</option>
                        <option value="GERENTE">👔 GERENTE (Acesso Total)</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={carregando} 
                    style={{
                      ...styles.btnSubmit,
                      opacity: carregando ? 0.7 : 1,
                      cursor: carregando ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {carregando ? (
                      <>
                        <span style={styles.spinner}></span>
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        💾 CADASTRAR FUNCIONÁRIO
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* LISTA DE FUNCIONÁRIOS */}
            <div style={styles.teamSection}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  👥 Equipe Atual
                  <span style={styles.teamCount}>{usuarios.length} {usuarios.length === 1 ? 'membro' : 'membros'}</span>
                </h3>
              </div>

              <div style={styles.teamGrid}>
                {usuarios.map(u => (
                  <div key={u.id} style={styles.memberCard}>
                    <div style={styles.memberHeader}>
                      <div style={{...styles.memberAvatar, background: getCargoColor(u.cargo)}}>
                        {getCargoIcon(u.cargo)}
                      </div>
                      <div style={styles.memberInfo}>
                        <h4 style={styles.memberName}>{u.nome}</h4>
                        <div style={styles.memberUsername}>@{u.username}</div>
                      </div>
                    </div>

                    <div style={styles.memberDetails}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Cargo:</span>
                        <span 
                          style={{
                            ...styles.cargoBadge,
                            background: `${getCargoColor(u.cargo)}20`,
                            color: getCargoColor(u.cargo),
                            border: `1px solid ${getCargoColor(u.cargo)}40`
                          }}
                        >
                          {u.cargo}
                        </span>
                      </div>
                      {u.email && (
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Email:</span>
                          <span style={styles.detailValue}>{u.email}</span>
                        </div>
                      )}
                    </div>

                    {u.username !== 'admin' && (
                      <div style={styles.memberActions}>
                        <button 
                          style={styles.btnDelete}
                          onClick={() => demitir(u.id)}
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    )}

                    {u.username === 'admin' && (
                      <div style={styles.adminBadge}>
                        👑 Administrador Principal
                      </div>
                    )}
                  </div>
                ))}

                {usuarios.length === 0 && (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>👥</div>
                    <p style={styles.emptyTitle}>Nenhum funcionário cadastrado</p>
                    <p style={styles.emptySubtitle}>Clique em "Adicionar Funcionário" para começar</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          /* Responsividade mobile */
        }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
    padding: '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logoSmall: {
    width: '50px',
    height: '50px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800 as const,
    fontSize: '1.3rem',
    color: 'white',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column' as const
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: 700 as const,
    color: 'white',
    margin: 0,
    lineHeight: 1.2
  },
  headerSubtitle: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  userIcon: {
    fontSize: '1.2rem'
  },
  userName: {
    color: 'white',
    fontWeight: 600 as const,
    fontSize: '0.95rem'
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
  main: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  statCard: {
    background: '#1e293b',
    padding: '1.5rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s',
    border: '2px solid transparent'
  },
  statIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  statInfo: {
    flex: 1
  },
  statLabel: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginBottom: '0.3rem',
    fontWeight: 600 as const
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 800 as const,
    color: '#e2e8f0'
  },
  actionsBar: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '1rem'
  },
  btnAddMember: {
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontWeight: 700 as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '1rem',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },
  formCard: {
    background: '#1e293b',
    borderRadius: '15px',
    padding: '2rem',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
    border: '2px solid #334155',
    animation: 'slideDown 0.3s ease-out'
  },
  formHeader: {
    marginBottom: '2rem',
    textAlign: 'center' as const
  },
  formTitle: {
    fontSize: '1.5rem',
    fontWeight: 700 as const,
    color: '#e2e8f0',
    margin: '0 0 0.5rem 0'
  },
  formSubtitle: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '0.95rem'
  },
  equipeForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  formLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 600 as const,
    color: '#94a3b8'
  },
  labelIcon: {
    fontSize: '1rem'
  },
  formInput: {
    width: '100%',
    padding: '0.9rem 1rem',
    background: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '1rem',
    transition: 'all 0.3s',
    boxSizing: 'border-box' as const,
    outline: 'none'
  },
  formSelect: {
    width: '100%',
    padding: '0.9rem 1rem',
    background: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '1rem',
    transition: 'all 0.3s',
    boxSizing: 'border-box' as const,
    cursor: 'pointer'
  },
  btnSubmit: {
    width: '100%',
    padding: '1.2rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontWeight: 700 as const,
    transition: 'all 0.3s',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    marginTop: '0.5rem'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block'
  },
  teamSection: {
    background: '#1e293b',
    borderRadius: '15px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)'
  },
  sectionHeader: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 700 as const,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: 0
  },
  teamCount: {
    fontSize: '0.9rem',
    fontWeight: 600 as const,
    color: '#94a3b8',
    background: '#0f172a',
    padding: '0.3rem 0.8rem',
    borderRadius: '20px'
  },
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  memberCard: {
    background: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '2px solid transparent',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  memberAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: '1.1rem',
    fontWeight: 700 as const,
    color: '#e2e8f0',
    margin: '0 0 0.3rem 0'
  },
  memberUsername: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    fontWeight: 500 as const
  },
  memberDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    padding: '1rem',
    background: '#0f172a',
    borderRadius: '8px'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.9rem'
  },
  detailLabel: {
    color: '#64748b',
    fontWeight: 600 as const
  },
  detailValue: {
    color: '#94a3b8'
  },
  cargoBadge: {
    padding: '0.3rem 0.8rem',
    borderRadius: '6px',
    fontWeight: 600 as const,
    fontSize: '0.8rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },
  memberActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  btnDelete: {
    flex: 1,
    padding: '0.7rem 1rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    color: '#fca5a5',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '0.9rem'
  },
  adminBadge: {
    padding: '0.8rem',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    borderRadius: '8px',
    textAlign: 'center' as const,
    color: '#78350f',
    fontWeight: 700 as const,
    fontSize: '0.9rem',
    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '5rem',
    marginBottom: '1rem',
    opacity: 0.3
  },
  emptyTitle: {
    fontSize: '1.3rem',
    fontWeight: 600 as const,
    color: '#94a3b8',
    margin: '0 0 0.5rem 0'
  },
  emptySubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0
  }
};
