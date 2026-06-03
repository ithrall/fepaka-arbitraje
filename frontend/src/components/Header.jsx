import { useNavigate } from 'react-router-dom'

export default function Header({ showBack, onBack }) {
  const nav = useNavigate()
  const user = JSON.parse(localStorage.getItem('fepaka_user') || '{}')
  const escudo = localStorage.getItem('fepaka_escudo')
  const initials = user.nombre?.split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase() || '??'

  function logout() {
    localStorage.removeItem('fepaka_token')
    localStorage.removeItem('fepaka_user')
    nav('/')
  }

  return (
    <div className="app-header">
      <div className="app-header-inner">
        <div className="app-logo">
          <div className="icon">
            {escudo ? <img src={escudo} alt="Escudo" /> : 'FEP'}
          </div>
          <div>
            <h2>FEPAKA</h2>
            <p>Gestión de Arbitraje</p>
          </div>
        </div>
        <div className="header-right">
          {showBack && (
            <button className="btn-back" onClick={onBack || (()=>nav('/admin'))}>← Menú</button>
          )}
          <div className="user-chip">
            <div className="av">{initials}</div>
            <span>{user.nombre}</span>
          </div>
          <button className="btn-header danger" onClick={logout}>Salir</button>
        </div>
      </div>
    </div>
  )
}
