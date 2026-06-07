import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { Avatar, Button } from '../ui'

// ─────────────────────────────────────────
// APP SHELL — wraps every authenticated screen
// ─────────────────────────────────────────
export function AppShell({ children, tabs, activeTab, onTabChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppHeader />
      {tabs && <NavTabs tabs={tabs} active={activeTab} onChange={onTabChange} />}
      <main style={{ flex: 1, padding: 20, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────
// APP HEADER
// ─────────────────────────────────────────
export function AppHeader({ showBack, onBack }) {
  const nav = useNavigate()
  const { user, logout, config, isAdmin } = useApp()

  function handleLogout() { logout(); nav('/') }

  return (
    <header style={{ background: 'var(--dark)', flexShrink: 0 }} role="banner">
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', maxWidth: 1100, margin: '0 auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: config.escudo ? 'transparent' : 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {config.escudo
              ? <img src={config.escudo} alt="Escudo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'white', letterSpacing: 1 }}>FEP</span>
            }
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'white', letterSpacing: '2px' }}>
              {config.fedNombre}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Gestión de Arbitraje
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showBack && (
            <button
              onClick={onBack || (() => nav('/admin'))}
              style={{
                padding: '5px 14px', background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20,
                color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font)', transition: 'all 0.2s',
              }}
              aria-label="Volver al menú"
            >
              ← Menú
            </button>
          )}
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '4px 12px 4px 4px',
            }}>
              <Avatar name={user.nombre} size={26} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                {user.nombre}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: '5px 12px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
              color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--font)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,16,46,0.2)'; e.currentTarget.style.color = '#FCA5A5' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            aria-label="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────
// NAV TABS
// ─────────────────────────────────────────
export function NavTabs({ tabs, active, onChange }) {
  return (
    <nav
      style={{
        background: 'var(--dark2)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', padding: '0 20px', gap: 2,
        overflowX: 'auto', flexShrink: 0,
      }}
      role="tablist"
      aria-label="Navegación principal"
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          style={{
            padding: '10px 16px', fontSize: 12, fontWeight: 500,
            color: active === tab.id ? 'white' : 'rgba(255,255,255,0.4)',
            borderBottom: `2px solid ${active === tab.id ? 'var(--red)' : 'transparent'}`,
            background: 'none', border: 'none',
            borderBottom: `2px solid ${active === tab.id ? 'var(--red)' : 'transparent'}`,
            cursor: tab.disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font)', whiteSpace: 'nowrap',
            transition: 'color 0.2s', opacity: tab.disabled ? 0.4 : 1,
          }}
          onMouseEnter={e => { if (active !== tab.id && !tab.disabled) e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { if (active !== tab.id) e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
        >
          {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
          {tab.label}
          {tab.badge != null && (
            <span style={{
              marginLeft: 6, background: 'var(--red)', color: 'white',
              borderRadius: 9999, padding: '1px 6px', fontSize: 10, fontWeight: 600,
            }}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}

// ─────────────────────────────────────────
// PAGE HEADER (dentro del contenido)
// ─────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '2px', color: 'var(--dark)', margin: 0 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
