import { useState } from 'react';

// Estilos (CSS-in-JS simples)
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: "'Segoe UI', sans-serif",
    backgroundColor: '#f3f4f6',
  },
  ladoEsquerdo: {
    flex: 1,
    background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    padding: '40px',
  },
  ladoDireito: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
  },
  titulo: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: '10px',
    textAlign: 'center' as const,
  },
  subtitulo: {
    color: '#718096',
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  botao: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '10px',
  },
  erro: {
    backgroundColor: '#fff5f5',
    color: '#c53030',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '20px',
    textAlign: 'center' as const,
    fontSize: '0.9rem',
    border: '1px solid #feb2b2',
  }
};

interface Props {
  onLoginSucesso: (usuario: any) => void;
}

export function TelaLogin({ onLoginSucesso }: Props) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const API_URL = 'https://api-vila-verde.onrender.com'; // Ou seu localhost

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      const data = await res.json();

      if (res.ok) {
        onLoginSucesso(data);
      } else {
        setErro(data.erro || 'Falha ao entrar');
      }
    } catch (error) {
      setErro('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* LADO ESQUERDO: BRANDING (Só aparece em telas maiores que mobile) */}
      <div className="hidden md:flex" style={styles.ladoEsquerdo}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🏗️</div>
        <h1 style={{ fontSize: '3rem', margin: 0, fontWeight: 900 }}>Vila Verde</h1>
        <p style={{ opacity: 0.8, fontSize: '1.2rem', marginTop: '10px' }}>Sistema de Gestão & PDV</p>
      </div>

      {/* LADO DIREITO: FORMULÁRIO */}
      <div style={styles.ladoDireito}>
        <div style={styles.card}>
          <div style={styles.titulo}>Bem-vindo! 👋</div>
          <div style={styles.subtitulo}>Digite suas credenciais para acessar.</div>

          {erro && <div style={styles.erro}>{erro}</div>}

          <form onSubmit={handleLogin}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>E-mail</label>
              <input 
                type="email" 
                placeholder="ex: admin@vilaverde.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Senha</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={senha}
                onChange={e => setSenha(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <button 
              type="submit" 
              style={{...styles.botao, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer'}}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'ACESSAR SISTEMA 🔐'}
            </button>
          </form>

          <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.8rem', color: '#a0aec0' }}>
            Esqueceu a senha? Chame o suporte (Matheus).
          </div>
        </div>
      </div>

      {/* CSS RESPONSIVO PARA ESCONDER O LADO ESQUERDO NO MOBILE */}
      <style>{`
        @media (max-width: 768px) {
          .hidden.md\\:flex { display: none !important; }
        }
      `}</style>
    </div>
  );
}