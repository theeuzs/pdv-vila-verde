import { useState } from 'react';

interface Props {
  onLogin: (usuario: any) => void;
}

export function TelaLogin({ onLogin }: Props) {
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
        onLogin(data);
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
    <>
      <div style={styles.container}>
        {/* LADO ESQUERDO - VERDE COM LOGO */}
        <div style={styles.leftSide} className="login-left">
          <div style={styles.logoContainer}>
            <div style={styles.logoCircle}>
              <span style={styles.logoText}>VV</span>
            </div>
            <h1 style={styles.brandName}>PDV Vila Verde</h1>
            <p style={styles.brandSubtitle}>Gestão Profissional & Moderna</p>
          </div>

          {/* Features */}
          <div style={styles.featuresList}>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>🛒</span>
              <span style={styles.featureText}>PDV Completo</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>📊</span>
              <span style={styles.featureText}>Relatórios em Tempo Real</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>💳</span>
              <span style={styles.featureText}>Múltiplas Formas de Pagamento</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.featureIcon}>📱</span>
              <span style={styles.featureText}>Gestão de Entregas</span>
            </div>
          </div>
        </div>

        {/* LADO DIREITO - FORMULÁRIO */}
        <div style={styles.rightSide}>
          <div style={styles.loginCard}>
            {/* Logo mobile */}
            <div style={styles.mobileLogo} className="mobile-logo">
              <div style={styles.logoCircleSmall}>VV</div>
              <h2 style={styles.mobileBrand}>PDV Vila Verde</h2>
            </div>

            <div style={styles.loginHeader}>
              <h2 style={styles.loginTitle}>Bem-vindo de volta! 👋</h2>
              <p style={styles.loginSubtitle}>Entre com suas credenciais para acessar o sistema</p>
            </div>

            {erro && (
              <div style={styles.errorMessage}>
                <span style={styles.errorIcon}>⚠️</span>
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={styles.loginForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <span style={styles.labelIcon}>👤</span>
                  Usuário
                </label>
                <input 
                  type="text" 
                  style={styles.formInput}
                  placeholder="Digite seu usuário" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <span style={styles.labelIcon}>🔒</span>
                  Senha
                </label>
                <input 
                  type="password" 
                  style={styles.formInput}
                  placeholder="Digite sua senha" 
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                style={{
                  ...styles.loginButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span style={styles.spinner}></span>
                    Entrando...
                  </>
                ) : (
                  <>
                    <span>ACESSAR SISTEMA</span>
                    <span style={styles.buttonIcon}>🚀</span>
                  </>
                )}
              </button>
            </form>

            <div style={styles.loginFooter}>
              <p style={styles.footerText}>
                💡 <strong>Dica:</strong> Mantenha suas credenciais seguras
              </p>
            </div>
          </div>

          {/* Versão do sistema */}
          <div style={styles.systemVersion}>
            PDV Vila Verde v2.0 • 2026
          </div>
        </div>
      </div>

      {/* CSS de Animações e Responsividade */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .login-left {
          animation: none;
        }

        .mobile-logo {
          display: none;
        }

        @media (max-width: 768px) {
          .login-left {
            display: none !important;
          }
          .mobile-logo {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: '#0f172a'
  },
  leftSide: {
    flex: 1.2,
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '3rem',
    position: 'relative' as const,
    overflow: 'hidden'
  },
  logoContainer: {
    textAlign: 'center' as const,
    zIndex: 2,
    marginBottom: '3rem'
  },
  logoCircle: {
    width: '120px',
    height: '120px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
    animation: 'float 3s ease-in-out infinite'
  },
  logoText: {
    fontSize: '3rem',
    fontWeight: 800 as const,
    color: 'white',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
  },
  brandName: {
    fontSize: '2.5rem',
    fontWeight: 800 as const,
    color: 'white',
    margin: '0 0 0.5rem 0',
    textShadow: '0 2px 20px rgba(0, 0, 0, 0.2)'
  },
  brandSubtitle: {
    fontSize: '1.2rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 500 as const,
    margin: 0
  },
  featuresList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
    zIndex: 2,
    maxWidth: '400px'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '1rem 1.5rem',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s'
  },
  featureIcon: {
    fontSize: '1.8rem'
  },
  featureText: {
    color: 'white',
    fontWeight: 600 as const,
    fontSize: '1rem'
  },
  rightSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
  },
  mobileLogo: {
    textAlign: 'center' as const,
    marginBottom: '2rem'
  },
  logoCircleSmall: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    fontSize: '2rem',
    fontWeight: 800 as const,
    color: 'white',
    boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
  },
  mobileBrand: {
    fontSize: '1.8rem',
    fontWeight: 700 as const,
    color: '#e2e8f0',
    margin: 0
  },
  loginCard: {
    width: '100%',
    maxWidth: '450px',
    background: '#1e293b',
    padding: '3rem',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
  },
  loginHeader: {
    textAlign: 'center' as const,
    marginBottom: '2rem'
  },
  loginTitle: {
    fontSize: '2rem',
    fontWeight: 800 as const,
    color: '#e2e8f0',
    margin: '0 0 0.5rem 0'
  },
  loginSubtitle: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    margin: 0
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '2px solid #ef4444',
    color: '#fca5a5',
    padding: '1rem',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    animation: 'shake 0.5s'
  },
  errorIcon: {
    fontSize: '1.2rem'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column' as const,
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
    padding: '1rem 1.25rem',
    background: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '1rem',
    transition: 'all 0.3s',
    boxSizing: 'border-box' as const,
    outline: 'none'
  },
  loginButton: {
    width: '100%',
    padding: '1.2rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 700 as const,
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
  },
  buttonIcon: {
    fontSize: '1.2rem'
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
  loginFooter: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #334155',
    textAlign: 'center' as const
  },
  footerText: {
    color: '#64748b',
    fontSize: '0.85rem',
    margin: 0
  },
  systemVersion: {
    marginTop: '2rem',
    textAlign: 'center' as const,
    color: '#475569',
    fontSize: '0.8rem'
  }
};
