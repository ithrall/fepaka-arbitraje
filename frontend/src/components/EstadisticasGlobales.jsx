import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useAsync'
import { Spinner, Empty, Badge } from './ui'
import { Card, StatCard } from './data'
import { Input } from './forms'
import { CRITERIOS, nombreCompleto } from '../utils/criterios'
import api from '../api'

// Chart.js se carga globalmente desde index.html (ver instrucciones de instalación)

export default function EstadisticasGlobales() {
  const { toast } = useToast()
  const [arbitros, setArbitros] = useState([])
  const [arbSel, setArbSel] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalidad, setModalidad] = useState('kumite')
  const [vista, setVista] = useState('evento') // 'evento' | 'criterio'
  const [stats, setStats] = useState(null)
  const [loadingArbs, setLoadingArbs] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)
  const [eventoDetalle, setEventoDetalle] = useState(null) // evento clickeado en la gráfica

  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => { cargarArbitros() }, [])
  useEffect(() => {
    if (arbSel) cargarStats()
  }, [arbSel, modalidad])

  useEffect(() => {
    if (stats) dibujarGrafica()
    return () => { chartInstance.current?.destroy() }
  }, [stats, vista])

  async function cargarArbitros() {
    try {
      const { data } = await api.get('/estadisticas/arbitros-evaluados')
      setArbitros(data)
    } catch { toast.error('Error al cargar árbitros') }
    finally { setLoadingArbs(false) }
  }

  async function cargarStats() {
    setLoadingStats(true)
    setEventoDetalle(null)
    try {
      const { data } = await api.get(`/estadisticas/arbitro/${arbSel.id}?modalidad=${modalidad}`)
      setStats(data)
    } catch { toast.error('Error al cargar estadísticas') }
    finally { setLoadingStats(false) }
  }

  function dibujarGrafica() {
    if (!chartRef.current || !window.Chart) return
    chartInstance.current?.destroy()

    const criterios = stats.criterios.map(c =>
      CRITERIOS[modalidad].find(x => x.key === c) || { key: c, label: c, short: c }
    )

    let config
    if (vista === 'evento') {
      // Una barra por evento con el promedio total
      const labels = stats.porEvento.map(e => e.evento_nombre)
      const data = stats.porEvento.map(e => parseFloat(e.promedio_total))

      config = {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Promedio',
            data,
            backgroundColor: data.map(v => v >= 4 ? '#1D9E75' : v >= 3 ? '#EF9F27' : '#E24B4A'),
            borderRadius: 6,
            maxBarThickness: 56,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => `Promedio: ${ctx.parsed.y.toFixed(2)}`
              }
            }
          },
          onClick: (evt, elements) => {
            if (elements.length) {
              const idx = elements[0].index
              setEventoDetalle(stats.porEvento[idx])
            }
          },
        }
      }
    } else {
      // Una línea por criterio, a través de los eventos
      const labels = stats.porEvento.map(e => e.evento_nombre)
      const colores = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD']

      config = {
        type: 'line',
        data: {
          labels,
          datasets: criterios.map((c, i) => ({
            label: c.short,
            data: stats.porEvento.map(e => parseFloat(e[c.key]) || null),
            borderColor: colores[i % colores.length],
            backgroundColor: colores[i % colores.length],
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            spanGaps: true,
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } },
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false }
          },
          onClick: (evt, elements) => {
            if (elements.length) {
              const idx = elements[0].index
              setEventoDetalle(stats.porEvento[idx])
            }
          },
        }
      }
    }

    chartInstance.current = new window.Chart(chartRef.current, config)
  }

  const arbsFiltrados = arbitros.filter(a =>
    !busqueda || nombreCompleto(a).toLowerCase().includes(busqueda.toLowerCase())
  )

  const criteriosInfo = stats ? CRITERIOS[modalidad] : []
  const colores = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD']

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '2px', color: 'var(--dark)', margin: 0 }}>
          ESTADÍSTICAS GLOBALES
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
          Historial de evaluaciones de un árbitro a través de todos los eventos
        </p>
      </div>

      <div className="row2">
        {/* Selector de árbitro */}
        <Card title="SELECCIONAR ÁRBITRO">
          <Input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar árbitro..."
            icon="🔍"
            style={{ marginBottom: 8 }}
          />
          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            {loadingArbs ? (
              <div style={{ padding: 20, textAlign: 'center' }}><Spinner size={24} /></div>
            ) : arbsFiltrados.length === 0 ? (
              <Empty icon="📊" title="Sin árbitros evaluados" description="Aún no hay evaluaciones guardadas en el sistema." />
            ) : arbsFiltrados.map(a => (
              <div key={a.id}
                onClick={() => setArbSel(a)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderBottom: '1px solid var(--border)',
                  background: arbSel?.id === a.id ? 'var(--red-light)' : 'white',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (arbSel?.id !== a.id) e.currentTarget.style.background = 'var(--light)' }}
                onMouseLeave={e => { if (arbSel?.id !== a.id) e.currentTarget.style.background = 'white' }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, color: arbSel?.id === a.id ? 'var(--red)' : 'var(--dark)' }}>
                    {nombreCompleto(a)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 2 }}>
                    {a.provincia} · {a.licencia}
                  </div>
                </div>
                {arbSel?.id === a.id && <span style={{ color: 'var(--red)' }}>→</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* Panel de estadísticas */}
        <Card title={arbSel ? `ESTADÍSTICAS — ${nombreCompleto(arbSel)}` : 'ESTADÍSTICAS'}>
          {!arbSel && (
            <Empty icon="👤" title="Selecciona un árbitro" description="Elige un árbitro de la lista para ver su historial de evaluaciones." />
          )}

          {arbSel && (
            <>
              {/* Toggle modalidad */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button onClick={() => setModalidad('kumite')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    border: modalidad === 'kumite' ? '2px solid var(--gold)' : '1px solid var(--border)',
                    background: modalidad === 'kumite' ? 'var(--gold-light)' : 'white',
                    color: modalidad === 'kumite' ? '#92400E' : 'var(--gray)',
                  }}>🥋 Kumite</button>
                <button onClick={() => setModalidad('kata')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    border: modalidad === 'kata' ? '2px solid var(--blue)' : '1px solid var(--border)',
                    background: modalidad === 'kata' ? 'var(--blue-light)' : 'white',
                    color: modalidad === 'kata' ? 'var(--blue)' : 'var(--gray)',
                  }}>🥋 Kata</button>
              </div>

              {loadingStats ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div>
              ) : !stats?.porEvento?.length ? (
                <Empty icon="📊" title={`Sin evaluaciones de ${modalidad.toUpperCase()}`} description="Este árbitro no tiene evaluaciones en esta modalidad." />
              ) : (
                <>
                  {/* Stat cards resumen global */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                    <StatCard label="Promedio global" value={stats.global?.promedio_total || '—'}
                      color={parseFloat(stats.global?.promedio_total) >= 4 ? 'var(--green)' : parseFloat(stats.global?.promedio_total) >= 3 ? 'var(--gold)' : 'var(--red)'} />
                    <StatCard label="Eventos" value={stats.global?.num_eventos || 0} color="var(--blue)" />
                    <StatCard label="Evaluaciones" value={stats.global?.num_evaluaciones || 0} color="var(--gray)" />
                  </div>

                  {/* Toggle vista */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={() => setVista('evento')}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font)', border: 'none',
                        background: vista === 'evento' ? 'var(--red)' : 'var(--light)',
                        color: vista === 'evento' ? 'white' : 'var(--dark)',
                      }}>📊 Por evento</button>
                    <button onClick={() => setVista('criterio')}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--font)', border: 'none',
                        background: vista === 'criterio' ? 'var(--red)' : 'var(--light)',
                        color: vista === 'criterio' ? 'white' : 'var(--dark)',
                      }}>📈 Por criterio</button>
                  </div>

                  {/* Leyenda manual para vista criterio */}
                  {vista === 'criterio' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, fontSize: 11, color: 'var(--gray)' }}>
                      {criteriosInfo.map((c, i) => (
                        <span key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: colores[i % colores.length] }} />
                          {c.short}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Gráfica */}
                  <div style={{ position: 'relative', width: '100%', height: 260, marginBottom: 12 }}>
                    <canvas ref={chartRef} role="img"
                      aria-label={`Gráfica de evaluaciones de ${nombreCompleto(arbSel)} en modalidad ${modalidad}`}>
                    </canvas>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--gray2)', textAlign: 'center', marginBottom: 16 }}>
                    💡 Haz clic en una barra o punto para ver el detalle de ese evento
                  </div>

                  {/* Detalle del evento seleccionado */}
                  {eventoDetalle && (
                    <div style={{ background: 'var(--light)', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{eventoDetalle.evento_nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                            {eventoDetalle.fecha ? new Date(eventoDetalle.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                            {' · '}{eventoDetalle.num_evaluaciones} evaluación(es)
                          </div>
                        </div>
                        <Badge variant={parseFloat(eventoDetalle.promedio_total) >= 4 ? 'green' : parseFloat(eventoDetalle.promedio_total) >= 3 ? 'gold' : 'red'}>
                          {eventoDetalle.promedio_total}
                        </Badge>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${criteriosInfo.length}, 1fr)`, gap: 8 }}>
                        {criteriosInfo.map(c => (
                          <div key={c.key} style={{ textAlign: 'center', background: 'white', borderRadius: 8, padding: '8px 4px' }}>
                            <div style={{ fontSize: 10, color: 'var(--gray)', marginBottom: 4 }}>{c.short}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--dark)' }}>
                              {eventoDetalle[c.key] || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setEventoDetalle(null)}
                        style={{ marginTop: 10, fontSize: 11, color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Cerrar detalle
                      </button>
                    </div>
                  )}

                  <button onClick={() => window.open(`/reporte/${arbSel.id}`, '_blank')}
                    style={{
                      width: '100%', padding: '10px', marginTop: 8,
                      background: 'var(--dark)', color: 'white', border: 'none',
                      borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'var(--font)',
                    }}>
                    📄 Ver reporte completo en PDF
                  </button>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
