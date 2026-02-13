import { useState } from 'react';

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Segoe UI', sans-serif",
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
  },
  ladoEsquerdo: {
    flex: 1.2,
    background: 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    color: 'white',
    flexDirection: 'column' as const,
    borderRight: '1px solid rgba(255,255,255,0.1)'
  },
  ladoDireito: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)'
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    padding: '40px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '15px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  },
  logoGrande: {
    width: '350px',
    maxWidth: '80%',
    height: 'auto',
    objectFit: 'contain' as const,
    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))'
  },
  logoMobile: {
    width: '150px',
    marginBottom: '20px',
    display: 'none'
  },
  titulo: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'white',
    marginBottom: '10px',
    textAlign: 'center' as const,
  },
  subtitulo: {
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: '20px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'white',
    transition: 'all 0.2s'
  },
  botao: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '10px',
    boxShadow: '0 4px 15px rgba(74, 222, 128, 0.3)'
  },
  erro: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center' as const,
    fontSize: '0.9rem',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  }
};

interface Props {
  onLoginSucesso: (usuario: any) => void;
}

export function TelaLogin({ onLoginSucesso }: Props) {
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const API_URL = 'https://api-vila-verde.onrender.com'; 

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
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
      {/* LADO ESQUERDO (ESCURO) */}
      <div className="hidden md:flex" style={styles.ladoEsquerdo}>
         {/* Logo */}
         <div style={{ 
           width: '120px', 
           height: '120px', 
           background: '#4ade80', 
           borderRadius: '20px',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           fontWeight: 'bold',
           fontSize: '3rem',
           color: '#1a1a1a',
           marginBottom: '30px',
           boxShadow: '0 10px 30px rgba(74, 222, 128, 0.3)'
         }}>
           VV
         </div>
         
         <h1 style={{ 
           fontSize: '2.5rem', 
           fontWeight: '800', 
           marginBottom: '15px',
           background: 'linear-gradient(135deg, #4ade80, #22c55e)',
           WebkitBackgroundClip: 'text',
           WebkitTextFillColor: 'transparent',
           backgroundClip: 'text'
         }}>
           PDV Vila Verde
         </h1>
         
         <p style={{
           opacity: 0.8, 
           fontSize: '1.2rem', 
           fontWeight: 500,
           color: '#9ca3af'
         }}>
            Gestão Profissional
         </p>
      </div>

      {/* LADO DIREITO (FORMULÁRIO) */}
      <div style={styles.ladoDireito}>
        <div style={styles.card}>
          
          {/* Logo mobile */}
          <div className="show-mobile-only" style={{textAlign: 'center', marginBottom: '30px'}}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: '#4ade80', 
              borderRadius: '15px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '2rem',
              color: '#1a1a1a',
              marginBottom: '15px'
            }}>
              VV
            </div>
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
                onChange={e => setUsername(e.target.value)}
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
              {loading ? 'Entrando...' : '🔓 ACESSAR SISTEMA'}
            </button>
          </form>
        </div>
      </div>

      {/* CSS para responsividade */}
      <style>{`
        .show-mobile-only { display: none; }

        @media (max-width: 768px) {
          .hidden.md\\:flex { display: none !important; }
          .show-mobile-only { display: block; }
        }
        
        input:focus { 
          border-color: #4ade80 !important; 
          box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
