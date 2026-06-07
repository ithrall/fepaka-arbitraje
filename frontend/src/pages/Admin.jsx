import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import api from '../api'

const LICENCIAS = ['Nacional A','Nacional B','Nacional C','Provincial A','Provincial B','Provincial C']

export default function Admin() {
  const [tab, setTab] = useState('eventos')
  const [eventos, setEventos] = useState([])
  const [evActivo, setEvActivo] = useState(null)
  const [evRes, setEvRes] = useState(null)
  const [bdArbitros, setBdArbitros] = useState([])
  const [bdUsuarios, setBdUsuarios] = useState([])
  const [arbsEvento, setArbsEvento] = useState([])
  const [evalsEvento, setEvalsEvento] = useState([])
  const [resultados, setResultados] = useState([])
  const [detalle, setDetalle] = useState([])
  const [vistaRes, setVistaRes] = useState('resumen')
  const [notif, setNotif] = useState(null)
  const [fArb, setFArb] = useState('')
  const [fEval, setFEval] = useState('')
  const [pwPanel, setPwPanel] = useState(null)
  const [pwNew, setPwNew] = useState('')
  const [pwConf, setPwConf] = useState('')
  const [pwErr, setPwErr] = useState('')
  const nav = useNavigate()

  useEffect(() => { cargarEventos(); cargarBDArbitros(); cargarBDUsuarios() }, [])

  function mostrarNotif(msg, tipo='ok') { setNotif({msg,tipo}); setTimeout(()=>setNotif(null),3000) }

  // ── EVENTOS ──
  async function cargarEventos() {
    try { const {data} = await api.get('/eventos'); setEventos(data); if(data.length){setEvActivo(data[0]);setEvRes(data[0])} } catch{}
  }
  async function crearEvento(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/eventos', {nombre:fd.get('nombre'),fecha:fd.get('fecha'),sede:fd.get('sede'),num_evaluadores:fd.get('num_evaluadores')})
      e.target.reset(); await cargarEventos(); mostrarNotif('✓ Evento creado')
    } catch(err){mostrarNotif(err.response?.data?.error||'Error','err')}
  }

  // ── BASE ÁRBITROS ──
  async function cargarBDArbitros() {
    try { const {data} = await api.get('/arbitros/todos'); setBdArbitros(data) } catch{}
  }
  async function crearArbitro(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/arbitros', fd, {headers:{'Content-Type':'multipart/form-data'}})
      e.target.reset(); await cargarBDArbitros(); mostrarNotif('✓ Árbitro agregado a la base de datos')
    } catch(err){mostrarNotif(err.response?.data?.error||'Error','err')}
  }
  async function importarCSVArbitros(e) {
    const file = e.target.files[0]; if(!file) return
    const texto = await file.text()
    const arbs = texto.split('\n').filter(l=>l.trim()).map(l=>{
      const [nombre,apellido,provincia,club,fepaka_id,licencia] = l.split(',').map(x=>x.trim())
      return {nombre:`${nombre} ${apellido||''}`.trim(),provincia,club,fepaka_id,licencia}
    })
    try {
      const {data} = await api.post('/arbitros/csv', {arbitros:arbs})
      await cargarBDArbitros(); mostrarNotif(`✓ ${data.insertados} árbitros importados`)
    } catch{mostrarNotif('Error al importar CSV','err')}
    e.target.value=''
  }

  // ── BASE USUARIOS ──
  async function cargarBDUsuarios() {
    try { const {data} = await api.get('/usuarios'); setBdUsuarios(data) } catch{}
  }
  async function crearUsuario(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/usuarios', {nombre:fd.get('nombre'),username:fd.get('username'),password:fd.get('password'),rol:fd.get('rol')})
      e.target.reset(); await cargarBDUsuarios(); mostrarNotif('✓ Evaluador creado')
    } catch(err){mostrarNotif(err.response?.data?.error||'Error','err')}
  }
  async function importarCSVUsuarios(e) {
    const file = e.target.files[0]; if(!file) return
    const texto = await file.text()
    const usrs = texto.split('\n').filter(l=>l.trim()).map(l=>{
      const [nombre,apellido,username,password,rol] = l.split(',').map(x=>x.trim())
      return {nombre:`${nombre} ${apellido||''}`.trim(),username,password,rol:rol||'evaluador'}
    })
    try {
      const {data} = await api.post('/usuarios/csv', {usuarios:usrs})
      await cargarBDUsuarios(); mostrarNotif(`✓ ${data.insertados} evaluadores importados`)
    } catch{mostrarNotif('Error al importar','err')}
    e.target.value=''
  }
  async function cambiarPassword(userId) {
    if(!pwNew){setPwErr('Escribe el nuevo password');return}
    if(pwNew.length<4){setPwErr('Mínimo 4 caracteres');return}
    if(pwNew!==pwConf){setPwErr('Las contraseñas no coinciden');return}
    try {
      await api.put(`/usuarios/${userId}/password`, {password:pwNew})
      setPwPanel(null);setPwNew('');setPwConf('');setPwErr('')
      mostrarNotif('✓ Password actualizado correctamente')
    } catch(err){setPwErr(err.response?.data?.error||'Error al cambiar password')}
  }

  // ── ASIGNAR A EVENTO ──
  async function cargarArbsEvento(evId) {
    try { const {data} = await api.get(`/arbitros/evento/${evId}`); setArbsEvento(data.map(a=>a.id)) } catch{}
  }
  async function cargarEvalsEvento(evId) {
    try { const {data} = await api.get(`/eventos/${evId}/evaluadores`); setEvalsEvento(data.map(u=>u.id)) } catch{}
  }
  async function toggleArbitro(arbId) {
    if(!evActivo) return
    const asignado = arbsEvento.includes(arbId)
    try {
      if(asignado) await api.delete(`/eventos/${evActivo.id}/arbitros/${arbId}`)
      else await api.post(`/eventos/${evActivo.id}/arbitros`, {arbitro_id:arbId})
      await cargarArbsEvento(evActivo.id)
    } catch(err){mostrarNotif(err.response?.data?.error||'Error','err')}
  }
  async function toggleEvaluador(usrId) {
    if(!evActivo) return
    const asignado = evalsEvento.includes(usrId)
    try {
      if(asignado) await api.delete(`/eventos/${evActivo.id}/evaluadores/${usrId}`)
      else await api.post(`/eventos/${evActivo.id}/evaluadores`, {usuario_id:usrId})
      await cargarEvalsEvento(evActivo.id)
    } catch(err){mostrarNotif(err.response?.data?.error||'Error','err')}
  }

  // ── RESULTADOS ──
  async function cargarResultados(evId) {
    try { const {data} = await api.get(`/evaluaciones/resumen/evento/${evId}`); setResultados(data) } catch{}
  }
  async function cargarDetalle(evId) {
    try { const {data} = await api.get(`/evaluaciones/detalle/evento/${evId}`); setDetalle(data) } catch{}
  }

  // ── CONFIGURACIÓN ──
  async function subirEscudo(e) {
    const file = e.target.files[0]; if(!file) return
    const fd = new FormData(); fd.append('escudo', file)
    try {
      await api.post('/config/escudo', fd, {headers:{'Content-Type':'multipart/form-data'}})
      mostrarNotif('✓ Escudo actualizado')
      window.dispatchEvent(new Event('escudo-updated'))
    } catch{mostrarNotif('Error al subir escudo','err')}
    e.target.value=''
  }
  async function guardarConfig(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/config', {fed_nombre:fd.get('fed_nombre')})
      mostrarNotif('✓ Configuración guardada')
    } catch{mostrarNotif('Error','err')}
  }

  function pillClass(val) { return val>=4?'pill pill-high':val>=3?'pill pill-mid':'pill pill-low' }

  function switchTab(t) {
    setTab(t)
    if(t==='asignar' && evActivo){cargarArbsEvento(evActivo.id);cargarEvalsEvento(evActivo.id)}
    if(t==='resultados' && evRes){cargarResultados(evRes.id);cargarDetalle(evRes.id)}
  }

  const arbsFiltrados = bdArbitros.filter(a=>!fArb||a.nombre.toLowerCase().includes(fArb.toLowerCase())||a.fepaka_id?.toLowerCase().includes(fArb.toLowerCase()))
  const evalsFiltrados = bdUsuarios.filter(u=>!fEval||u.nombre.toLowerCase().includes(fEval.toLowerCase())||u.username?.toLowerCase().includes(fEval.toLowerCase()))

  return (
    <div className="screen">
      <Header />
      <div className="nav-tabs">
        {[['eventos','Eventos'],['bd-arb','Base Árbitros'],['bd-eval','Base Evaluadores'],['asignar','Asignar a Evento'],['config','Configuración'],['resultados','Resultados']].map(([t,label])=>(
          <div key={t} className={`nav-tab${tab===t?' active':''}`} onClick={()=>switchTab(t)}>{label}</div>
        ))}
        <div className="nav-tab" onClick={()=>nav('/evaluar')}>▶ Evaluar</div>
      </div>

      <div className="app-body">
        {notif && <div className={`notif ${notif.tipo}`}>{notif.msg}</div>}

        {/* EVENTOS */}
        {tab==='eventos' && (
          <>
            <div className="card">
              <div className="card-title">CREAR NUEVO EVENTO</div>
              <form onSubmit={crearEvento}>
                <div className="row2">
                  <div className="field-group"><label>Nombre del evento</label><input name="nombre" placeholder="Panamericano Panamá 2026" required/></div>
                  <div className="field-group"><label>Fecha</label><input name="fecha" type="date"/></div>
                </div>
                <div className="row2">
                  <div className="field-group"><label>Sede</label><input name="sede" placeholder="Ciudad, País"/></div>
                  <div className="field-group"><label>Núm. evaluadores</label><input name="num_evaluadores" type="number" min="1" max="20" defaultValue="4"/></div>
                </div>
                <button className="btn btn-primary" type="submit">Crear evento</button>
              </form>
            </div>
            <div className="card">
              <div className="card-title">EVENTOS REGISTRADOS</div>
              <table className="tabla">
                <thead><tr><th>Evento</th><th>Fecha</th><th>Sede</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                  {eventos.map(ev=>(
                    <tr key={ev.id}>
                      <td><strong>{ev.nombre}</strong></td>
                      <td>{ev.fecha?new Date(ev.fecha).toLocaleDateString('es-ES'):'—'}</td>
                      <td>{ev.sede||'—'}</td>
                      <td><span className={`badge badge-${ev.estado==='activo'?'green':'gold'}`}>{ev.estado}</span></td>
                      <td><button className="btn btn-secondary" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>{setEvActivo(ev);switchTab('asignar')}}>Gestionar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* BASE ÁRBITROS */}
        {tab==='bd-arb' && (
          <>
            <div className="card">
              <div className="card-title">IMPORTAR DESDE CSV</div>
              <label className="csv-drop">
                <strong>📂 Haz clic para seleccionar archivo CSV</strong>
                <p>Formato: nombre, apellido, provincia, club, FEPAKA ID, licencia</p>
                <input type="file" accept=".csv,.txt" onChange={importarCSVArbitros} style={{display:'none'}}/>
              </label>
            </div>
            <div className="card">
              <div className="card-title">AGREGAR ÁRBITRO INDIVIDUAL</div>
              <form onSubmit={crearArbitro}>
                <div className="row2">
                  <div className="field-group"><label>Nombre</label><input name="nombre" placeholder="Nombre" required/></div>
                  <div className="field-group"><label>Apellido</label><input name="apellido" placeholder="Apellido"/></div>
                </div>
                <div className="row2">
                  <div className="field-group"><label>Provincia</label><input name="provincia" placeholder="Provincia"/></div>
                  <div className="field-group"><label>Club</label><input name="club" placeholder="Club"/></div>
                </div>
                <div className="row2">
                  <div className="field-group"><label>FEPAKA ID</label><input name="fepaka_id" placeholder="FEP-0001"/></div>
                  <div className="field-group"><label>Licencia</label><select name="licencia">{LICENCIAS.map(l=><option key={l}>{l}</option>)}</select></div>
                </div>
                <div className="field-group"><label>Foto (opcional)</label><input name="foto" type="file" accept="image/*"/></div>
                <button className="btn btn-primary" type="submit">Agregar a base de datos</button>
              </form>
            </div>
            <div className="card">
              <div className="card-title">BASE GLOBAL ({bdArbitros.length} árbitros)</div>
              <table className="tabla">
                <thead><tr><th>Nombre</th><th>Provincia</th><th>Club</th><th>FEPAKA ID</th><th>Licencia</th></tr></thead>
                <tbody>
                  {bdArbitros.map(a=>(
                    <tr key={a.id}>
                      <td><strong>{a.nombre}</strong></td>
                      <td>{a.provincia}</td><td>{a.club}</td>
                      <td><code style={{fontSize:11,background:'var(--light)',padding:'2px 6px',borderRadius:4}}>{a.fepaka_id}</code></td>
                      <td><span className="badge badge-blue">{a.licencia}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* BASE EVALUADORES */}
        {tab==='bd-eval' && (
          <>
            <div className="card">
              <div className="card-title">IMPORTAR DESDE CSV</div>
              <label className="csv-drop">
                <strong>📂 Haz clic para seleccionar archivo CSV</strong>
                <p>Formato: nombre, apellido, usuario, contraseña, rol</p>
                <input type="file" accept=".csv,.txt" onChange={importarCSVUsuarios} style={{display:'none'}}/>
              </label>
            </div>
            <div className="card">
              <div className="card-title">AGREGAR EVALUADOR</div>
              <form onSubmit={crearUsuario}>
                <div className="row2">
                  <div className="field-group"><label>Nombre completo</label><input name="nombre" placeholder="Nombre completo" required/></div>
                  <div className="field-group"><label>Usuario</label><input name="username" placeholder="usuario" required/></div>
                </div>
                <div className="row2">
                  <div className="field-group"><label>Contraseña</label><input name="password" type="password" placeholder="Contraseña" required/></div>
                  <div className="field-group"><label>Rol</label><select name="rol"><option value="evaluador">Evaluador</option><option value="admin">Administrador</option></select></div>
                </div>
                <button className="btn btn-primary" type="submit">Agregar a base de datos</button>
              </form>
            </div>
            <div className="card">
              <div className="card-title">BASE GLOBAL DE EVALUADORES</div>
              <table className="tabla">
                <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Password</th></tr></thead>
                <tbody>
                  {bdUsuarios.map(u=>(
                    <tr key={u.id}>
                      <td><strong>{u.nombre}</strong></td>
                      <td><code style={{fontSize:11,background:'var(--light)',padding:'2px 6px',borderRadius:4}}>{u.username}</code></td>
                      <td><span className={`badge badge-${u.rol==='admin'?'red':'blue'}`}>{u.rol}</span></td>
                      <td><span className={`badge badge-${u.activo?'green':'gold'}`}>{u.activo?'Activo':'Inactivo'}</span></td>
                      <td>
                        {pwPanel===u.id ? (
                          <div style={{background:'var(--light)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',minWidth:260}}>
                            <div style={{marginBottom:8}}>
                              <div style={{fontSize:11,color:'var(--gray)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:4}}>Nuevo password</div>
                              <input type="password" value={pwNew} onChange={e=>{setPwNew(e.target.value);setPwErr('')}}
                                placeholder="Nuevo password" style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border)',borderRadius:7,fontSize:12,fontFamily:'var(--font)',outline:'none'}}/>
                            </div>
                            <div style={{marginBottom:8}}>
                              <div style={{fontSize:11,color:'var(--gray)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:4}}>Confirmar</div>
                              <input type="password" value={pwConf} onChange={e=>{setPwConf(e.target.value);setPwErr('')}}
                                placeholder="Repetir password" style={{width:'100%',padding:'7px 10px',border:'1px solid var(--border)',borderRadius:7,fontSize:12,fontFamily:'var(--font)',outline:'none'}}/>
                            </div>
                            {pwErr && <div style={{fontSize:11,color:'var(--red)',marginBottom:8}}>{pwErr}</div>}
                            <div style={{display:'flex',gap:6}}>
                              <button className="btn btn-green" style={{fontSize:12,padding:'5px 12px'}} onClick={()=>cambiarPassword(u.id)}>✓ Guardar</button>
                              <button className="btn btn-secondary" style={{fontSize:12,padding:'5px 12px'}} onClick={()=>{setPwPanel(null);setPwNew('');setPwConf('');setPwErr('')}}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <button className="btn btn-secondary" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>{setPwPanel(u.id);setPwNew('');setPwConf('');setPwErr('')}}>🔑 Cambiar password</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ASIGNAR A EVENTO */}
        {tab==='asignar' && (
          <>
            <div className="card" style={{padding:'12px 18px'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <span style={{fontSize:12,color:'var(--gray)',fontWeight:500,textTransform:'uppercase',letterSpacing:'.8px'}}>Evento:</span>
                <select value={evActivo?.id||''} onChange={e=>{const ev=eventos.find(x=>x.id===parseInt(e.target.value));setEvActivo(ev);if(ev){cargarArbsEvento(ev.id);cargarEvalsEvento(ev.id)}}}
                  style={{padding:'7px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,fontFamily:'var(--font)',outline:'none'}}>
                  {eventos.map(ev=><option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="row2">
              <div className="card">
                <div className="card-title">ÁRBITROS</div>
                <input className="search-input" placeholder="Buscar árbitro..." value={fArb} onChange={e=>setFArb(e.target.value)} style={{width:'100%',padding:'8px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:13,fontFamily:'var(--font)',outline:'none',marginBottom:8}}/>
                <div style={{maxHeight:280,overflowY:'auto',border:'1px solid var(--border)',borderRadius:10}}>
                  {arbsFiltrados.map(a=>{
                    const on=arbsEvento.includes(a.id)
                    return(
                      <div key={a.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',borderBottom:'1px solid var(--border)',background:on?'var(--green-light)':'white',fontSize:13}}>
                        <div>
                          <div style={{fontWeight:500}}>{a.nombre}</div>
                          <div style={{fontSize:11,color:'var(--gray2)',marginTop:2}}>{a.provincia} · {a.licencia} · {a.fepaka_id}</div>
                        </div>
                        <button className={`btn btn-sm ${on?'btn-secondary':'btn-primary'}`} onClick={()=>toggleArbitro(a.id)}>{on?'Quitar':'+ Agregar'}</button>
                      </div>
                    )
                  })}
                </div>
                <div style={{marginTop:8,fontSize:12,color:'var(--gray)'}}>Asignados: <strong>{arbsEvento.length}</strong></div>
              </div>
              <div className="card">
                <div className="card-title">EVALUADORES</div>
                <input className="search-input" placeholder="Buscar evaluador..." value={fEval} onChange={e=>setFEval(e.target.value)} style={{width:'100%',padding:'8px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:13,fontFamily:'var(--font)',outline:'none',marginBottom:8}}/>
                <div style={{maxHeight:280,overflowY:'auto',border:'1px solid var(--border)',borderRadius:10}}>
                  {evalsFiltrados.map(u=>{
                    const on=evalsEvento.includes(u.id)
                    return(
                      <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',borderBottom:'1px solid var(--border)',background:on?'var(--green-light)':'white',fontSize:13}}>
                        <div>
                          <div style={{fontWeight:500}}>{u.nombre}</div>
                          <div style={{fontSize:11,color:'var(--gray2)',marginTop:2}}>{u.username} · {u.rol}</div>
                        </div>
                        <button className={`btn btn-sm ${on?'btn-secondary':'btn-primary'}`} onClick={()=>toggleEvaluador(u.id)}>{on?'Quitar':'+ Agregar'}</button>
                      </div>
                    )
                  })}
                </div>
                <div style={{marginTop:8,fontSize:12,color:'var(--gray)'}}>Asignados: <strong>{evalsEvento.length}</strong></div>
              </div>
            </div>
          </>
        )}

        {/* CONFIGURACIÓN */}
        {tab==='config' && (
          <>
            <div className="card">
              <div className="card-title">ESCUDO DE LA FEDERACIÓN</div>
              <p style={{fontSize:13,color:'var(--gray)',marginBottom:16}}>El escudo aparecerá en la pantalla de login y en el encabezado de todas las páginas.</p>
              <label className="csv-drop" style={{marginBottom:8}}>
                <strong>📁 Seleccionar imagen del escudo</strong>
                <p>PNG, JPG o SVG recomendado</p>
                <input type="file" accept="image/*" onChange={subirEscudo} style={{display:'none'}}/>
              </label>
            </div>
            <div className="card">
              <div className="card-title">NOMBRE DE LA FEDERACIÓN</div>
              <form onSubmit={guardarConfig}>
                <div className="field-group"><label>Nombre en el encabezado</label><input name="fed_nombre" defaultValue="FEPAKA" style={{fontSize:15,fontWeight:500}}/></div>
                <button className="btn btn-primary" type="submit">Guardar configuración</button>
              </form>
            </div>
          </>
        )}

        {/* RESULTADOS */}
        {tab==='resultados' && (
          <>
            <div className="card" style={{padding:'12px 18px',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:12,color:'var(--gray)',fontWeight:500,textTransform:'uppercase',letterSpacing:'.8px'}}>Evento:</span>
                <select value={evRes?.id||''} onChange={e=>{const ev=eventos.find(x=>x.id===parseInt(e.target.value));setEvRes(ev);if(ev){cargarResultados(ev.id);cargarDetalle(ev.id)}}}
                  style={{padding:'7px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,fontFamily:'var(--font)',outline:'none'}}>
                  {eventos.map(ev=><option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <button className={`btn ${vistaRes==='resumen'?'btn-primary':'btn-secondary'}`} onClick={()=>setVistaRes('resumen')}>Promedios generales</button>
              <button className={`btn ${vistaRes==='detalle'?'btn-primary':'btn-secondary'}`} onClick={()=>setVistaRes('detalle')}>Por evaluador</button>
            </div>
            {vistaRes==='resumen' && (
              <div className="card">
                <div className="card-title">PROMEDIOS GENERALES — {evRes?.nombre}</div>
                <table className="tabla">
                  <thead><tr><th>Árbitro</th><th>Provincia</th><th>Licencia</th><th>Conform.</th><th>Tatami</th><th>Instruc.</th><th>Reglam.</th><th>Presencia</th><th>Promedio</th><th>Eval.</th></tr></thead>
                  <tbody>
                    {resultados.map(r=>(
                      <tr key={r.id}>
                        <td><strong>{r.nombre}</strong></td><td>{r.provincia}</td>
                        <td><span className="badge badge-blue">{r.licencia}</span></td>
                        <td>{r.prom_conformidad||'—'}</td><td>{r.prom_tatami||'—'}</td>
                        <td>{r.prom_instrucciones||'—'}</td><td>{r.prom_reglamento||'—'}</td>
                        <td>{r.prom_presencia||'—'}</td>
                        <td>{r.promedio_total?<span className={pillClass(r.promedio_total)}>{r.promedio_total}</span>:'—'}</td>
                        <td style={{fontSize:11,color:'var(--gray)'}}>{r.num_evaluaciones}</td>
                      </tr>
                    ))}
                    {resultados.length===0&&<tr><td colSpan="10" style={{textAlign:'center',color:'var(--gray)',fontStyle:'italic',padding:20}}>Sin evaluaciones aún</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {vistaRes==='detalle' && (
              <div className="card">
                <div className="card-title">EVALUACIONES INDIVIDUALES — {evRes?.nombre}</div>
                <table className="tabla">
                  <thead><tr><th>Árbitro</th><th>Evaluador</th><th>Conform.</th><th>Tatami</th><th>Instruc.</th><th>Reglam.</th><th>Presencia</th><th>Prom.</th><th>Comentario</th></tr></thead>
                  <tbody>
                    {detalle.map(d=>(
                      <tr key={d.id}>
                        <td><strong>{d.arbitro_nombre}</strong><br/><span style={{fontSize:11,color:'var(--gray2)'}}>{d.licencia}</span></td>
                        <td>{d.evaluador_nombre}</td>
                        <td>{d.conformidad}</td><td>{d.manejo_tatami}</td><td>{d.instrucciones}</td>
                        <td>{d.aplicacion_reglamento}</td><td>{d.presencia}</td>
                        <td><span className={pillClass(d.promedio_evaluador)}>{d.promedio_evaluador}</span></td>
                        <td style={{fontSize:12,color:'var(--gray)',fontStyle:d.comentario?'normal':'italic',maxWidth:200}}>{d.comentario||'Sin comentarios'}</td>
                      </tr>
                    ))}
                    {detalle.length===0&&<tr><td colSpan="9" style={{textAlign:'center',color:'var(--gray)',fontStyle:'italic',padding:20}}>Sin evaluaciones aún</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
