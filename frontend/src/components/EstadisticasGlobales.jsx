import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useAsync'
import { Spinner, Empty, Badge, Button } from './ui'
import { Card, StatCard } from './data'
import { Input } from './forms'
import { CRITERIOS, nombreCompleto } from '../utils/criterios'
import api from '../api'

const COLORES_COMPARA = ['#C8102E', '#3B82F6', '#1D9E75', '#D4537E']

export default function EstadisticasGlobales() {
  const { toast } = useToast()
  const [modo, setModo] = useState('individual') // 'individual' | 'comparar'

  // ── Modo individual ──
  const [arbitros, setArbitros] = useState([])
  const [arbSel, setArbSel] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalidad, setModalidad] = useState('kumite')
  const [vista, setVista] = useState('evento')
  const [stats, setStats] = useState(null)
  const [loadingArbs, setLoadingArbs] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)
  const [eventoDetalle, setEventoDetalle] = useState(null)
  const [compararConGlobal, setCompararConGlobal] = useState(false)
  const [promedioGlobal, setPromedioGlobal] = useState(null)

  // ── Modo comparar ──
  const [seleccionados, setSeleccionados] = useState([]) // ids de árbitros a comparar
  const [busquedaComp, setBusquedaComp] = useState('')
  const [modalidadComp, setModalidadComp] = useState('kumite')
  const [vistaComp, setVistaComp] = useState('evento')
  const [comparacion, setComparacion] = useState(null)
  const [loadingComp, setLoadingComp] = useState(false)

  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => { cargarArbitros() }, [])
  useEffect(() => { if (arbSel) cargarStats() }, [arbSel, modalidad])
  useEffect(() => { if (compararConGlobal) cargarPromedioGlobal() }, [compararConGlobal, modalidad])
  useEffect(() => { if (stats) dibujarGraficaIndividual() ; return () => chartInstance.current?.destroy() }, [stats, vista, promedioGlobal, compararConGlobal])
  useEffect(() => { if (comparacion) dibujarGraficaComparativa(); return () => chartInstance.current?.destroy() }, [comparacion, vistaComp])

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

  async function cargarPromedioGlobal() {
    try {
      const { data } = await api.get(`/estadisticas/promedio-global?modalidad=${modalidad}`)
      setPromedioGlobal(data.global)
    } catch {}
  }

  async function cargarComparacion() {
    if (seleccionados.length < 2) { toast.error('Selecciona al menos 2 árbitros para comparar'); return }
    setLoadingComp(true)
    try {
      const { data } = await api.post('/estadisticas/comparar', { arbitro_ids: seleccionados, modalidad: modalidadComp })
      setComparacion(data)
    } catch { toast.error('Error al cargar comparación') }
    finally { setLoadingComp(false) }
  }

  function toggleSeleccion(id) {
    setSeleccionados(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 4) { toast.error('Máximo 4 árbitros a la vez'); return prev }
      return [...prev, id]
    })
  }

  function dibujarGraficaIndividual() {
    if (!chartRef.current || !window.Chart) return
    chartInstance.current?.destroy()
    const criterios = stats.criterios.map(c => CRITERIOS[modalidad].find(x => x.key === c) || { key: c, label: c, short: c })
    let config

    if (vista === 'evento') {
      const labels = stats.porEvento.map(e => e.evento_nombre)
      const data = stats.porEvento.map(e => parseFloat(e.promedio_total))
      const datasets = [{
        label: 'Promedio', data,
        backgroundColor: data.map(v => v >= 4 ? '#1D9E75' : v >= 3 ? '#EF9F27' : '#E24B4A'),
        borderRadius: 6, maxBarThickness: 56,
      }]
      if (compararConGlobal && promedioGlobal) {
        datasets.push({
          type: 'line', label: 'Promedio global', data: labels.map(() => parseFloat(promedioGlobal.promedio_total)),
          borderColor: '#3B82F6', borderDash: [6,4], borderWidth: 2, pointRadius: 0, fill: false,
        })
      }
      config = {
        type: 'bar', data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } },
          plugins: { legend: { display: compararConGlobal }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}` } } },
          onClick: (evt, els) => { if (els.length && els[0].datasetIndex === 0) setEventoDetalle(stats.porEvento[els[0].index]) },
        }
      }
    } else {
      const labels = stats.porEvento.map(e => e.evento_nombre)
      const colores = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD']
      config = {
        type: 'line', data: {
          labels,
          datasets: criterios.map((c, i) => ({
            label: c.short, data: stats.porEvento.map(e => parseFloat(e[c.key]) || null),
            borderColor: colores[i % colores.length], backgroundColor: colores[i % colores.length],
            tension: 0.3, pointRadius: 4, pointHoverRadius: 6, spanGaps: true,
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } },
          plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
          onClick: (evt, els) => { if (els.length) setEventoDetalle(stats.porEvento[els[0].index]) },
        }
      }
    }
    chartInstance.current = new window.Chart(chartRef.current, config)
  }

  function dibujarGraficaComparativa() {
    if (!chartRef.current || !window.Chart) return
    chartInstance.current?.destroy()
    const criterios = comparacion.criterios.map(c => CRITERIOS[modalidadComp].find(x => x.key === c) || { key: c, label: c, short: c })
    let config

    if (vistaComp === 'evento') {
      // Eje X: unión de todos los eventos en los que participó alguno de los seleccionados
      const eventosSet = new Map()
      comparacion.arbitros.forEach(a => a.porEvento.forEach(e => eventosSet.set(e.evento_id, e.evento_nombre)))
      const eventosOrdenados = Array.from(eventosSet.entries())
      const labels = eventosOrdenados.map(([, nombre]) => nombre)

      const datasets = comparacion.arbitros.map((a, i) => ({
        label: nombreCompleto(a.arbitro),
        data: eventosOrdenados.map(([id]) => {
          const ev = a.porEvento.find(e => e.evento_id === id)
          return ev ? parseFloat(ev.promedio_total) : null
        }),
        backgroundColor: COLORES_COMPARA[i % COLORES_COMPARA.length],
        borderColor: COLORES_COMPARA[i % COLORES_COMPARA.length],
        borderRadius: 6,
      }))

      config = {
        type: 'bar', data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } },
          plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        }
      }
    } else {
      // Por criterio: promedio global de cada criterio, una barra agrupada por árbitro
      const labels = criterios.map(c => c.short)
      const datasets = comparacion.arbitros.map((a, i) => ({
        label: nombreCompleto(a.arbitro),
        data: criterios.map(c => a.global ? parseFloat(a.global[c.key]) || null : null),
        backgroundColor: COLORES_COMPARA[i % COLORES_COMPARA.length],
        borderColor: COLORES_COMPARA[i % COLORES_COMPARA.length],
        borderRadius: 6,
      }))
      config = {
        type: 'bar', data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { min: 0, max: 5, ticks: { stepSize: 1 } } },
          plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        }
      }
    }
    chartInstance.current = new window.Chart(chartRef.current, config)
  }

  const arbsFiltrados = arbitros.filter(a => !busqueda || nombreCompleto(a).toLowerCase().includes(busqueda.toLowerCase()))
  const arbsFiltradosComp = arbitros.filter(a => !busquedaComp || nombreCompleto(a).toLowerCase().includes(busquedaComp.toLowerCase()))
  const criteriosInfo = stats ? CRITERIOS[modalidad] : []
  const colores = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD']

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '2px', color: 'var(--dark)', margin: 0 }}>
          ESTADÍSTICAS GLOBALES
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
          Historial individual o comparativa entre árbitros evaluados
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant={modo === 'individual' ? 'primary' : 'secondary'} onClick={() => setModo('individual')}>👤 Vista individual</Button>
        <Button variant={modo === 'comparar' ? 'primary' : 'secondary'} onClick={() => setModo('comparar')}>⚖️ Comparar árbitros</Button>
      </div>

      {/* ══════════ MODO INDIVIDUAL ══════════ */}
      {modo === 'individual' && (
        <div className="row2">
          <Card title="SELECCIONAR ÁRBITRO">
            <Input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar árbitro..." icon="🔍" style={{ marginBottom: 8 }} />
            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              {loadingArbs ? <div style={{ padding: 20, textAlign: 'center' }}><Spinner size={24} /></div>
                : arbsFiltrados.length === 0 ? <Empty icon="📊" title="Sin árbitros evaluados" />
                : arbsFiltrados.map(a => (
                  <div key={a.id} onClick={() => setArbSel(a)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                    background: arbSel?.id === a.id ? 'var(--red-light)' : 'white', cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13, color: arbSel?.id === a.id ? 'var(--red)' : 'var(--dark)' }}>{nombreCompleto(a)}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 2 }}>{a.provincia} · {a.licencia}</div>
                    </div>
                    {arbSel?.id === a.id && <span style={{ color: 'var(--red)' }}>→</span>}
                  </div>
                ))}
            </div>
          </Card>

          <Card title={arbSel ? `ESTADÍSTICAS — ${nombreCompleto(arbSel)}` : 'ESTADÍSTICAS'}>
            {!arbSel && <Empty icon="👤" title="Selecciona un árbitro" description="Elige un árbitro de la lista para ver su historial." />}
            {arbSel && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button onClick={() => setModalidad('kumite')} style={tabBtn(modalidad === 'kumite', 'gold')}>🥋 Kumite</button>
                  <button onClick={() => setModalidad('kata')} style={tabBtn(modalidad === 'kata', 'blue')}>🥋 Kata</button>
                </div>

                {loadingStats ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div>
                  : !stats?.porEvento?.length ? <Empty icon="📊" title={`Sin evaluaciones de ${modalidad.toUpperCase()}`} />
                  : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                      <StatCard label="Promedio global" value={stats.global?.promedio_total || '—'}
                        color={parseFloat(stats.global?.promedio_total) >= 4 ? 'var(--green)' : parseFloat(stats.global?.promedio_total) >= 3 ? 'var(--gold)' : 'var(--red)'} />
                      <StatCard label="Eventos" value={stats.global?.num_eventos || 0} color="var(--blue)" />
                      <StatCard label="Evaluaciones" value={stats.global?.num_evaluaciones || 0} color="var(--gray)" />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--gray)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={compararConGlobal} onChange={e => setCompararConGlobal(e.target.checked)} />
                      Comparar contra el promedio global de todos los árbitros evaluados
                    </label>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <button onClick={() => setVista('evento')} style={pillBtn(vista === 'evento')}>📊 Por evento</button>
                      <button onClick={() => setVista('criterio')} style={pillBtn(vista === 'criterio')}>📈 Por criterio</button>
                    </div>

                    {vista === 'criterio' && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8, fontSize: 11, color: 'var(--gray)' }}>
                        {criteriosInfo.map((c, i) => (
                          <span key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: colores[i % colores.length] }} />{c.short}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ position: 'relative', width: '100%', height: 260, marginBottom: 12 }}>
                      <canvas ref={chartRef} role="img" aria-label={`Gráfica de ${nombreCompleto(arbSel)}`}></canvas>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--gray2)', textAlign: 'center', marginBottom: 16 }}>
                      💡 Haz clic en una barra o punto para ver el detalle de ese evento
                    </div>

                    {eventoDetalle && (
                      <DetalleEvento evento={eventoDetalle} criterios={criteriosInfo} onClose={() => setEventoDetalle(null)} />
                    )}

                    <Button variant="secondary" fullWidth onClick={() => window.open(`/reporte/${arbSel.id}`, '_blank')}>
                      📄 Ver reporte completo en PDF
                    </Button>
                  </>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* ══════════ MODO COMPARAR ══════════ */}
      {modo === 'comparar' && (
        <div className="row2">
          <Card title={`SELECCIONAR ÁRBITROS (${seleccionados.length}/4)`} subtitle="Elige entre 2 y 4 árbitros para comparar">
            <Input value={busquedaComp} onChange={e => setBusquedaComp(e.target.value)} placeholder="Buscar árbitro..." icon="🔍" style={{ marginBottom: 8 }} />
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12 }}>
              {loadingArbs ? <div style={{ padding: 20, textAlign: 'center' }}><Spinner size={24} /></div>
                : arbsFiltradosComp.length === 0 ? <Empty icon="📊" title="Sin árbitros evaluados" />
                : arbsFiltradosComp.map(a => {
                  const sel = seleccionados.includes(a.id)
                  const idx = seleccionados.indexOf(a.id)
                  return (
                    <div key={a.id} onClick={() => toggleSeleccion(a.id)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderBottom: '1px solid var(--border)',
                      background: sel ? 'var(--light)' : 'white', cursor: 'pointer',
                      borderLeft: sel ? `4px solid ${COLORES_COMPARA[idx % 4]}` : '4px solid transparent',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{nombreCompleto(a)}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 2 }}>{a.provincia} · {a.licencia}</div>
                      </div>
                      {sel && <span style={{ color: COLORES_COMPARA[idx % 4], fontWeight: 700 }}>✓</span>}
                    </div>
                  )
                })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setModalidadComp('kumite')} style={tabBtn(modalidadComp === 'kumite', 'gold')}>🥋 Kumite</button>
              <button onClick={() => setModalidadComp('kata')} style={tabBtn(modalidadComp === 'kata', 'blue')}>🥋 Kata</button>
            </div>
            <Button variant="primary" fullWidth disabled={seleccionados.length < 2} onClick={cargarComparacion}>
              {loadingComp ? <Spinner size={14} color="white" /> : '⚖️ Comparar seleccionados'}
            </Button>
          </Card>

          <Card title="RESULTADO DE LA COMPARACIÓN">
            {!comparacion ? (
              <Empty icon="⚖️" title="Selecciona árbitros y compara" description="Elige entre 2 y 4 árbitros de la lista y presiona Comparar." />
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {comparacion.arbitros.map((a, i) => (
                    <div key={a.arbitro.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      borderRadius: 20, background: 'var(--light)', fontSize: 12,
                    }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORES_COMPARA[i % 4] }} />
                      <strong>{nombreCompleto(a.arbitro)}</strong>
                      <Badge variant={parseFloat(a.global?.promedio_total) >= 4 ? 'green' : parseFloat(a.global?.promedio_total) >= 3 ? 'gold' : 'red'}>
                        {a.global?.promedio_total || '—'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => setVistaComp('evento')} style={pillBtn(vistaComp === 'evento')}>📊 Por evento</button>
                  <button onClick={() => setVistaComp('criterio')} style={pillBtn(vistaComp === 'criterio')}>📈 Por criterio</button>
                </div>

                <div style={{ position: 'relative', width: '100%', height: 280, marginBottom: 8 }}>
                  <canvas ref={chartRef} role="img" aria-label="Gráfica comparativa"></canvas>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function DetalleEvento({ evento, criterios, onClose }) {
  return (
    <div style={{ background: 'var(--light)', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{evento.evento_nombre}</div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
            {evento.fecha ? new Date(evento.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            {' · '}{evento.num_evaluaciones} evaluación(es)
          </div>
        </div>
        <Badge variant={parseFloat(evento.promedio_total) >= 4 ? 'green' : parseFloat(evento.promedio_total) >= 3 ? 'gold' : 'red'}>{evento.promedio_total}</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${criterios.length}, 1fr)`, gap: 8 }}>
        {criterios.map(c => (
          <div key={c.key} style={{ textAlign: 'center', background: 'white', borderRadius: 8, padding: '8px 4px' }}>
            <div style={{ fontSize: 10, color: 'var(--gray)', marginBottom: 4 }}>{c.short}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--dark)' }}>{evento[c.key] || '—'}</div>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{ marginTop: 10, fontSize: 11, color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        Cerrar detalle
      </button>
    </div>
  )
}

function tabBtn(active, color) {
  const map = { gold: { bg: 'var(--gold-light)', border: 'var(--gold)', text: '#92400E' }, blue: { bg: 'var(--blue-light)', border: 'var(--blue)', text: 'var(--blue)' } }
  const c = map[color]
  return {
    flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
    border: active ? `2px solid ${c.border}` : '1px solid var(--border)',
    background: active ? c.bg : 'white', color: active ? c.text : 'var(--gray)',
  }
}

function pillBtn(active) {
  return {
    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'var(--font)', border: 'none',
    background: active ? 'var(--red)' : 'var(--light)', color: active ? 'white' : 'var(--dark)',
  }
}
