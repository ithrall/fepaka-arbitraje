import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [escudo, setEscudo] = useState(localStorage.getItem('fepaka_escudo') || null)
  const nav = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('fepaka_token', data.token)
      localStorage.setItem('fepaka_user', JSON.stringify(data.user))
      nav(data.user.rol === 'admin' ? '/admin' : '/evaluar')
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión')
    } finally { setLoading(false) }
  }

  function handleEscudo(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setEscudo(ev.target.result)
      localStorage.setItem('fepaka_escudo', ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <label className="login-escudo" title="Haz clic para subir el escudo">
            {escudo
              ? <img src={escudo} alt="Escudo" />
              : <span style={{fontSize:11,color:'rgba(255,255,255,.3)',textAlign:'center',padding:8}}>🛡️<br/>Subir escudo</span>
            }
            <input type="file" accept="image/*" onChange={handleEscudo} style={{display:'none'}} />
          </label>
          <h1>FEPAKA</h1>
          <p>Gestión de Arbitraje</p>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form className="login-form" onSubmit={handleLogin}>
          <label>Usuario</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="usuario" autoComplete="off" required />
          <label>Contraseña</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
          <button className="btn-login" disabled={loading}>{loading ? 'Entrando...' : 'Iniciar sesión'}</button>
        </form>
      </div>
    </div>
  )
}
