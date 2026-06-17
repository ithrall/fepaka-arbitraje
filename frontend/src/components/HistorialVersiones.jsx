import { useState } from 'react'
import { Badge } from './ui'
import { Card } from './data'
import { CHANGELOG, VERSION_ACTUAL } from '../utils/changelog'

const TIPO_INFO = {
  nuevo:  { label: 'Nuevo',     variant: 'green' },
  mejora: { label: 'Mejora',    variant: 'blue'  },
  fix:    { label: 'Corrección', variant: 'gold'  },
}

export default function HistorialVersiones() {
  const [expandido, setExpandido] = useState(CHANGELOG[0]?.version || null)

  function toggle(version) {
    setExpandido(prev => prev === version ? null : version)
  }

  return (
    <Card title="HISTORIAL DE VERSIONES" subtitle={`Versión actual: v${VERSION_ACTUAL}`}>
      <div style={{ maxHeight: 520, overflowY: 'auto' }}>
        {CHANGELOG.map((entry, idx) => {
          const isOpen = expandido === entry.version
          const fechaFmt = new Date(entry.fecha + 'T12:00').toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
          })

          return (
            <div key={entry.version} style={{
              borderLeft: `3px solid ${idx === 0 ? 'var(--red)' : 'var(--border)'}`,
              paddingLeft: 16, marginBottom: 4, position: 'relative',
            }}>
              {/* Punto en la línea de tiempo */}
              <div style={{
                position: 'absolute', left: -6, top: 4, width: 10, height: 10,
                borderRadius: '50%', background: idx === 0 ? 'var(--red)' : 'var(--gray2)',
              }} />

              <div
                onClick={() => toggle(entry.version)}
                style={{
                  cursor: 'pointer', paddingBottom: 10, paddingTop: 2,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.5px', color: 'var(--dark)' }}>
                      v{entry.version}
                    </span>
                    {idx === 0 && <Badge variant="red">Actual</Badge>}
                    <span style={{ fontSize: 11, color: 'var(--gray2)' }}>{fechaFmt}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)', marginTop: 2 }}>
                    {entry.titulo}
                  </div>
                </div>
                <span style={{
                  fontSize: 12, color: 'var(--gray)', flexShrink: 0, marginTop: 4,
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s',
                }}>▶</span>
              </div>

              {isOpen && (
                <div style={{ paddingBottom: 16 }}>
                  {entry.cambios.map((c, i) => {
                    const info = TIPO_INFO[c.tipo] || TIPO_INFO.mejora
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <Badge variant={info.variant} style={{ flexShrink: 0, marginTop: 1 }}>{info.label}</Badge>
                        <span style={{ fontSize: 12.5, color: 'var(--gray)', lineHeight: 1.5 }}>{c.texto}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
