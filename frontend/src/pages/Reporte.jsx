import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Spinner } from '../components/ui'
import { CRITERIOS, nombreCompleto } from '../utils/criterios'
import api from '../api'

export default function Reporte() {
  const { arbitroId } = useParams()
  const { config } = useApp()
  const nav = useNavigate()

  const [arbitro, setArbitro] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [incluirGraficos, setIncluirGraficos] = useState(false)

  const chartEventoRef = useRef(null)
  const chartCriterioRef = useRef(null)
  const chartsRendered = useRef({ evento: null, criterio: null })

  const year = new Date().getFullYear()

  useEffect(() => { cargarDatos() }, [arbitroId])

  useEffect(() => {
    if (incluirGraficos && historial.length > 0) {
      // Esperar al siguiente frame para que los canvas existan en el DOM
      setTimeout(dibujarGraficos, 50)
    } else {
      chartsRendered.current.evento?.destroy()
      chartsRendered.current.criterio?.destroy()
    }
  }, [incluirGraficos, historial])

  async function cargarDatos() {
    try {
      const [arbRes, histRes] = await Promise.all([
        api.get(`/arbitros/todos`),
        api.get(`/evaluaciones/historial/arbitro/${arbitroId}`)
      ])
      const arb = arbRes.data.find(a => a.id === parseInt(arbitroId))
      setArbitro(arb)
      setHistorial(histRes.data)
    } catch { }
    finally { setLoading(false) }
  }

  function handlePrint() { window.print() }

  const porEvento = historial.reduce((acc, e) => {
    if (!acc[e.evento_id]) acc[e.evento_id] = { evento_nombre: e.evento_nombre, fecha: e.fecha, modalidad: e.modalidad, evaluaciones: [] }
    acc[e.evento_id].evaluaciones.push(e)
    return acc
  }, {})

  // Usamos la modalidad predominante del historial para el gráfico resumen
  const modalidadPredominante = historial[0]?.modalidad || 'kumite'
  const critsResumen = CRITERIOS[modalidadPredominante] || CRITERIOS.kumite

  function calcularResumenPorEvento() {
    return Object.values(porEvento)
      .filter(ev => ev.modalidad === modalidadPredominante)
      .map(ev => {
        const crits = CRITERIOS[ev.modalidad] || CRITERIOS.kumite
        const todos = ev.evaluaciones.flatMap(e => crits.map(c => parseFloat(e[c.key])).filter(v => !isNaN(v) && v > 0))
        const prom = todos.length ? (todos.reduce((a,b)=>a+b,0)/todos.length) : null
        return { nombre: ev.evento_nombre, promedio: prom }
      })
  }

  function calcularResumenPorCriterio() {
    const eventosFiltrados = Object.values(porEvento).filter(ev => ev.modalidad === modalidadPredominante)
    return critsResumen.map(c => {
      const vals = eventosFiltrados.flatMap(ev => ev.evaluaciones.map(e => parseFloat(e[c.key])).filter(v => !isNaN(v) && v > 0))
      return { criterio: c.short, promedio: vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null }
    })
  }

  function dibujarGraficos() {
    if (!window.Chart) return
    chartsRendered.current.evento?.destroy()
    chartsRendered.current.criterio?.destroy()

    const datosEvento = calcularResumenPorEvento()
    if (chartEventoRef.current && datosEvento.length) {
      chartsRendered.current.evento = new window.Chart(chartEventoRef.current, {
        type: 'bar',
        data: {
          labels: datosEvento.map(d => d.nombre),
          datasets: [{
            data: datosEvento.map(d => d.promedio),
            backgroundColor: datosEvento.map(d => d.promedio >= 4 ? '#1D9E75' : d.promedio >= 3 ? '#EF9F27' : '#E24B4A'),
            borderRadius: 4,
          }]
        },
        options: {
          responsive: false, animation: false,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 10 } } }, x: { ticks: { font: { size: 9 } } } },
        }
      })
    }

    const datosCriterio = calcularResumenPorCriterio()
    if (chartCriterioRef.current && datosCriterio.length) {
      chartsRendered.current.criterio = new window.Chart(chartCriterioRef.current, {
        type: 'radar',
        data: {
          labels: datosCriterio.map(d => d.criterio),
          datasets: [{
            label: 'Promedio', data: datosCriterio.map(d => d.promedio),
            backgroundColor: 'rgba(200,16,46,0.15)', borderColor: '#C8102E', pointBackgroundColor: '#C8102E',
          }]
        },
        options: {
          responsive: false, animation: false,
          plugins: { legend: { display: false } },
          scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 9 } }, pointLabels: { font: { size: 10 } } } },
        }
      })
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Spinner size={36} />
    </div>
  )

  const footerText = `${config.fedNombre || 'FEPAKA'} — Reporte de ${arbitro ? nombreCompleto(arbitro) : ''} · © ${year} S2TechGroup · s2techgroup.net · v1.0.0`

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          html, body { margin: 0; }
          @page { size: letter; margin: 16mm 16mm 16mm 16mm; }
          .evento-bloque { page-break-inside: avoid; }
          .graficos-bloque { page-break-inside: avoid; }
        }
      `}</style>

      {/* Barra de acción — solo en pantalla */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--dark)', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <button onClick={() => nav(-1)} style={{
          padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 20, color: 'white', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
        }}>← Volver</button>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'white', cursor: 'pointer' }}>
          <input type="checkbox" checked={incluirGraficos} onChange={e => setIncluirGraficos(e.target.checked)} />
          📊 Incluir gráficos en el reporte
        </label>

        <button onClick={handlePrint} style={{
          padding: '6px 16px', background: 'var(--red)', border: 'none', borderRadius: 20,
          color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
        }}>🖨 Imprimir / PDF</button>

        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Desactiva "Encabezados y pies de página" del navegador al imprimir
        </span>
      </div>

      {/* Contenido imprimible */}
      <div style={{ maxWidth: 750, margin: '0 auto', padding: '70px 32px 50px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#0F172A' }}>
        {/* Encabezado con escudo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '2px solid #C8102E', paddingBottom: 16, marginBottom: 20 }}>
          {config.escudo ? (
            <img src={config.escudo} alt="Escudo" style={{ width: 60, height: 60, objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🥋</div>
          )}
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2, color: '#C8102E' }}>{config.fedNombre || 'FEPAKA'}</div>
            <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>Gestión de Arbitraje — Reporte Individual</div>
          </div>
        </div>

        {arbitro && (
          <div style={{ background: '#F1F5F9', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: 1, marginBottom: 8 }}>{nombreCompleto(arbitro)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, color: '#64748B' }}>
              <div><strong>Licencia:</strong> {arbitro.licencia || '—'}</div>
              <div><strong>Provincia:</strong> {arbitro.provincia || '—'}</div>
              <div><strong>Club:</strong> {arbitro.club || '—'}</div>
              <div><strong>FEPAKA ID:</strong> {arbitro.fepaka_id || '—'}</div>
              <div><strong>Total eventos:</strong> {Object.keys(porEvento).length}</div>
            </div>
          </div>
        )}

        {Object.keys(porEvento).length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>Sin evaluaciones registradas</div>
        )}

        {/* Gráficos — solo si el usuario activó la opción */}
        {incluirGraficos && Object.keys(porEvento).length > 0 && (
          <div className="graficos-bloque" style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 14, letterSpacing: 1, color: '#1E293B', marginBottom: 4 }}>
              GRÁFICOS — {modalidadPredominante.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 12 }}>
              Resumen visual del desempeño a través de los eventos en esta modalidad
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, textAlign: 'center' }}>Promedio por evento</div>
                <canvas ref={chartEventoRef} width={320} height={220}></canvas>
              </div>
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, textAlign: 'center' }}>Promedio por criterio</div>
                <canvas ref={chartCriterioRef} width={320} height={220}></canvas>
              </div>
            </div>
          </div>
        )}

        {/* Historial por evento */}
        {Object.entries(porEvento).map(([evId, ev]) => {
          const crits = CRITERIOS[ev.modalidad] || CRITERIOS.kumite
          return (
            <div key={evId} className="evento-bloque" style={{ marginBottom: 28 }}>
              <div style={{ background: '#1E293B', color: 'white', borderRadius: '8px 8px 0 0', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 15, letterSpacing: 1 }}>{ev.evento_nombre}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                  </div>
                </div>
                <span style={{ background: ev.modalidad === 'kata' ? '#3B82F6' : '#F5A623', color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  {ev.modalidad?.toUpperCase()}
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #E2E8F0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B' }}>Evaluador / Área</th>
                    {crits.map(c => (
                      <th key={c.key} style={{ padding: '8px 8px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', whiteSpace: 'nowrap' }}>{c.short}</th>
                    ))}
                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B' }}>Prom.</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #E2E8F0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B' }}>Comentario</th>
                  </tr>
                </thead>
                <tbody>
                  {ev.evaluaciones.map((e, i) => {
                    const vals = crits.map(c => parseFloat(e[c.key])).filter(v => !isNaN(v) && v > 0)
                    const prom = vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(2) : '—'
                    const promNum = parseFloat(prom)
                    const promColor = promNum >= 4 ? '#10B981' : promNum >= 3 ? '#F59E0B' : '#EF4444'
                    return (
                      <tr key={e.id} style={{ background: i % 2 === 0 ? 'white' : '#F8FAFC' }}>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0' }}>
                          <div style={{ fontWeight: 500 }}>{e.evaluador_nombre}</div>
                          {e.area_nombre && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{e.area_nombre}</div>}
                        </td>
                        {crits.map(c => (
                          <td key={c.key} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>{e[c.key] ? parseFloat(e[c.key]).toFixed(1) : '—'}</td>
                        ))}
                        <td style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
                          <span style={{ fontWeight: 700, color: promColor, fontSize: 13 }}>{prom}</span>
                        </td>
                        <td style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0', fontSize: 11, color: '#64748B', fontStyle: e.comentario ? 'normal' : 'italic', maxWidth: 180 }}>
                          {e.comentario || 'Sin comentarios'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {ev.evaluaciones.length > 1 && (() => {
                  const promsEvento = crits.map(c => {
                    const vals = ev.evaluaciones.map(e => parseFloat(e[c.key])).filter(v => !isNaN(v) && v > 0)
                    return vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1) : '—'
                  })
                  const promsCrit = crits.map(c => {
                    const vals = ev.evaluaciones.map(e => parseFloat(e[c.key])).filter(v => !isNaN(v) && v > 0)
                    return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null
                  })
                  const promTotal = promsCrit.filter(v => v !== null).length
                    ? (promsCrit.filter(v => v !== null).reduce((a,b) => a+b, 0) / promsCrit.filter(v => v !== null).length).toFixed(2)
                    : '—'
                  const promColor = parseFloat(promTotal) >= 4 ? '#10B981' : parseFloat(promTotal) >= 3 ? '#F59E0B' : '#EF4444'
                  return (
                    <tfoot>
                      <tr style={{ background: '#1E293B' }}>
                        <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Promedio del evento</td>
                        {promsEvento.map((p, i) => (
                          <td key={i} style={{ padding: '8px', textAlign: 'center', color: 'white', fontWeight: 600 }}>{p}</td>
                        ))}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: promColor, fontSize: 14 }}>{promTotal}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}></td>
                      </tr>
                    </tfoot>
                  )
                })()}
              </table>

              <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 16, paddingTop: 8, fontSize: 9, color: '#94A3B8', textAlign: 'center' }}>
                {footerText}
              </div>
            </div>
          )
        })}

        <div style={{ marginTop: 16, borderTop: '1px solid #E2E8F0', paddingTop: 12, fontSize: 10, color: '#94A3B8', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
          <span>
            © {year} S2TechGroup · Todos los derechos reservados ·{' '}
            <a href="https://s2techgroup.net" target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8' }}>s2techgroup.net</a>
            {' '}· v1.0.0
          </span>
          <span className="no-print">Generado: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </>
  )
}
