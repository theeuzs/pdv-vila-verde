import { useState } from 'react';

// Estilos
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: '#f1f5f9',
  },
  ladoEsquerdo: {
    flex: 1,
    background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', // Verde Vila Verde
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    color: 'white',
    flexDirection: 'column' as const
  },
  ladoDireito: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#ffffff'
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    padding: '40px',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '30px'
  },
  logoImage: {
    width: '180px',     // Tamanho da logo
    height: 'auto',
    objectFit: 'contain' as const
  },
  titulo: {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '10px',
    textAlign: 'center' as const,
  },
  subtitulo: {
    color: '#64748b',
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '20px',
    backgroundColor: '#f8fafc',
    transition: 'border 0.2s'
  },
  botao: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#166534', // Verde escuro da marca
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: '10px',
  },
  erro: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    textAlign: 'center' as const,
    fontSize: '0.9rem',
    border: '1px solid #fecaca',
  }
};

interface Props {
  onLoginSucesso: (usuario: any) => void;
}

export function TelaLogin({ onLoginSucesso }: Props) {
  // 👇 AGORA USAMOS USERNAME
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // 👇 CONFIRME SE A URL DO SEU BACKEND ESTÁ CERTA AQUI
  const API_URL = 'https://api-vila-verde.onrender.com'; 

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      // 👇 Manda username e senha para a rota /login
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, senha })
      });

      const data = await res.json();

      if (res.ok) {
        onLoginSucesso(data);
      } else {
        setErro(data.erro || 'Usuário ou senha incorretos.');
      }
    } catch (error) {
      setErro('Erro de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* LADO ESQUERDO: DECORATIVO (Some no celular) */}
      <div className="hidden md:flex" style={styles.ladoEsquerdo}>
         <h1 style={{fontSize: '3rem', margin: 0}}>🏗️</h1>
         <h1 style={{fontSize: '2.5rem', fontWeight: 800, marginTop: 10}}>Vila Verde</h1>
         <p style={{opacity: 0.9, fontSize: '1.2rem'}}>Gestão Profissional</p>
      </div>

      {/* LADO DIREITO: FORMULÁRIO */}
      <div style={styles.ladoDireito}>
        <div style={styles.card}>
          
          {/* 👇 AQUI VAI APARECER A SUA LOGO */}
          <div style={styles.logoContainer}>
             <img src="/logo.jpg" alt="Logo Vila Verde" style={styles.logoImage} />
          </div>

          <div style={styles.titulo}>Bem-vindo!</div>
          <div style={styles.subtitulo}>Insira suas credenciais para acessar.</div>

          {erro && <div style={styles.erro}>{erro}</div>}

          <form onSubmit={handleLogin}>
            <div>
              <label style={styles.label}>Usuário</label>
              <input 
                type="text" 
                placeholder="Ex: admin" 
                value={username}
                onChange={e => setUsername(e.target.value)} // Remove espaços
                style={styles.input}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={styles.label}>Senha</label>
              <input 
                type="password" 
                placeholder="••••••" 
                value={senha}
                onChange={e => setSenha(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <button 
              type="submit" 
              style={{...styles.botao, opacity: loading ? 0.7 : 1}}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'ACESSAR SISTEMA 🔐'}
            </button>
          </form>
        </div>
      </div>

      {/* CSS para responsividade */}
      <style>{`
        @media (max-width: 768px) {
          .hidden.md\\:flex { display: none !important; }
        }
        input:focus { border-color: #166534 !important; border-width: 2px; }
      `}</style>
    </div>
  );
}