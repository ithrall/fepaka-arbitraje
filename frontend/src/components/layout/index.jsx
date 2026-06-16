import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const SIDEBAR_W = 240

export function TopBar({ onHome } = {}) {
  const { user, logout, config } = useApp()
  const nav = useNavigate()

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 52,
      background: 'var(--dark)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onHome ? 'pointer' : 'default' }}
        onClick={onHome}
        title={onHome ? 'Volver al inicio' : ''}>
        <div style={{
          width: 32, height: 32, borderRadius: 7,
          background: config.escudo ? 'transparent' : 'var(--red)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {config.escudo
            ? <img src={config.escudo} alt="Escudo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'white' }}>FEP</span>
          }
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'white', letterSpacing: '2px' }}>
            {config.fedNombre}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Gestión de Arbitraje
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onHome && (
          <button onClick={onHome} style={{
            padding: '5px 14px', background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20,
            color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
            🏠 Inicio
          </button>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '4px 12px 4px 4px',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: 'var(--red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 600, color: 'white',
          }}>
            {user?.nombre?.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{user?.nombre}</span>
        </div>
        <button
          onClick={() => { logout(); nav('/') }}
          style={{
            padding: '4px 12px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20,
            color: 'rgba(255,255,255,0.55)', fontSize: 11, cursor: 'pointer',
            fontFamily: 'var(--font)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,16,46,0.2)'; e.currentTarget.style.color = '#FCA5A5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
        >Salir</button>
      </div>
    </header>
  )
}

export function Sidebar({ eventos, activeEvento, activeSub, activeGlobal, onSelectSub, onSelectGlobal, onNewEvento }) {
  const [openEvento, setOpenEvento] = useState(activeEvento?.id || null)

  function toggleEvento(evId) {
    setOpenEvento(prev => prev === evId ? null : evId)
  }

  const subItems = [
    { id: 'arb',     label: 'Árbitros',    icon: '🥋' },
    { id: 'eval',    label: 'Evaluadores', icon: '👤' },
    { id: 'areas',   label: 'Áreas',       icon: '📍' },
    { id: 'evaluar', label: 'Evaluar',     icon: '▶'  },
    { id: 'res',     label: 'Resultados',  icon: '📊' },
  ]

  const globalItems = [
    { id: 'bd-arb',  label: 'Base de Árbitros',    icon: '🥋' },
    { id: 'bd-eval', label: 'Base de Evaluadores',  icon: '👤' },
    { id: 'stats',   label: 'Estadísticas Globales', icon: '📈' },
    { id: 'config',  label: 'Configuración',        icon: '⚙️' },
  ]

  return (
    <aside style={{
      position: 'fixed', top: 52, left: 0, bottom: 0,
      width: SIDEBAR_W, background: 'var(--dark2)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', zIndex: 90,
    }}>
      <div style={{ padding: '16px 12px 6px', fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
        Eventos
      </div>

      {eventos.map(ev => {
        const isOpen = openEvento === ev.id
        return (
          <div key={ev.id} style={{ margin: '2px 8px' }}>
            <div
              onClick={() => toggleEvento(ev.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: ev.estado === 'activo' ? 'var(--green)' : ev.estado === 'finalizado' ? 'var(--red)' : 'var(--gold)',
              }} />
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.75)',
                flex: 1, lineHeight: 1.3, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {ev.nombre}
              </div>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.3)',
                transition: 'transform 0.2s', flexShrink: 0,
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
              }}>▶</div>
            </div>

            {isOpen && (
              <div style={{ paddingBottom: 4 }}>
                {subItems.map(sub => {
                  const isActive = activeEvento?.id === ev.id && activeSub === sub.id
                  return (
                    <div
                      key={sub.id}
                      onClick={() => { onSelectSub(ev, sub.id) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '7px 10px 7px 26px', margin: '1px 8px',
                        borderRadius: 7, cursor: 'pointer', fontSize: 12,
                        color: isActive ? 'white' : 'rgba(255,255,255,0.45)',
                        fontWeight: isActive ? 500 : 400,
                        background: isActive ? 'rgba(200,16,46,0.15)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}
                    >
                      <span style={{ fontSize: 13 }}>{sub.icon}</span>
                      {sub.label}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <button
        onClick={onNewEvento}
        style={{
          margin: '6px 12px', padding: '8px 12px',
          background: 'rgba(200,16,46,0.08)', border: '1px dashed rgba(200,16,46,0.25)',
          borderRadius: 8, cursor: 'pointer', fontSize: 12,
          color: 'rgba(200,16,46,0.7)', fontFamily: 'var(--font)',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.2s', width: 'calc(100% - 24px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,16,46,0.16)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,16,46,0.08)'; e.currentTarget.style.color = 'rgba(200,16,46,0.7)'; e.currentTarget.style.borderColor = 'rgba(200,16,46,0.25)' }}
      >
        ＋ Nuevo evento
      </button>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 12px' }} />
      <div style={{ padding: '8px 12px 6px', fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
        Global
      </div>

      {globalItems.map(item => {
        const isActive = activeGlobal === item.id
        return (
          <div
            key={item.id}
            onClick={() => onSelectGlobal(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', margin: '2px 8px', borderRadius: 8,
              cursor: 'pointer', fontSize: 12,
              color: isActive ? 'white' : 'rgba(255,255,255,0.45)',
              fontWeight: isActive ? 500 : 400,
              background: isActive ? 'rgba(200,16,46,0.12)' : 'transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' } }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </div>
        )
      })}
    </aside>
  )
}

export function AppShell({ children, eventos = [], activeEvento, activeSub, activeGlobal, onSelectSub, onSelectGlobal, onNewEvento, onHome }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <TopBar onHome={onHome} />
      <Sidebar
        eventos={eventos}
        activeEvento={activeEvento}
        activeSub={activeSub}
        activeGlobal={activeGlobal}
        onSelectSub={onSelectSub}
        onSelectGlobal={onSelectGlobal}
        onNewEvento={onNewEvento}
      />
      <main style={{
        marginTop: 52, marginLeft: SIDEBAR_W,
        minHeight: 'calc(100vh - 52px)',
        padding: 24,
      }}>
        {children}
      </main>
    </div>
  )
}

export function EventoBanner({ evento }) {
  if (!evento) return null
  const fecha = evento.fecha
    ? new Date(evento.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--dark2)', borderRadius: 10,
      padding: '10px 16px', marginBottom: 20,
    }}>
      <span style={{
        background: 'var(--red)', borderRadius: 6, padding: '3px 10px',
        fontSize: 10, fontWeight: 600, color: 'white',
        letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0,
      }}>Evento</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{evento.nombre}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          {[fecha, evento.sede].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}

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

export function CsvDropZone({ accept, onChange, title, description, hint }) {
  const [drag, setDrag] = useState(false)

  function handleDrop(e) {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer.files[0]
    if (file) onChange({ target: { files: [file] } })
  }

  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        border: `2px dashed ${drag ? 'var(--red)' : 'var(--border)'}`,
        borderRadius: 12, padding: '18px 20px', cursor: 'pointer',
        background: drag ? 'var(--red-light)' : 'var(--light)',
        transition: 'all 0.2s', position: 'relative',
      }}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>📂</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 4 }}>
          {title || 'Haz clic o arrastra el archivo CSV aquí'}
        </div>
        {description && <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.4 }}>{description}</div>}
        {hint && <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 4 }}>{hint}</div>}
      </div>
      <input type="file" accept={accept} onChange={onChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
    </label>
  )
}

export function EscudoUpload({ escudo, onChange, onRemove }) {
  const [drag, setDrag] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('El archivo supera 2 MB'); return }
    if (!file.type.startsWith('image/')) { alert('Solo se permiten imágenes'); return }
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{
        width: 88, height: 88, borderRadius: 14, flexShrink: 0,
        background: 'var(--light)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {escudo
          ? <img src={escudo} alt="Escudo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <span style={{ fontSize: 11, color: 'var(--gray2)', textAlign: 'center', padding: 8, lineHeight: 1.4 }}>Sin<br/>escudo</span>
        }
      </div>

      <div style={{ flex: 1 }}>
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            border: `2px dashed ${drag ? 'var(--red)' : 'var(--border)'}`,
            borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
            background: drag ? 'var(--red-light)' : 'var(--light)',
            transition: 'all 0.2s', position: 'relative', marginBottom: 8,
          }}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile({ target: { files: [f] } }) }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>🖼️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
              {escudo ? 'Cambiar imagen del escudo' : 'Seleccionar imagen del escudo'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
              PNG, JPG o SVG recomendado · Máx. 2 MB
            </div>
          </div>
          <input type="file" accept="image/*" onChange={handleFile}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
        </label>
        {escudo && (
          <button onClick={onRemove} style={{
            padding: '5px 12px', background: 'var(--light)', border: '1px solid var(--border)',
            borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
            color: 'var(--gray)', transition: 'all 0.15s',
          }}>
            Quitar escudo
          </button>
        )}
      </div>
    </div>
  )
}
