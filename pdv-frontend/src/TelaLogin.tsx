import { useState } from 'react'

export function Login({ onLogin }: { onLogin: (dados: any) => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  async function entrar() {
    setErro('') // Limpa erro antigo
    try {
      const resposta = await fetch('https://api-vila-verde.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })

      if (!resposta.ok) {
        throw new Error('Email ou senha incorretos')
      }

      const dados = await resposta.json()
      onLogin(dados) // Avisa o App que logou!

    } catch (e: any) {
      setErro(e.message)
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f0f2f5' 
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '2rem', 
        borderRadius: '10px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1a202c' }}>
          🔒 Acesso Vila Verde
        </h2>

        {erro && <p style={{ color: 'red', textAlign: 'center', marginBottom: '1rem' }}>{erro}</p>}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568' }}>Email</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '5px', border: '1px solid #cbd5e0' }}
            placeholder="admin@vilaverde.com"
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#4a5568' }}>Senha</label>
          <input 
            type="password" 
            value={senha}
            onChange={e => setSenha(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '5px', border: '1px solid #cbd5e0' }}
            placeholder="******"
          />
        </div>

        <button 
          onClick={entrar}
          style={{ 
            width: '100%', 
            padding: '1rem', 
            backgroundColor: '#2b6cb0', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          ENTRAR NO SISTEMA
        </button>
      </div>
    </div>
  )
}