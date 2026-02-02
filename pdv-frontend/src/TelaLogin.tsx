import { useState } from 'react';

// Define o que a tela de login espera receber (uma função para avisar que logou)
interface Props {
  onLoginSucesso: (usuario: any) => void;
}

export function TelaLogin({ onLoginSucesso }: Props) {
  const [cargoSelecionado, setCargoSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const API_URL = 'https://api-vila-verde.onrender.com'; // Ajuste se seu backend estiver em outra porta

  async function tentarLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          senha,
          cargo: cargoSelecionado
        })
      });

      if (response.ok) {
        const usuario = await response.json();
        onLoginSucesso(usuario); // Avisa o App.tsx que deu certo!
      } else {
        setErro('Nome ou senha incorretos!');
      }
    } catch (err) {
      setErro('Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  }

  // --- TELA 1: SELEÇÃO DE CARGO ---
  if (!cargoSelecionado) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={{ color: '#2c3e50', marginBottom: '30px' }}>Quem está acessando? 🔐</h1>
          
          <div style={styles.gridBotoes}>
            {/* Botão GERENTE */}
            <button onClick={() => setCargoSelecionado('GERENTE')} style={{ ...styles.botaoCargo, backgroundColor: '#2c3e50' }}>
              <span style={{ fontSize: '40px' }}>👔</span>
              <span style={styles.textoBotao}>GERENTE</span>
            </button>

            {/* Botão VENDEDOR */}
            <button onClick={() => setCargoSelecionado('VENDEDOR')} style={{ ...styles.botaoCargo, backgroundColor: '#27ae60' }}>
              <span style={{ fontSize: '40px' }}>🛒</span>
              <span style={styles.textoBotao}>VENDEDOR</span>
            </button>

            {/* Botão MOTORISTA */}
            <button onClick={() => setCargoSelecionado('MOTORISTA')} style={{ ...styles.botaoCargo, backgroundColor: '#e67e22' }}>
              <span style={{ fontSize: '40px' }}>🚚</span>
              <span style={styles.textoBotao}>MOTORISTA</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA 2: FORMULÁRIO DE SENHA ---
  return (
    <div style={styles.container}>
      <div style={{ ...styles.card, maxWidth: '400px' }}>
        <button onClick={() => { setCargoSelecionado(null); setErro(''); }} style={styles.botaoVoltar}>
          ⬅ Voltar
        </button>

        <h2 style={{ color: '#333' }}>Login de {cargoSelecionado}</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>Insira suas credenciais</p>

        <form onSubmit={tentarLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <input
            type="text"
            placeholder="Seu Nome (ex: Matheus)"
            value={nome}
            onChange={e => setNome(e.target.value)}
            style={styles.input}
            autoFocus
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            style={styles.input}
          />

          {erro && <div style={{ color: 'red', fontSize: '0.9rem', textAlign: 'center' }}>{erro}</div>}

          <button type="submit" disabled={carregando} style={styles.botaoEntrar}>
            {carregando ? 'Verificando...' : 'ENTRAR NO SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos CSS simples dentro do JS
const styles: any = {
  container: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    fontFamily: 'Arial, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    textAlign: 'center',
    width: '90%',
    maxWidth: '800px'
  },
  gridBotoes: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  botaoCargo: {
    border: 'none',
    borderRadius: '15px',
    padding: '20px',
    width: '180px',
    height: '180px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'transform 0.2s',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
  },
  textoBotao: {
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  input: {
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    outline: 'none'
  },
  botaoEntrar: {
    padding: '15px',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px'
  },
  botaoVoltar: {
    background: 'transparent',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    marginBottom: '20px',
    alignSelf: 'flex-start',
    display: 'block'
  }
};