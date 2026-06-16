import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAsync, useToast, useDebounce } from '../hooks/useAsync'
import { AppShell, EventoBanner, PageHeader, CsvDropZone, EscudoUpload } from '../components/layout'
import { Button, Badge, Empty, ErrorState, ToastContainer, ScorePill } from '../components/ui'
import { Field, Input, Select } from '../components/forms'
import { Card, StatCard, Table, ProgressBar, AssignItem, CriteriaCard, ScorePanel } from '../components/data'
import api from '../api'
import { CRITERIOS, LICENCIAS, ESTADOS, nombreCompleto } from '../utils/criterios'
import EstadisticasGlobales from '../components/EstadisticasGlobales'

export default function Admin() {
  const { config, updateConfig } = useApp()
  const { toasts, toast } = useToast()
  const nav = useNavigate()

  // ── Navegación sidebar ──
  const [activeEvento, setActiveEvento] = useState(null)
  const [activeSub, setActiveSub] = useState(null)    // 'arb' | 'eval' | 'evaluar' | 'res'
  const [activeGlobal, setActiveGlobal] = useState(null) // 'bd-arb' | 'bd-eval' | 'config'
  const [showNewEvento, setShowNewEvento] = useState(false)

  // ── Datos globales ──
  const { data: eventos, loading: loadEvs, refresh: refreshEvs } =
    useAsync(() => api.get('/eventos').then(r => r.data), [])
  const { data: bdArbitros, loading: loadArbs, refresh: refreshArbs } =
    useAsync(() => api.get('/arbitros/todos').then(r => r.data), [])
  const { data: bdUsuarios, loading: loadUsers, refresh: refreshUsers } =
    useAsync(() => api.get('/usuarios').then(r => r.data), [])

  // ── Estado de asignación ──
  const [arbsAsig, setArbsAsig] = useState([])
  const [evalsAsig, setEvalsAsig] = useState([])
  const [loadingAsig, setLoadingAsig] = useState(false)

  // ── Estado evaluación (modo admin evalúa) ──
  const [arbIdx, setArbIdx] = useState(0)
  const [modalidadEval, setModalidadEval] = useState('kumite')
  const [modalidadRes, setModalidadRes] = useState('kumite')
  const [scores, setScores] = useState({})
  const [comentarios, setComentarios] = useState({})
  const [guardados, setGuardados] = useState({})
  const [saving, setSaving] = useState(false)

  // ── Resultados ──
  const [resultados, setResultados] = useState([])
  const [detalle, setDetalle] = useState([])
  const [vistaRes, setVistaRes] = useState('resumen')

  // ── Password panel ──
  const [pwPanel, setPwPanel] = useState(null)
  const [pwNew, setPwNew] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [pwErr, setPwErr] = useState('')

  // ── Búsqueda ──
  const [busqArb, setBusqArb] = useState('')
  const [busqEval, setBusqEval] = useState('')
  const busqArbD = useDebounce(busqArb)
  const busqEvalD = useDebounce(busqEval)

  // ── Cargar asignaciones cuando cambia evento/sub ──
  useEffect(() => {
    if (!activeEvento || activeSub !== 'arb' && activeSub !== 'eval') return
    cargarAsignaciones(activeEvento.id)
  }, [activeEvento?.id, activeSub])

  // ── Cargar resultados (recarga al cambiar evento, sección o modalidad) ──
  useEffect(() => {
    if (!activeEvento || activeSub !== 'res') return
    cargarResultados(activeEvento.id, modalidadRes)
  }, [activeEvento?.id, activeSub, modalidadRes])

  // ── Iniciar evaluación ──
  useEffect(() => {
    if (!activeEvento || activeSub !== 'evaluar') return
    setArbIdx(0)
  }, [activeEvento?.id, activeSub])

  // ── Cargar eval existente al cambiar árbitro o modalidad ──
  const arbsDelEvento = activeEvento
    ? (bdArbitros || []).filter(a => arbsAsig.includes(a.id))
    : []

  useEffect(() => {
    if (!activeEvento || activeSub !== 'evaluar') return
    const arb = arbsDelEvento[arbIdx]
    if (!arb) return
    api.get(`/evaluaciones/mia/arbitro/${arb.id}/evento/${activeEvento.id}?modalidad=${modalidadEval}`)
      .then(r => {
        const crits = CRITERIOS[modalidadEval] || CRITERIOS.kumite
        const s = {}
        crits.forEach(c => { s[c.key] = r.data && r.data[c.key] ? parseFloat(r.data[c.key]) : 0 })
        setScores(prev => ({ ...prev, [arb.id]: s }))
        setComentarios(prev => ({ ...prev, [arb.id]: r.data?.comentario || '' }))
        setGuardados(prev => ({ ...prev, [arb.id]: !!r.data }))
      }).catch(() => {})
  }, [arbIdx, activeEvento?.id, activeSub, modalidadEval])

  // ── Handlers navegación ──
  function handleSelectSub(ev, sub) {
    setActiveEvento(ev)
    setActiveSub(sub)
    setActiveGlobal(null)
    setShowNewEvento(false)
    setBusqArb(''); setBusqEval('')
    if (sub === 'arb' || sub === 'eval') cargarAsignaciones(ev.id)
    if (sub === 'res') cargarResultados(ev.id, modalidadRes)
    if (sub === 'evaluar') { setArbIdx(0); setGuardados({}); cargarAsignaciones(ev.id) }
  }

  function handleSelectGlobal(id) {
    setActiveGlobal(id)
    setActiveSub(null)
    setActiveEvento(null)
    setShowNewEvento(false)
  }

  function handleNewEvento() {
    setShowNewEvento(true)
    setActiveSub(null)
    setActiveGlobal(null)
  }

  async function cargarAsignaciones(evId) {
    setLoadingAsig(true)
    try {
      const [ra, re] = await Promise.all([
        api.get(`/arbitros/evento/${evId}`),
        api.get(`/eventos/${evId}/evaluadores`),
      ])
      setArbsAsig(ra.data.map(a => a.id))
      setEvalsAsig(re.data.map(u => u.id))
    } catch { toast.error('Error al cargar asignaciones') }
    finally { setLoadingAsig(false) }
  }

  async function cargarResultados(evId, modalidad) {
    try {
      const [rr, rd] = await Promise.all([
        api.get(`/evaluaciones/resumen/evento/${evId}?modalidad=${modalidad}`),
        api.get(`/evaluaciones/detalle/evento/${evId}?modalidad=${modalidad}`),
      ])
      setResultados(rr.data.rows || rr.data); setDetalle(rd.data.rows || rd.data)
    } catch { toast.error('Error al cargar resultados') }
  }

  // ── Handlers Eventos ──
  async function handleCrearEvento(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      const { data } = await api.post('/eventos', Object.fromEntries(fd))
      e.target.reset(); await refreshEvs()
      toast.success(`✓ Evento "${data.nombre}" creado`)
      setShowNewEvento(false)
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  // ── Handlers Árbitros ──
  async function handleCrearArbitro(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/arbitros', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      e.target.reset(); await refreshArbs()
      toast.success('✓ Árbitro agregado a la base de datos')
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  async function handleCSVArbitros(e) {
    const file = e.target.files[0]; if (!file) return
    const texto = await file.text()
    const arbs = texto.split('\n').filter(l => l.trim()).map(l => {
      const [nombre, apellido, provincia, club, fepaka_id, licencia] = l.split(',').map(x => x.trim())
      return { nombre: `${nombre} ${apellido || ''}`.trim(), provincia, club, fepaka_id, licencia }
    })
    try {
      const { data } = await api.post('/arbitros/csv', { arbitros: arbs })
      await refreshArbs(); toast.success(`✓ ${data.insertados} árbitros importados`)
    } catch { toast.error('Error al importar CSV') }
    e.target.value = ''
  }

  // ── Handlers Evaluadores ──
  async function handleCrearUsuario(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/usuarios', Object.fromEntries(fd))
      e.target.reset(); await refreshUsers()
      toast.success('✓ Evaluador creado')
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  async function handleCSVUsuarios(e) {
    const file = e.target.files[0]; if (!file) return
    const texto = await file.text()
    const usrs = texto.split('\n').filter(l => l.trim()).map(l => {
      const [nombre, apellido, username, password, rol] = l.split(',').map(x => x.trim())
      return { nombre: `${nombre} ${apellido || ''}`.trim(), username, password, rol: rol || 'evaluador' }
    })
    try {
      const { data } = await api.post('/usuarios/csv', { usuarios: usrs })
      await refreshUsers(); toast.success(`✓ ${data.insertados} evaluadores importados`)
    } catch { toast.error('Error al importar') }
    e.target.value = ''
  }

  async function handleCambiarPassword(uid) {
    if (!pwNew) { setPwErr('Escribe el nuevo password'); return }
    if (pwNew.length < 4) { setPwErr('Mínimo 4 caracteres'); return }
    if (pwNew !== pwConf) { setPwErr('Las contraseñas no coinciden'); return }
    try {
      await api.put(`/usuarios/${uid}/password`, { password: pwNew })
      setPwPanel(null); setPwNew(''); setPwConf(''); setPwErr('')
      toast.success('✓ Password actualizado')
    } catch (err) { setPwErr(err.response?.data?.error || 'Error') }
  }

  // ── Handlers Asignación ──
  async function toggleArbitro(arbId) {
    if (!activeEvento) return
    const on = arbsAsig.includes(arbId)
    try {
      if (on) await api.delete(`/eventos/${activeEvento.id}/arbitros/${arbId}`)
      else    await api.post(`/eventos/${activeEvento.id}/arbitros`, { arbitro_id: arbId })
      setArbsAsig(prev => on ? prev.filter(id => id !== arbId) : [...prev, arbId])
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  async function toggleEvaluador(usrId) {
    if (!activeEvento) return
    const on = evalsAsig.includes(usrId)
    try {
      if (on) await api.delete(`/eventos/${activeEvento.id}/evaluadores/${usrId}`)
      else    await api.post(`/eventos/${activeEvento.id}/evaluadores`, { usuario_id: usrId })
      setEvalsAsig(prev => on ? prev.filter(id => id !== usrId) : [...prev, usrId])
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  // ── Handlers Evaluación ──
  const arbActual = arbsDelEvento[arbIdx]
  const arbScores = arbActual ? (scores[arbActual.id] || {}) : {}
  const arbComentario = arbActual ? (comentarios[arbActual.id] || '') : ''
  const criteriosAdmin = CRITERIOS[modalidadEval] || CRITERIOS.kumite
  const todoCompleto = criteriosAdmin.every(c => (arbScores[c.key] || 0) > 0)
  const evaluadosCount = arbsDelEvento.filter(a => guardados[a.id]).length

  function handleScore(criterio, valor) {
    if (!arbActual) return
    setScores(prev => ({ ...prev, [arbActual.id]: { ...(prev[arbActual.id] || {}), [criterio]: valor } }))
  }

  async function guardarEval() {
    if (!todoCompleto) { toast.error('Evalúa los 5 criterios antes de guardar'); return }
    setSaving(true)
    try {
      await api.post('/evaluaciones', {
        evento_id: activeEvento.id, arbitro_id: arbActual.id,
        modalidad: modalidadEval, area_id: arbActual.area_id || null,
        ...arbScores, comentario: arbComentario || null,
      })
      setGuardados(prev => ({ ...prev, [arbActual.id]: true }))
      toast.success(`✓ ${arbActual.nombre} evaluado`)
      setTimeout(() => { if (arbIdx < arbsDelEvento.length - 1) setArbIdx(i => i + 1) }, 1200)
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  // ── Filtros ──
  const arbsFilt = (bdArbitros || []).filter(a => {
    if (!busqArbD) return true
    const q = busqArbD.toLowerCase()
    return nombreCompleto(a).toLowerCase().includes(q) ||
           a.fepaka_id?.toLowerCase().includes(q) ||
           a.provincia?.toLowerCase().includes(q)
  })
  const evalsFilt = (bdUsuarios || []).filter(u =>
    !busqEvalD || u.nombre.toLowerCase().includes(busqEvalD.toLowerCase()) ||
    u.username?.toLowerCase().includes(busqEvalD.toLowerCase())
  )

  // ── Columnas tablas ──
  const colsArbs = [
    { header: 'Nombre', key: 'nombre', cell: r => <strong>{nombreCompleto(r)}</strong> },
    { header: 'Provincia', key: 'provincia' },
    { header: 'Club', key: 'club' },
    { header: 'FEPAKA ID', key: 'fepaka_id', cell: r => <code>{r.fepaka_id}</code> },
    { header: 'Licencia', key: 'licencia', cell: r => <Badge variant="blue">{r.licencia}</Badge> },
  ]
  const criteriosRes = CRITERIOS[modalidadRes] || CRITERIOS.kumite
  const colsRes = [
    { header: 'Árbitro', key: 'nombre', cell: r => <strong>{r.nombre}</strong> },
    { header: 'Provincia', key: 'provincia' },
    { header: 'Licencia', key: 'licencia', cell: r => <Badge variant="blue">{r.licencia}</Badge> },
    ...criteriosRes.map(c => ({ header: c.short, key: 'prom_' + c.key, cell: r => r['prom_' + c.key] || '—' })),
    { header: 'Promedio', key: 'promedio_total', cell: r => <ScorePill value={r.promedio_total} /> },
    { header: 'Eval.', key: 'num_evaluaciones', cell: r => <span style={{ color: 'var(--gray)', fontSize: 12 }}>{r.num_evaluaciones}</span> },
  ]
  const colsDet = [
    { header: 'Árbitro', key: 'arbitro_nombre', cell: r => <><strong>{r.arbitro_nombre}</strong><br/><span style={{ fontSize: 11, color: 'var(--gray2)' }}>{r.licencia}</span></> },
    { header: 'Evaluador', key: 'evaluador_nombre' },
    ...criteriosRes.map(c => ({ header: c.short, key: c.key, cell: r => r[c.key] ? parseFloat(r[c.key]).toFixed(1) : '—' })),
    { header: 'Prom.', key: 'promedio_evaluador', cell: r => <ScorePill value={r.promedio_evaluador} /> },
    { header: 'Comentario', key: 'comentario', cell: r => (
      <span style={{ fontSize: 12, color: 'var(--gray)', fontStyle: r.comentario ? 'normal' : 'italic', maxWidth: 180, display: 'block' }}>
        {r.comentario || 'Sin comentarios'}
      </span>
    )},
  ]

  const apiBase = (import.meta.env.VITE_API_URL || '').replace('/api', '')

  return (
    <>
      <ToastContainer toasts={toasts} />
      <AppShell
        eventos={eventos || []}
        activeEvento={activeEvento}
        activeSub={activeSub}
        activeGlobal={activeGlobal}
        onSelectSub={handleSelectSub}
        onSelectGlobal={handleSelectGlobal}
        onNewEvento={handleNewEvento}
      >

        {/* ── BIENVENIDA ── */}
        {!activeSub && !activeGlobal && !showNewEvento && (
          <div>
            <PageHeader title="BIENVENIDO" subtitle="Selecciona un evento del panel izquierdo para comenzar" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              <StatCard label="Eventos" value={eventos?.length || 0} icon="📅" />
              <StatCard label="Árbitros" value={bdArbitros?.length || 0} icon="🥋" />
              <StatCard label="Evaluadores" value={bdUsuarios?.length || 0} icon="👤" />
            </div>
            <Card title="EVENTOS REGISTRADOS">
              <Table
                columns={[
                  { header: 'Evento', key: 'nombre', cell: r => <strong>{r.nombre}</strong> },
                  { header: 'Fecha', key: 'fecha', cell: r => r.fecha ? new Date(r.fecha).toLocaleDateString('es-ES') : '—' },
                  { header: 'Estado', key: 'estado', cell: r => {
                    const v = r.estado === 'activo' ? 'green' : r.estado === 'finalizado' ? 'red' : r.estado === 'detenido' ? 'gold' : 'blue'
                    return <Badge variant={v}>{r.estado}</Badge>
                  }},
                  { header: 'Cambiar estado', key: '_est', cell: r => (
                    <select defaultValue={r.estado}
                      onChange={async e => { await api.patch('/eventos/' + r.id + '/estado', { estado: e.target.value }); refreshEvs() }}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, fontFamily: 'var(--font)', cursor: 'pointer' }}>
                      <option value="activo">Activo</option>
                      <option value="detenido">Detenido</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  )},
                  { header: 'Acción', key: '_acc', cell: r => <Button size="xs" variant="secondary" onClick={() => handleSelectSub(r, 'arb')}>Gestionar</Button> },
                ]}
                rows={eventos} loading={loadEvs} keyExtractor={r => r.id}
                empty={<Empty icon="📅" title="Sin eventos" description="Crea el primer evento." />}
              />
            </Card>
          </div>
        )}

        {/* ── NUEVO EVENTO ── */}
        {showNewEvento && (
          <div>
            <PageHeader title="CREAR NUEVO EVENTO" subtitle="Los árbitros y evaluadores se asignan después" />
            <Card>
              <form onSubmit={handleCrearEvento}>
                <div className="row2">
                  <Field label="Nombre del evento" required><Input name="nombre" placeholder="Panamericano Panamá 2026" required /></Field>
                  <Field label="Sede"><Input name="sede" placeholder="Ciudad, País" /></Field>
                </div>
                <div className="row2">
                  <Field label="Fecha inicio"><Input name="fecha" type="date" /></Field>
                  <Field label="Fecha fin"><Input name="fecha_fin" type="date" /></Field>
                </div>
                <div className="row2">
                  <Field label="Núm. evaluadores"><Input name="num_evaluadores" type="number" min="1" max="20" defaultValue="4" /></Field>
                  <div></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="submit" variant="primary">Crear evento</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowNewEvento(false)}>Cancelar</Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── ÁRBITROS DEL EVENTO ── */}
        {activeSub === 'arb' && activeEvento && (
          <div>
            <EventoBanner evento={activeEvento} />
            <PageHeader title="ÁRBITROS DEL EVENTO" subtitle="Selecciona los árbitros que participan en este evento" />
            <Card>
              <Input value={busqArb} onChange={e => setBusqArb(e.target.value)} placeholder="Buscar árbitro..." icon="🔍" style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                {loadingAsig
                  ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>Cargando...</div>
                  : arbsFilt.length === 0
                    ? <Empty icon="🔍" title="Sin resultados" />
                    : arbsFilt.map(a => (
                      <AssignItem key={a.id} name={nombreCompleto(a)}
                        sub={`${a.provincia} · ${a.licencia} · ${a.fepaka_id}`}
                        assigned={arbsAsig.includes(a.id)}
                        onToggle={() => toggleArbitro(a.id)}
                      />
                    ))
                }
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray)' }}>Asignados: <strong>{arbsAsig.length}</strong></div>
            </Card>
          </div>
        )}

        {/* ── EVALUADORES DEL EVENTO ── */}
        {activeSub === 'eval' && activeEvento && (
          <div>
            <EventoBanner evento={activeEvento} />
            <PageHeader title="EVALUADORES DEL EVENTO" subtitle="Selecciona los evaluadores que calificarán en este evento" />
            <Card>
              <Input value={busqEval} onChange={e => setBusqEval(e.target.value)} placeholder="Buscar evaluador..." icon="🔍" style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                {loadingAsig
                  ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>Cargando...</div>
                  : evalsFilt.length === 0
                    ? <Empty icon="🔍" title="Sin resultados" />
                    : evalsFilt.map(u => (
                      <AssignItem key={u.id} name={u.nombre}
                        sub={`${u.username} · ${u.rol}`}
                        assigned={evalsAsig.includes(u.id)}
                        onToggle={() => toggleEvaluador(u.id)}
                      />
                    ))
                }
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray)' }}>Asignados: <strong>{evalsAsig.length}</strong></div>
            </Card>
          </div>
        )}

        {/* ── EVALUAR (modo admin) ── */}
        {activeSub === 'evaluar' && activeEvento && (
          <div>
            <EventoBanner evento={activeEvento} />

            {/* Selector libre de modalidad */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Button variant={modalidadEval === 'kumite' ? 'primary' : 'secondary'}
                onClick={() => { setModalidadEval('kumite'); setGuardados({}) }}>
                🥋 Kumite
              </Button>
              <Button variant={modalidadEval === 'kata' ? 'primary' : 'secondary'}
                onClick={() => { setModalidadEval('kata'); setGuardados({}) }}>
                🥋 Kata
              </Button>
            </div>

            {arbsDelEvento.length === 0
              ? <Empty icon="🥋" title="Sin árbitros asignados" description="Asigna árbitros al evento primero." />
              : <>
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
                  <ProgressBar value={evaluadosCount} max={arbsDelEvento.length || 1}
                    label={`Progreso — ${modalidadEval.toUpperCase()}`} sublabel={`${evaluadosCount} / ${arbsDelEvento.length} evaluados`} />
                </div>
                {arbActual && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px', marginBottom: 14 }}>
                      <button onClick={() => setArbIdx(i => Math.max(0, i - 1))} disabled={arbIdx === 0}
                        style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: arbIdx === 0 ? 'not-allowed' : 'pointer', opacity: arbIdx === 0 ? 0.3 : 1, fontSize: 16 }}>←</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gray2)', overflow: 'hidden' }}>
                          {arbActual.foto_url
                            ? <img src={`${apiBase}${arbActual.foto_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : nombreCompleto(arbActual).split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase()
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{arbActual.nombre}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{arbActual.provincia} · {arbActual.licencia}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 1 }}>{arbActual.club} · {arbActual.fepaka_id}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--gray)' }}>{arbIdx + 1} / {arbsDelEvento.length}</div>
                        <div style={{ fontSize: 11, marginTop: 3, color: guardados[arbActual.id] ? 'var(--green)' : 'var(--gray2)' }}>
                          {guardados[arbActual.id] ? '✓ Evaluado' : 'Sin evaluar'}
                        </div>
                      </div>
                      <button onClick={() => setArbIdx(i => Math.min(arbsDelEvento.length - 1, i + 1))} disabled={arbIdx === arbsDelEvento.length - 1}
                        style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: arbIdx === arbsDelEvento.length - 1 ? 'not-allowed' : 'pointer', opacity: arbIdx === arbsDelEvento.length - 1 ? 0.3 : 1, fontSize: 16 }}>→</button>
                    </div>
                    <ScorePanel scores={arbScores} criterios={criteriosAdmin} />
                    {criteriosAdmin.map(c => (
                      <CriteriaCard key={c.key} label={c.label}
                        value={arbScores[c.key] || 0} onChange={val => handleScore(c.key, val)} disabled={saving} />
                    ))}
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
                        Comentarios <span style={{ fontWeight: 400, color: 'var(--gray2)' }}>(opcional)</span>
                      </div>
                      <textarea value={arbComentario} onChange={e => setComentarios(prev => ({ ...prev, [arbActual.id]: e.target.value }))}
                        placeholder="Observaciones adicionales..." rows={3} disabled={saving}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', lineHeight: 1.5, transition: 'border .2s' }}
                        onFocus={e => e.target.style.borderColor = 'var(--red)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    </div>
                    <Button variant={todoCompleto ? 'success' : 'secondary'} fullWidth size="lg"
                      onClick={guardarEval} loading={saving} disabled={!todoCompleto}>
                      {todoCompleto ? 'Guardar y continuar →' : 'Completa los 5 criterios para guardar'}
                    </Button>
                  </>
                )}
              </>
            }
          </div>
        )}

        {/* ── RESULTADOS ── */}
        {activeSub === 'res' && activeEvento && (
          <div>
            <EventoBanner evento={activeEvento} />
            <PageHeader title="RESULTADOS" />
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <Button variant={modalidadRes === 'kumite' ? 'primary' : 'secondary'} onClick={() => setModalidadRes('kumite')}>🥋 Kumite</Button>
              <Button variant={modalidadRes === 'kata' ? 'primary' : 'secondary'} onClick={() => setModalidadRes('kata')}>🥋 Kata</Button>
              <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
              <Button variant={vistaRes === 'resumen' ? 'primary' : 'secondary'} onClick={() => setVistaRes('resumen')}>📊 Promedios generales</Button>
              <Button variant={vistaRes === 'detalle' ? 'primary' : 'secondary'} onClick={() => setVistaRes('detalle')}>👤 Por evaluador</Button>
            </div>
            {vistaRes === 'resumen' && (
              <Card title={`PROMEDIOS GENERALES — ${modalidadRes.toUpperCase()}`}>
                <Table columns={colsRes} rows={resultados.filter(r => true)} keyExtractor={r => r.id}
                  empty={<Empty icon="📊" title="Sin evaluaciones" description="No hay evaluaciones guardadas aún." />} />
              </Card>
            )}
            {vistaRes === 'detalle' && (
              <Card title={`POR EVALUADOR — ${modalidadRes.toUpperCase()}`}>
                <Table columns={colsDet} rows={detalle.filter(r => r.modalidad === modalidadRes)} keyExtractor={r => r.id}
                  empty={<Empty icon="👤" title="Sin evaluaciones individuales" />} />
              </Card>
            )}
          </div>
        )}

        {/* ── BASE ÁRBITROS ── */}
        {activeGlobal === 'bd-arb' && (
          <div>
            <PageHeader title="BASE DE ÁRBITROS" subtitle={`${bdArbitros?.length || 0} árbitros registrados`} />
            <Card title="IMPORTAR DESDE CSV">
              <CsvDropZone accept=".csv,.txt" onChange={handleCSVArbitros}
                description="Formato: nombre, apellido, provincia, club, FEPAKA ID, licencia"
                hint="Ejemplo: Carlos,Mendoza,Panamá,Dojo Kan,FEP-0042,Nacional A" />
            </Card>
            <Card title="AGREGAR ÁRBITRO INDIVIDUAL">
              <form onSubmit={handleCrearArbitro}>
                <div className="row2">
                  <Field label="Nombre" required><Input name="nombre" placeholder="Nombre" required /></Field>
                  <Field label="Apellido"><Input name="apellido" placeholder="Apellido" /></Field>
                </div>
                <div className="row2">
                  <Field label="Provincia"><Input name="provincia" placeholder="Provincia" /></Field>
                  <Field label="Club"><Input name="club" placeholder="Club" /></Field>
                </div>
                <div className="row2">
                  <Field label="FEPAKA ID"><Input name="fepaka_id" placeholder="FEP-0001" /></Field>
                  <Field label="Licencia"><Select name="licencia">{LICENCIAS.map(l => <option key={l}>{l}</option>)}</Select></Field>
                </div>
                <Field label="Foto (opcional)"><Input name="foto" type="file" accept="image/*" /></Field>
                <Button type="submit" variant="primary">Agregar a base de datos</Button>
              </form>
            </Card>
            <Card title={`BASE GLOBAL — ${bdArbitros?.length || 0} árbitros`}>
              <Table columns={colsArbs} rows={bdArbitros} loading={loadArbs} keyExtractor={r => r.id}
                empty={<Empty icon="🥋" title="Sin árbitros" description="Agrega árbitros arriba o importa un CSV." />} />
            </Card>
          </div>
        )}

        {/* ── BASE EVALUADORES ── */}
        {activeGlobal === 'bd-eval' && (
          <div>
            <PageHeader title="BASE DE EVALUADORES" subtitle="Registro global de evaluadores del sistema" />
            <Card title="IMPORTAR DESDE CSV">
              <CsvDropZone accept=".csv,.txt" onChange={handleCSVUsuarios}
                description="Formato: nombre, apellido, usuario, contraseña, rol" />
            </Card>
            <Card title="AGREGAR EVALUADOR">
              <form onSubmit={handleCrearUsuario}>
                <div className="row2">
                  <Field label="Nombre completo" required><Input name="nombre" placeholder="Nombre completo" required /></Field>
                  <Field label="Usuario" required><Input name="username" placeholder="usuario" required /></Field>
                </div>
                <div className="row2">
                  <Field label="Contraseña" required><Input name="password" type="password" placeholder="Contraseña" required /></Field>
                  <Field label="Rol"><Select name="rol"><option value="evaluador">Evaluador</option><option value="admin">Administrador</option></Select></Field>
                </div>
                <Button type="submit" variant="primary">Agregar a base de datos</Button>
              </form>
            </Card>
            <Card title="EVALUADORES REGISTRADOS">
              {loadUsers
                ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray)' }}>Cargando...</div>
                : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>{['Nombre','Usuario','Rol','Estado','Password'].map(h => (
                    <th key={h} style={{ background:'var(--dark)',color:'rgba(255,255,255,.6)',padding:'9px 14px',textAlign:'left',fontSize:10,letterSpacing:'1px',textTransform:'uppercase',fontWeight:500 }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {(bdUsuarios || []).map(u => (
                      <tr key={u.id}>
                        <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}><strong>{u.nombre}</strong></td>
                        <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}><code style={{fontSize:11,background:'var(--light)',padding:'2px 6px',borderRadius:4}}>{u.username}</code></td>
                        <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}><Badge variant={u.rol==='admin'?'red':'blue'}>{u.rol}</Badge></td>
                        <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}><Badge variant={u.activo?'green':'gold'}>{u.activo?'Activo':'Inactivo'}</Badge></td>
                        <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}>
                          {pwPanel === u.id ? (
                            <div style={{ background:'var(--light)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',minWidth:240 }}>
                              <Field label="Nuevo password" error={pwErr}>
                                <Input type="password" value={pwNew} onChange={e=>{setPwNew(e.target.value);setPwErr('')}} placeholder="Nuevo password" />
                              </Field>
                              <Field label="Confirmar">
                                <Input type="password" value={pwConf} onChange={e=>{setPwConf(e.target.value);setPwErr('')}} placeholder="Repetir password" />
                              </Field>
                              {pwErr && <div style={{fontSize:11,color:'var(--red)',marginBottom:8}}>{pwErr}</div>}
                              <div style={{display:'flex',gap:6}}>
                                <Button size="sm" variant="success" onClick={()=>handleCambiarPassword(u.id)}>✓ Guardar</Button>
                                <Button size="sm" variant="secondary" onClick={()=>{setPwPanel(null);setPwNew('');setPwConf('');setPwErr('')}}>Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="xs" variant="secondary" onClick={()=>{setPwPanel(u.id);setPwNew('');setPwConf('');setPwErr('')}}>🔑 Cambiar password</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {/* ── CONFIGURACIÓN ── */}
        {/* ── ESTADÍSTICAS GLOBALES ── */}
        {activeGlobal === 'stats' && (
          <EstadisticasGlobales />
        )}

        {activeGlobal === 'config' && (
          <div>
            <PageHeader title="CONFIGURACIÓN" subtitle="Personaliza la apariencia del sistema" />
            <Card title="ESCUDO DE LA FEDERACIÓN" subtitle="El escudo aparece en el login y en el encabezado de todas las páginas">
              <EscudoUpload
                escudo={config.escudo}
                onChange={data => { updateConfig({ escudo: data }); toast.success('✓ Escudo actualizado') }}
                onRemove={() => { updateConfig({ escudo: null }); toast.success('Escudo eliminado') }}
              />
            </Card>
            <Card title="NOMBRE DE LA FEDERACIÓN">
              <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); updateConfig({ fedNombre: fd.get('fed_nombre') || 'FEPAKA' }); toast.success('✓ Configuración guardada') }}>
                <Field label="Nombre en el encabezado">
                  <Input name="fed_nombre" defaultValue={config.fedNombre} style={{ fontSize: 15, fontWeight: 500 }} />
                </Field>
                <Button type="submit" variant="primary">Guardar configuración</Button>
              </form>
            </Card>
          </div>
        )}

      </AppShell>
    </>
  )
}
