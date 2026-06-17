import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Footer from '../components/Footer'

export default function Login() {
  const { login, config } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')
    try {
      const user = await login(username, password)
      nav(user.rol === 'admin' ? '/admin' : '/evaluar')
    } catch (err) {
      setError(err.response?.data?.error || 'Usuario o contraseña incorrectos')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="login-screen" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div className="login-box animate-fade" style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 76, height: 76, borderRadius: 16,
              background: config.escudo ? 'transparent' : 'rgba(255,255,255,0.06)',
              border: config.escudo ? 'none' : '2px dashed rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', overflow: 'hidden',
            }}>
              {config.escudo
                ? <img src={config.escudo} alt="Escudo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <span style={{ fontSize: 30 }}>🥋</span>
              }
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 6vw, 24px)', color: 'white', letterSpacing: '3px' }}>
              {config.fedNombre}
            </h1>
            <p style={{ fontSize: 11, color: 'var(--gray2)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4 }}>
              Gestión de Arbitraje
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(200,16,46,0.12)', border: '1px solid rgba(200,16,46,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 8,
            }} role="alert">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--gray2)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                Usuario
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="usuario"
                autoComplete="username"
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: 'white', fontSize: 16, fontFamily: 'var(--font)',
                  outline: 'none', transition: 'border 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--red)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--gray2)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: 'white', fontSize: 16, fontFamily: 'var(--font)',
                  outline: 'none', transition: 'border 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--red)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', background: loading ? 'var(--red-dark)' : 'var(--red)',
                color: 'white', border: 'none', borderRadius: 10, fontSize: 15,
                fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'var(--font)', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.7s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.3" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              )}
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  )
}
