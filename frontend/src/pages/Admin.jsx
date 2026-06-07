import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAsync, useToast, useDebounce } from '../hooks/useAsync'
import { AppShell, NavTabs, PageHeader } from '../components/layout'
import { Button, Badge, Empty, ErrorState, ToastContainer, ScorePill, Skeleton } from '../components/ui'
import { Field, Input, Select, FileDropZone } from '../components/forms'
import { Card, StatCard, Table, ProgressBar, AssignItem } from '../components/data'
import api from '../api'

const LICENCIAS = ['Nacional A','Nacional B','Nacional C','Provincial A','Provincial B','Provincial C']

const TABS = [
  { id: 'eventos',   label: 'Eventos',          icon: '📅' },
  { id: 'bd-arb',   label: 'Base Árbitros',     icon: '🥋' },
  { id: 'bd-eval',  label: 'Base Evaluadores',  icon: '👤' },
  { id: 'asignar',  label: 'Asignar a Evento',  icon: '🔗' },
  { id: 'config',   label: 'Configuración',     icon: '⚙️' },
  { id: 'resultados',label: 'Resultados',       icon: '📊' },
  { id: 'evaluar',  label: '▶ Evaluar',         icon: null  },
]

export default function Admin() {
  const { config, updateConfig } = useApp()
  const { toasts, toast } = useToast()
  const nav = useNavigate()
  const [tab, setTab] = useState('eventos')

  // ── Datos globales ──
  const { data: eventos, loading: loadingEventos, refresh: refreshEventos, error: errorEventos } =
    useAsync(() => api.get('/eventos').then(r => r.data), [])

  const { data: bdArbitros, loading: loadingArbs, refresh: refreshArbs } =
    useAsync(() => api.get('/arbitros/todos').then(r => r.data), [])

  const { data: bdUsuarios, loading: loadingUsers, refresh: refreshUsers } =
    useAsync(() => api.get('/usuarios').then(r => r.data), [])

  // ── Estado por tab ──
  const [evActivo, setEvActivo] = useState(null)
  const [evRes, setEvRes] = useState(null)
  const [arbsAsig, setArbsAsig] = useState([])   // IDs asignados al evento
  const [evalsAsig, setEvalsAsig] = useState([])  // IDs asignados al evento
  const [resultados, setResultados] = useState([])
  const [detalle, setDetalle] = useState([])
  const [vistaRes, setVistaRes] = useState('resumen')
  const [loadingAsig, setLoadingAsig] = useState(false)
  const [pwPanel, setPwPanel] = useState(null)
  const [pwNew, setPwNew] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [pwErr, setPwErr] = useState('')

  // ── Búsqueda con debounce ──
  const [busqArb, setBusqArb] = useState('')
  const [busqEval, setBusqEval] = useState('')
  const busqArbD = useDebounce(busqArb)
  const busqEvalD = useDebounce(busqEval)

  // ── Seleccionar evento activo cuando cargan ──
  useEffect(() => {
    if (eventos?.length && !evActivo) { setEvActivo(eventos[0]); setEvRes(eventos[0]) }
  }, [eventos])

  // ── Cargar asignaciones cuando cambia evento activo ──
  useEffect(() => {
    if (!evActivo || tab !== 'asignar') return
    cargarAsignaciones(evActivo.id)
  }, [evActivo?.id, tab])

  // ── Cargar resultados cuando cambia evento res ──
  useEffect(() => {
    if (!evRes || tab !== 'resultados') return
    cargarResultados(evRes.id)
  }, [evRes?.id, tab])

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

  async function cargarResultados(evId) {
    try {
      const [rr, rd] = await Promise.all([
        api.get(`/evaluaciones/resumen/evento/${evId}`),
        api.get(`/evaluaciones/detalle/evento/${evId}`),
      ])
      setResultados(rr.data)
      setDetalle(rd.data)
    } catch { toast.error('Error al cargar resultados') }
  }

  // ── Handlers: Eventos ──
  async function handleCrearEvento(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/eventos', Object.fromEntries(fd))
      e.target.reset(); await refreshEventos()
      toast.success('✓ Evento creado correctamente')
    } catch (err) { toast.error(err.response?.data?.error || 'Error al crear evento') }
  }

  // ── Handlers: Árbitros ──
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
      await refreshArbs()
      toast.success(`✓ ${data.insertados} árbitros importados`)
    } catch { toast.error('Error al importar CSV') }
    e.target.value = ''
  }

  // ── Handlers: Evaluadores ──
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
      await refreshUsers()
      toast.success(`✓ ${data.insertados} evaluadores importados`)
    } catch { toast.error('Error al importar') }
    e.target.value = ''
  }

  async function handleCambiarPassword(userId) {
    if (!pwNew) { setPwErr('Escribe el nuevo password'); return }
    if (pwNew.length < 4) { setPwErr('Mínimo 4 caracteres'); return }
    if (pwNew !== pwConf) { setPwErr('Las contraseñas no coinciden'); return }
    try {
      await api.put(`/usuarios/${userId}/password`, { password: pwNew })
      setPwPanel(null); setPwNew(''); setPwConf(''); setPwErr('')
      toast.success('✓ Password actualizado')
    } catch (err) { setPwErr(err.response?.data?.error || 'Error') }
  }

  // ── Handlers: Asignación ──
  async function toggleArbitro(arbId) {
    if (!evActivo) return
    const on = arbsAsig.includes(arbId)
    try {
      if (on) await api.delete(`/eventos/${evActivo.id}/arbitros/${arbId}`)
      else    await api.post(`/eventos/${evActivo.id}/arbitros`, { arbitro_id: arbId })
      setArbsAsig(prev => on ? prev.filter(id => id !== arbId) : [...prev, arbId])
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  async function toggleEvaluador(usrId) {
    if (!evActivo) return
    const on = evalsAsig.includes(usrId)
    try {
      if (on) await api.delete(`/eventos/${evActivo.id}/evaluadores/${usrId}`)
      else    await api.post(`/eventos/${evActivo.id}/evaluadores`, { usuario_id: usrId })
      setEvalsAsig(prev => on ? prev.filter(id => id !== usrId) : [...prev, usrId])
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
  }

  // ── Handlers: Config ──
  async function handleEscudo(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { updateConfig({ escudo: ev.target.result }); toast.success('✓ Escudo actualizado') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleConfig(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    updateConfig({ fedNombre: fd.get('fed_nombre') || 'FEPAKA' })
    toast.success('✓ Configuración guardada')
  }

  // ── Filtros ──
  const arbsFilt = (bdArbitros || []).filter(a =>
    !busqArbD || a.nombre.toLowerCase().includes(busqArbD.toLowerCase()) ||
    a.fepaka_id?.toLowerCase().includes(busqArbD.toLowerCase())
  )
  const evalsFilt = (bdUsuarios || []).filter(u =>
    !busqEvalD || u.nombre.toLowerCase().includes(busqEvalD.toLowerCase()) ||
    u.username?.toLowerCase().includes(busqEvalD.toLowerCase())
  )

  // ── Columnas de tablas ──
  const colsEventos = [
    { header: 'Evento', key: 'nombre', cell: r => <strong>{r.nombre}</strong> },
    { header: 'Fecha', key: 'fecha', cell: r => r.fecha ? new Date(r.fecha).toLocaleDateString('es-ES') : '—' },
    { header: 'Sede', key: 'sede', cell: r => r.sede || '—' },
    { header: 'Estado', key: 'estado', cell: r => <Badge variant={r.estado === 'activo' ? 'green' : 'gold'}>{r.estado}</Badge> },
    { header: 'Acción', key: '_', cell: r => (
      <Button size="xs" variant="secondary" onClick={() => { setEvActivo(r); setTab('asignar') }}>Gestionar</Button>
    )},
  ]

  const colsArbitros = [
    { header: 'Nombre', key: 'nombre', cell: r => <strong>{r.nombre}</strong> },
    { header: 'Provincia', key: 'provincia' },
    { header: 'Club', key: 'club' },
    { header: 'FEPAKA ID', key: 'fepaka_id', cell: r => <code>{r.fepaka_id}</code> },
    { header: 'Licencia', key: 'licencia', cell: r => <Badge variant="blue">{r.licencia}</Badge> },
  ]

  const colsResultados = [
    { header: 'Árbitro', key: 'nombre', cell: r => <><strong>{r.nombre}</strong></> },
    { header: 'Provincia', key: 'provincia' },
    { header: 'Licencia', key: 'licencia', cell: r => <Badge variant="blue">{r.licencia}</Badge> },
    { header: 'Conform.', key: 'prom_conformidad', cell: r => r.prom_conformidad || '—' },
    { header: 'Tatami', key: 'prom_tatami', cell: r => r.prom_tatami || '—' },
    { header: 'Instruc.', key: 'prom_instrucciones', cell: r => r.prom_instrucciones || '—' },
    { header: 'Reglam.', key: 'prom_reglamento', cell: r => r.prom_reglamento || '—' },
    { header: 'Presencia', key: 'prom_presencia', cell: r => r.prom_presencia || '—' },
    { header: 'Promedio', key: 'promedio_total', cell: r => <ScorePill value={r.promedio_total} /> },
    { header: 'Eval.', key: 'num_evaluaciones', cell: r => <span style={{ color: 'var(--gray)', fontSize: 12 }}>{r.num_evaluaciones}</span> },
  ]

  const colsDetalle = [
    { header: 'Árbitro', key: 'arbitro_nombre', cell: r => <><strong>{r.arbitro_nombre}</strong><br/><span style={{ fontSize: 11, color: 'var(--gray2)' }}>{r.licencia}</span></> },
    { header: 'Evaluador', key: 'evaluador_nombre' },
    { header: 'Conform.', key: 'conformidad' },
    { header: 'Tatami', key: 'manejo_tatami' },
    { header: 'Instruc.', key: 'instrucciones' },
    { header: 'Reglam.', key: 'aplicacion_reglamento' },
    { header: 'Presencia', key: 'presencia' },
    { header: 'Prom.', key: 'promedio_evaluador', cell: r => <ScorePill value={r.promedio_evaluador} /> },
    { header: 'Comentario', key: 'comentario', cell: r => (
      <span style={{ fontSize: 12, color: 'var(--gray)', fontStyle: r.comentario ? 'normal' : 'italic', maxWidth: 200, display: 'block' }}>
        {r.comentario || 'Sin comentarios'}
      </span>
    )},
  ]

  return (
    <AppShell
      tabs={TABS}
      activeTab={tab}
      onTabChange={t => { if (t === 'evaluar') { nav('/evaluar'); return } setTab(t) }}
    >
      <ToastContainer toasts={toasts} />

      {/* ── EVENTOS ── */}
      {tab === 'eventos' && (
        <div className="animate-fade">
          <PageHeader
            title="Eventos"
            subtitle="Crea y gestiona los eventos de evaluación"
            action={
              <div style={{ display: 'flex', gap: 12 }}>
                {eventos && (
                  <>
                    <StatCard label="Total eventos" value={eventos.length} icon="📅" style={{ padding: '10px 16px' }} />
                    <StatCard label="Árbitros" value={bdArbitros?.length || 0} icon="🥋" style={{ padding: '10px 16px' }} />
                  </>
                )}
              </div>
            }
          />
          <Card title="CREAR NUEVO EVENTO">
            <form onSubmit={handleCrearEvento}>
              <div className="row2">
                <Field label="Nombre del evento" required>
                  <Input name="nombre" placeholder="Panamericano Panamá 2026" required />
                </Field>
                <Field label="Fecha">
                  <Input name="fecha" type="date" />
                </Field>
              </div>
              <div className="row2">
                <Field label="Sede">
                  <Input name="sede" placeholder="Ciudad, País" />
                </Field>
                <Field label="Núm. evaluadores">
                  <Input name="num_evaluadores" type="number" min="1" max="20" defaultValue="4" />
                </Field>
              </div>
              <Button type="submit" variant="primary">Crear evento</Button>
            </form>
          </Card>
          <Card title="EVENTOS REGISTRADOS">
            <Table
              columns={colsEventos}
              rows={eventos}
              loading={loadingEventos}
              keyExtractor={r => r.id}
              empty={<Empty icon="📅" title="Sin eventos" description="Crea el primer evento arriba." />}
            />
          </Card>
        </div>
      )}

      {/* ── BASE ÁRBITROS ── */}
      {tab === 'bd-arb' && (
        <div className="animate-fade">
          <PageHeader title="Base de Árbitros" subtitle={`${bdArbitros?.length || 0} árbitros registrados en el sistema`} />
          <Card title="IMPORTAR DESDE CSV">
            <FileDropZone
              accept=".csv,.txt"
              onChange={handleCSVArbitros}
              title="Haz clic o arrastra el archivo CSV"
              description="Formato: nombre, apellido, provincia, club, FEPAKA ID, licencia"
              hint="Ejemplo: Carlos,Mendoza,Panamá,Dojo Kan,FEP-0042,Nacional A"
            />
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
                <Field label="Licencia">
                  <Select name="licencia">{LICENCIAS.map(l => <option key={l}>{l}</option>)}</Select>
                </Field>
              </div>
              <Field label="Foto (opcional)"><Input name="foto" type="file" accept="image/*" /></Field>
              <Button type="submit" variant="primary">Agregar a base de datos</Button>
            </form>
          </Card>
          <Card title={`BASE GLOBAL — ${bdArbitros?.length || 0} árbitros`}>
            <Table columns={colsArbitros} rows={bdArbitros} loading={loadingArbs} keyExtractor={r => r.id}
              empty={<Empty icon="🥋" title="Sin árbitros" description="Agrega árbitros arriba o importa un CSV." />}
            />
          </Card>
        </div>
      )}

      {/* ── BASE EVALUADORES ── */}
      {tab === 'bd-eval' && (
        <div className="animate-fade">
          <PageHeader title="Base de Evaluadores" subtitle="Gestiona los usuarios evaluadores del sistema" />
          <Card title="IMPORTAR DESDE CSV">
            <FileDropZone
              accept=".csv,.txt"
              onChange={handleCSVUsuarios}
              title="Haz clic o arrastra el archivo CSV"
              description="Formato: nombre, apellido, usuario, contraseña, rol"
            />
          </Card>
          <Card title="AGREGAR EVALUADOR">
            <form onSubmit={handleCrearUsuario}>
              <div className="row2">
                <Field label="Nombre completo" required><Input name="nombre" placeholder="Nombre completo" required /></Field>
                <Field label="Usuario" required><Input name="username" placeholder="usuario" required /></Field>
              </div>
              <div className="row2">
                <Field label="Contraseña" required><Input name="password" type="password" placeholder="Contraseña" required /></Field>
                <Field label="Rol">
                  <Select name="rol"><option value="evaluador">Evaluador</option><option value="admin">Administrador</option></Select>
                </Field>
              </div>
              <Button type="submit" variant="primary">Agregar a base de datos</Button>
            </form>
          </Card>
          <Card title="BASE GLOBAL DE EVALUADORES">
            {loadingUsers
              ? <Table columns={[{header:'Nombre'},{header:'Usuario'},{header:'Rol'},{header:'Password'}]} rows={[]} loading={true} keyExtractor={(_,i)=>i} />
              : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Nombre','Usuario','Rol','Estado','Password'].map(h => (
                      <th key={h} style={{ background:'var(--dark)',color:'rgba(255,255,255,.6)',padding:'9px 14px',textAlign:'left',fontSize:10,letterSpacing:'1px',textTransform:'uppercase',fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(bdUsuarios || []).map(u => (
                    <tr key={u.id}>
                      <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}><strong>{u.nombre}</strong></td>
                      <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}><code>{u.username}</code></td>
                      <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}><Badge variant={u.rol==='admin'?'red':'blue'}>{u.rol}</Badge></td>
                      <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}><Badge variant={u.activo?'green':'gold'}>{u.activo?'Activo':'Inactivo'}</Badge></td>
                      <td style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)' }}>
                        {pwPanel === u.id ? (
                          <div style={{ background:'var(--light)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',minWidth:260 }}>
                            <Field label="Nuevo password" error={pwErr}>
                              <Input type="password" value={pwNew} onChange={e=>{setPwNew(e.target.value);setPwErr('')}} placeholder="Nuevo password" />
                            </Field>
                            <Field label="Confirmar">
                              <Input type="password" value={pwConf} onChange={e=>{setPwConf(e.target.value);setPwErr('')}} placeholder="Repetir password" />
                            </Field>
                            {pwErr && <div style={{fontSize:11,color:'var(--red)',marginBottom:8}}>{pwErr}</div>}
                            <div style={{ display:'flex',gap:6 }}>
                              <Button size="sm" variant="success" onClick={() => handleCambiarPassword(u.id)}>✓ Guardar</Button>
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

      {/* ── ASIGNAR A EVENTO ── */}
      {tab === 'asignar' && (
        <div className="animate-fade">
          <PageHeader title="Asignar a Evento" subtitle="Selecciona árbitros y evaluadores para cada evento" />
          <Card padding="12px 18px">
            <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
              <span style={{ fontSize:12,color:'var(--gray)',fontWeight:500,textTransform:'uppercase',letterSpacing:'.8px' }}>Evento activo:</span>
              <Select value={evActivo?.id||''} onChange={e => {
                const ev = eventos?.find(x => x.id === parseInt(e.target.value))
                setEvActivo(ev)
              }} style={{ maxWidth: 320 }}>
                {(eventos || []).map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
              </Select>
              {evActivo && (
                <div style={{ display:'flex',gap:8,marginLeft:'auto' }}>
                  <Badge variant="blue">{arbsAsig.length} árbitros</Badge>
                  <Badge variant="green">{evalsAsig.length} evaluadores</Badge>
                </div>
              )}
            </div>
          </Card>

          {loadingAsig ? (
            <div style={{ display:'flex',justifyContent:'center',padding:40 }}><Spinner size={28} /></div>
          ) : (
            <div className="row2">
              {/* Árbitros */}
              <Card title="ÁRBITROS">
                <Input value={busqArb} onChange={e => setBusqArb(e.target.value)} placeholder="Buscar árbitro..." icon="🔍"
                  style={{ marginBottom: 8 }} />
                <div className="select-list">
                  {arbsFilt.length === 0
                    ? <Empty icon="🔍" title="Sin resultados" description="Prueba con otro término." />
                    : arbsFilt.map(a => (
                      <AssignItem
                        key={a.id}
                        name={a.nombre}
                        sub={`${a.provincia} · ${a.licencia} · ${a.fepaka_id}`}
                        assigned={arbsAsig.includes(a.id)}
                        onToggle={() => toggleArbitro(a.id)}
                      />
                    ))
                  }
                </div>
                <div style={{ marginTop:8,fontSize:12,color:'var(--gray)' }}>Asignados: <strong>{arbsAsig.length}</strong></div>
              </Card>

              {/* Evaluadores */}
              <Card title="EVALUADORES">
                <Input value={busqEval} onChange={e => setBusqEval(e.target.value)} placeholder="Buscar evaluador..." icon="🔍"
                  style={{ marginBottom: 8 }} />
                <div className="select-list">
                  {evalsFilt.length === 0
                    ? <Empty icon="🔍" title="Sin resultados" description="Prueba con otro término." />
                    : evalsFilt.map(u => (
                      <AssignItem
                        key={u.id}
                        name={u.nombre}
                        sub={`${u.username} · ${u.rol}`}
                        assigned={evalsAsig.includes(u.id)}
                        onToggle={() => toggleEvaluador(u.id)}
                      />
                    ))
                  }
                </div>
                <div style={{ marginTop:8,fontSize:12,color:'var(--gray)' }}>Asignados: <strong>{evalsAsig.length}</strong></div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIGURACIÓN ── */}
      {tab === 'config' && (
        <div className="animate-fade">
          <PageHeader title="Configuración" subtitle="Personaliza la apariencia del sistema" />
          <Card title="ESCUDO DE LA FEDERACIÓN"
            subtitle="El escudo aparece en el login y en todas las páginas">
            {config.escudo && (
              <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:16 }}>
                <img src={config.escudo} alt="Escudo actual"
                  style={{ width:72,height:72,borderRadius:12,objectFit:'contain',border:'1px solid var(--border)' }} />
                <div>
                  <div style={{ fontSize:13,fontWeight:500,marginBottom:6 }}>Escudo actual</div>
                  <Button size="sm" variant="ghost" onClick={() => { updateConfig({ escudo: null }); toast.success('Escudo eliminado') }}>
                    Quitar escudo
                  </Button>
                </div>
              </div>
            )}
            <FileDropZone
              accept="image/*"
              onChange={handleEscudo}
              title="Seleccionar imagen del escudo"
              description="PNG, JPG o SVG recomendado. Tamaño máximo: 2 MB"
            />
          </Card>
          <Card title="NOMBRE DE LA FEDERACIÓN">
            <form onSubmit={handleConfig}>
              <Field label="Nombre que aparece en el encabezado">
                <Input name="fed_nombre" defaultValue={config.fedNombre} style={{ fontSize:15,fontWeight:500 }} />
              </Field>
              <Button type="submit" variant="primary">Guardar configuración</Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── RESULTADOS ── */}
      {tab === 'resultados' && (
        <div className="animate-fade">
          <PageHeader title="Resultados" subtitle="Promedios y evaluaciones individuales por evento" />
          <Card padding="12px 18px">
            <div style={{ display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
              <span style={{ fontSize:12,color:'var(--gray)',fontWeight:500,textTransform:'uppercase',letterSpacing:'.8px' }}>Evento:</span>
              <Select value={evRes?.id||''} onChange={e => {
                const ev = eventos?.find(x => x.id === parseInt(e.target.value))
                setEvRes(ev)
              }} style={{ maxWidth: 320 }}>
                {(eventos || []).map(ev => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
              </Select>
            </div>
          </Card>

          <div style={{ display:'flex',gap:8,marginBottom:14 }}>
            <Button variant={vistaRes==='resumen'?'primary':'secondary'} onClick={()=>setVistaRes('resumen')}>
              📊 Promedios generales
            </Button>
            <Button variant={vistaRes==='detalle'?'primary':'secondary'} onClick={()=>setVistaRes('detalle')}>
              👤 Por evaluador
            </Button>
          </div>

          {vistaRes === 'resumen' && (
            <Card title={`PROMEDIOS GENERALES — ${evRes?.nombre || ''}`}>
              <Table
                columns={colsResultados}
                rows={resultados}
                keyExtractor={r => r.id}
                empty={<Empty icon="📊" title="Sin evaluaciones" description="No hay evaluaciones guardadas para este evento." />}
              />
            </Card>
          )}

          {vistaRes === 'detalle' && (
            <Card title={`EVALUACIONES INDIVIDUALES — ${evRes?.nombre || ''}`}>
              <Table
                columns={colsDetalle}
                rows={detalle}
                keyExtractor={r => r.id}
                empty={<Empty icon="👤" title="Sin evaluaciones individuales" description="Los evaluadores aún no han guardado evaluaciones en este evento." />}
              />
            </Card>
          )}
        </div>
      )}
    </AppShell>
  )
}
