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
    flex: 1.2, // Aumentei um pouco o lado verde pra logo caber bem
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
  // 👇 Estilo novo para a logo no lado verde
  logoGrande: {
    width: '350px',     // Bem grande
    maxWidth: '80%',
    height: 'auto',
    objectFit: 'contain' as const,
    filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.2))' // Sombra pra destacar no verde
  },
  // 👇 Logo mobile (só aparece no celular)
  logoMobile: {
    width: '150px',
    marginBottom: '20px',
    display: 'none' // Por padrão escondida, media query ativa ela
  },
  titulo: {
    fontSize: '2rem',
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
    backgroundColor: '#166534',
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
      {/* 🟩 LADO ESQUERDO (VERDE) 
          Agora a logo está aqui!
      */}
      <div className="hidden md:flex" style={styles.ladoEsquerdo}>
         {/* 👇 SUA LOGO AQUI */}
         <img src="/logo.jpg" alt="Logo Vila Verde" style={styles.logoGrande} />
         
         <p style={{opacity: 0.9, fontSize: '1.4rem', marginTop: '20px', fontWeight: 600}}>
            Gestão Profissional
         </p>
      </div>

      {/* ⬜ LADO DIREITO (BRANCO) */}
      <div style={styles.ladoDireito}>
        <div style={styles.card}>
          
          {/* Logo só aparece aqui se for Celular (Mobile) */}
          <div className="show-mobile-only" style={{textAlign: 'center'}}>
            <img src="/logo.jpg" alt="Logo" style={{width: '120px', marginBottom: 20}} />
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
              {loading ? 'Entrando...' : 'ACESSAR SISTEMA 🔐'}
            </button>
          </form>
        </div>
      </div>

      {/* CSS para responsividade e ajustes finos */}
      <style>{`
        /* No computador, esconde a logo mobile */
        .show-mobile-only { display: none; }

        @media (max-width: 768px) {
          /* No celular, esconde o lado verde */
          .hidden.md\\:flex { display: none !important; }
          /* No celular, mostra a logo pequena em cima do form */
          .show-mobile-only { display: block; }
        }
        input:focus { border-color: #166534 !important; border-width: 2px; }
      `}</style>
    </div>
  );
}