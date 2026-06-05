import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import api from '../api'

const LICENCIAS = ['Nacional A','Nacional B','Nacional C','Provincial A','Provincial B','Provincial C']

export default function Admin() {
  const [tab, setTab] = useState('eventos')
  const [eventos, setEventos] = useState([])
  const [eventoActivo, setEventoActivo] = useState(null)
  const [arbitros, setArbitros] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [resultados, setResultados] = useState([])
  const [detalle, setDetalle] = useState([])
  const [vistaResultados, setVistaResultados] = useState('resumen') // 'resumen' | 'detalle'
  const [notif, setNotif] = useState(null)
  const nav = useNavigate()

  useEffect(() => { cargarEventos(); cargarUsuarios() }, [])
  useEffect(() => { if (eventoActivo) { cargarArbitros(); if(tab==='resultados') cargarResultados() } }, [eventoActivo, tab])

  function mostrarNotif(msg, tipo='ok') {
    setNotif({ msg, tipo })
    setTimeout(() => setNotif(null), 3000)
  }

  async function cargarEventos() {
    try { const { data } = await api.get('/eventos'); setEventos(data); if(data.length) setEventoActivo(data[0]) } catch {}
  }
  async function cargarArbitros() {
    if (!eventoActivo) return
    try { const { data } = await api.get(`/arbitros/evento/${eventoActivo.id}`); setArbitros(data) } catch {}
  }
  async function cargarUsuarios() {
    try { const { data } = await api.get('/usuarios'); setUsuarios(data) } catch {}
  }
  async function cargarResultados() {
    if (!eventoActivo) return
    try { const { data } = await api.get(`/evaluaciones/resumen/evento/${eventoActivo.id}`); setResultados(data) } catch {}
  }
  async function cargarDetalle() {
    if (!eventoActivo) return
    try { const { data } = await api.get(`/evaluaciones/detalle/evento/${eventoActivo.id}`); setDetalle(data) } catch {}
  }

  // EVENTOS
  async function crearEvento(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/eventos', { nombre: fd.get('nombre'), fecha: fd.get('fecha'), sede: fd.get('sede'), num_evaluadores: fd.get('num_evaluadores') })
      e.target.reset()
      await cargarEventos()
      mostrarNotif('Evento creado correctamente')
    } catch(err) { mostrarNotif(err.response?.data?.error || 'Error', 'err') }
  }

  // ÁRBITROS
  async function crearArbitro(e) {
    e.preventDefault()
    if (!eventoActivo) return mostrarNotif('Selecciona un evento primero', 'err')
    const fd = new FormData(e.target)
    fd.append('evento_id', eventoActivo.id)
    try {
      await api.post('/arbitros', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      e.target.reset()
      await cargarArbitros()
      mostrarNotif('Árbitro agregado')
    } catch(err) { mostrarNotif(err.response?.data?.error || 'Error', 'err') }
  }

  function parsearCSVArbitros(texto) {
    return texto.split('\n').filter(l=>l.trim()).map(l => {
      const [nombre, apellido, provincia, club, fepaka_id, licencia] = l.split(',').map(x=>x.trim())
      return { nombre: `${nombre} ${apellido||''}`.trim(), provincia, club, fepaka_id, licencia }
    })
  }

  async function importarCSVArbitros(e) {
    const file = e.target.files[0]; if (!file || !eventoActivo) return
    const texto = await file.text()
    const arbitrosData = parsearCSVArbitros(texto)
    try {
      const { data } = await api.post('/arbitros/csv', { evento_id: eventoActivo.id, arbitros: arbitrosData })
      await cargarArbitros()
      mostrarNotif(`CSV importado: ${data.insertados} árbitros agregados`)
    } catch(err) { mostrarNotif('Error al importar CSV', 'err') }
  }

  // USUARIOS
  async function crearUsuario(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    try {
      await api.post('/usuarios', { nombre: fd.get('nombre'), username: fd.get('username'), password: fd.get('password'), rol: fd.get('rol') })
      e.target.reset()
      await cargarUsuarios()
      mostrarNotif('Evaluador creado correctamente')
    } catch(err) { mostrarNotif(err.response?.data?.error || 'Error', 'err') }
  }

  async function importarCSVUsuarios(e) {
    const file = e.target.files[0]; if (!file) return
    const texto = await file.text()
    const usuariosData = texto.split('\n').filter(l=>l.trim()).map(l => {
      const [nombre, apellido, username, password, rol] = l.split(',').map(x=>x.trim())
      return { nombre: `${nombre} ${apellido||''}`.trim(), username, password, rol: rol||'evaluador' }
    })
    try {
      const { data } = await api.post('/usuarios/csv', { usuarios: usuariosData })
      await cargarUsuarios()
      mostrarNotif(`${data.insertados} evaluadores importados`)
    } catch(err) { mostrarNotif('Error al importar', 'err') }
  }

  function pillClass(val) { return val >= 4 ? 'pill pill-high' : val >= 3 ? 'pill pill-mid' : 'pill pill-low' }

  return (
    <div className="screen">
      <Header />
      <div className="nav-tabs">
        {['eventos','arbitros','usuarios','resultados'].map(t => (
          <div key={t} className={`nav-tab${tab===t?' active':''}`} onClick={()=>{ setTab(t); if(t==='resultados') cargarResultados() }}>
            {t==='eventos'?'Eventos':t==='arbitros'?'Árbitros':t==='usuarios'?'Evaluadores':'Resultados'}
          </div>
        ))}
        <div className="nav-tab" onClick={()=>nav('/evaluar')}>▶ Evaluar</div>
      </div>

      <div className="app-body">
        {notif && <div className={`notif ${notif.tipo}`}>{notif.msg}</div>}

        {/* ── EVENTOS ── */}
        {tab === 'eventos' && (
          <>
            <div className="card">
              <div className="card-title">CREAR NUEVO EVENTO</div>
              <form onSubmit={crearEvento}>
                <div className="row2">
                  <div className="field-group"><label>Nombre del evento</label><input name="nombre" placeholder="Panamericano Panamá 2026" required /></div>
                  <div className="field-group"><label>Fecha</label><input name="fecha" type="date" /></div>
                </div>
                <div className="row2">
                  <div className="field-group"><label>Sede</label><input name="sede" placeholder="Ciudad, País" /></div>
                  <div className="field-group"><label>Número de evaluadores</label><input name="num_evaluadores" type="number" min="1" max="20" defaultValue="4" /></div>
                </div>
                <button className="btn btn-primary" type="submit">Crear evento</button>
              </form>
            </div>
            <div className="card">
              <div className="card-title">EVENTOS REGISTRADOS</div>
              <table className="tabla">
                <thead><tr><th>Evento</th><th>Fecha</th><th>Sede</th><th>Evaluadores</th><th>Estado</th><th>Acción</th></tr></thead>
                <tbody>
                  {eventos.map(ev => (
                    <tr key={ev.id}>
                      <td><strong>{ev.nombre}</strong></td>
                      <td>{ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-ES') : '—'}</td>
                      <td>{ev.sede || '—'}</td>
                      <td>{ev.num_evaluadores}</td>
                      <td><span className={`badge badge-${ev.estado==='activo'?'green':'gold'}`}>{ev.estado}</span></td>
                      <td><button className="btn btn-secondary" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>setEventoActivo(ev)}>Seleccionar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {eventoActivo && <div style={{marginTop:10,fontSize:12,color:'var(--green)'}}>✓ Evento activo: <strong>{eventoActivo.nombre}</strong></div>}
            </div>
          </>
        )}

        {/* ── ÁRBITROS ── */}
        {tab === 'arbitros' && (
          <>
            {eventoActivo && <div style={{marginBottom:12,fontSize:12,color:'var(--gray)'}}>Evento: <strong style={{color:'var(--dark)'}}>{eventoActivo.nombre}</strong></div>}
            <div className="card">
              <div className="card-title">IMPORTAR DESDE CSV</div>
              <label className="csv-drop">
                <strong>📂 Haz clic para cargar archivo CSV</strong>
                <p>Formato: nombre, apellido, provincia, club, FEPAKA ID, licencia</p>
                <input type="file" accept=".csv,.txt" onChange={importarCSVArbitros} style={{display:'none'}} />
              </label>
              <div style={{marginTop:8,fontSize:11,color:'var(--gray)'}}>Ejemplo: <code style={{background:'var(--light)',padding:'2px 6px',borderRadius:4}}>Carlos,Mendoza,Panamá,Dojo Kan,FEP-0042,Nacional A</code></div>
            </div>
            <div className="card">
              <div className="card-title">AGREGAR ÁRBITRO INDIVIDUAL</div>
              <form onSubmit={crearArbitro}>
                <div className="row2">
                  <div className="field-group"><label>Nombre</label><input name="nombre" placeholder="Nombre" required /></div>
                  <div className="field-group"><label>Apellido</label><input name="apellido" placeholder="Apellido" /></div>
                </div>
                <div className="row2">
                  <div className="field-group"><label>Provincia</label><input name="provincia" placeholder="Provincia" /></div>
                  <div className="field-group"><label>Club</label><input name="club" placeholder="Nombre del club" /></div>
                </div>
                <div className="row2">
                  <div className="field-group"><label>FEPAKA ID</label><input name="fepaka_id" placeholder="FEP-0001" /></div>
                  <div className="field-group"><label>Licencia</label>
                    <select name="licencia">{LICENCIAS.map(l=><option key={l}>{l}</option>)}</select>
                  </div>
                </div>
                <div className="field-group"><label>Foto (opcional)</label><input name="foto" type="file" accept="image/*" /></div>
                <button className="btn btn-primary" type="submit">Agregar árbitro</button>
              </form>
            </div>
            <div className="card">
              <div className="card-title">ÁRBITROS REGISTRADOS ({arbitros.length})</div>
              <table className="tabla">
                <thead><tr><th>Foto</th><th>Nombre</th><th>Provincia</th><th>Club</th><th>FEPAKA ID</th><th>Licencia</th></tr></thead>
                <tbody>
                  {arbitros.map(a => (
                    <tr key={a.id}>
                      <td>{a.foto_url ? <img src={`${import.meta.env.VITE_API_URL?.replace('/api','')}${a.foto_url}`} className="thumb" alt="" /> : <div className="thumb-placeholder">{a.nombre.split(' ').map(x=>x[0]).join('').substring(0,2)}</div>}</td>
                      <td><strong>{a.nombre}</strong></td>
                      <td>{a.provincia}</td>
                      <td>{a.club}</td>
                      <td><code style={{fontSize:11,background:'var(--light)',padding:'2px 6px',borderRadius:4}}>{a.fepaka_id}</code></td>
                      <td><span className="badge badge-blue">{a.licencia}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── EVALUADORES ── */}
        {tab === 'usuarios' && (
          <>
            <div className="card">
              <div className="card-title">IMPORTAR EVALUADORES DESDE CSV</div>
              <label className="csv-drop">
                <strong>📂 Haz clic para cargar evaluadores</strong>
                <p>Formato: nombre, apellido, usuario, contraseña, rol</p>
                <input type="file" accept=".csv,.txt" onChange={importarCSVUsuarios} style={{display:'none'}} />
              </label>
            </div>
            <div className="card">
              <div className="card-title">AGREGAR EVALUADOR</div>
              <form onSubmit={crearUsuario}>
                <div className="row2">
                  <div className="field-group"><label>Nombre completo</label><input name="nombre" placeholder="Nombre completo" required /></div>
                  <div className="field-group"><label>Usuario</label><input name="username" placeholder="usuario" required /></div>
                </div>
                <div className="row2">
                  <div className="field-group"><label>Contraseña</label><input name="password" type="password" placeholder="Contraseña" required /></div>
                  <div className="field-group"><label>Rol</label><select name="rol"><option value="evaluador">Evaluador</option><option value="admin">Administrador</option></select></div>
                </div>
                <button className="btn btn-primary" type="submit">Crear evaluador</button>
              </form>
            </div>
            <div className="card">
              <div className="card-title">EVALUADORES REGISTRADOS</div>
              <table className="tabla">
                <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th></tr></thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id}>
                      <td>{u.nombre}</td>
                      <td>{u.username}</td>
                      <td><span className={`badge badge-${u.rol==='admin'?'red':'blue'}`}>{u.rol}</span></td>
                      <td><span className={`badge badge-${u.activo?'green':'gold'}`}>{u.activo?'Activo':'Inactivo'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── RESULTADOS ── */}
        {tab === 'resultados' && (
          <>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <button className={`btn ${vistaResultados==='resumen'?'btn-primary':'btn-secondary'}`}
                onClick={()=>{ setVistaResultados('resumen'); cargarResultados() }}>
                Promedios generales
              </button>
              <button className={`btn ${vistaResultados==='detalle'?'btn-primary':'btn-secondary'}`}
                onClick={()=>{ setVistaResultados('detalle'); cargarDetalle() }}>
                Por evaluador
              </button>
            </div>
            {vistaResultados === 'resumen' && (
              <div className="card">
                <div className="card-title">PROMEDIOS GENERALES — {eventoActivo?.nombre || 'Sin evento'}</div>
                {eventoActivo && <p style={{fontSize:12,color:'var(--gray)',marginBottom:12}}>Promedio calculado entre todos los evaluadores · {eventoActivo.num_evaluadores} evaluadores configurados</p>}
                <table className="tabla">
                  <thead><tr><th>Árbitro</th><th>Provincia</th><th>Licencia</th><th>Conform.</th><th>Tatami</th><th>Instruc.</th><th>Reglam.</th><th>Presencia</th><th>Promedio</th><th>Eval.</th></tr></thead>
                  <tbody>
                    {resultados.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.nombre}</strong></td>
                        <td>{r.provincia}</td>
                        <td><span className="badge badge-blue">{r.licencia}</span></td>
                        <td>{r.prom_conformidad || '—'}</td>
                        <td>{r.prom_tatami || '—'}</td>
                        <td>{r.prom_instrucciones || '—'}</td>
                        <td>{r.prom_reglamento || '—'}</td>
                        <td>{r.prom_presencia || '—'}</td>
                        <td>{r.promedio_total ? <span className={pillClass(r.promedio_total)}>{r.promedio_total}</span> : '—'}</td>
                        <td style={{fontSize:11,color:'var(--gray)'}}>{r.num_evaluaciones}</td>
                      </tr>
                    ))}
                    {resultados.length === 0 && <tr><td colSpan="10" style={{textAlign:'center',color:'var(--gray)',fontStyle:'italic',padding:20}}>Sin evaluaciones aún</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {vistaResultados === 'detalle' && (
              <div className="card">
                <div className="card-title">EVALUACIONES INDIVIDUALES — {eventoActivo?.nombre || 'Sin evento'}</div>
                <p style={{fontSize:12,color:'var(--gray)',marginBottom:12}}>Calificación individual de cada evaluador por árbitro</p>
                <table className="tabla">
                  <thead><tr><th>Árbitro</th><th>Evaluador</th><th>Conform.</th><th>Tatami</th><th>Instruc.</th><th>Reglam.</th><th>Presencia</th><th>Promedio</th><th>Comentario</th></tr></thead>
                  <tbody>
                    {detalle.map(d => (
                      <tr key={d.id}>
                        <td><strong>{d.arbitro_nombre}</strong><br/><span style={{fontSize:11,color:'var(--gray2)'}}>{d.licencia}</span></td>
                        <td>{d.evaluador_nombre}</td>
                        <td>{d.conformidad}</td>
                        <td>{d.manejo_tatami}</td>
                        <td>{d.instrucciones}</td>
                        <td>{d.aplicacion_reglamento}</td>
                        <td>{d.presencia}</td>
                        <td><span className={pillClass(d.promedio_evaluador)}>{d.promedio_evaluador}</span></td>
                        <td style={{fontSize:12,color:'var(--gray)',maxWidth:200}}>{d.comentario || <em>Sin comentarios</em>}</td>
                      </tr>
                    ))}
                    {detalle.length === 0 && <tr><td colSpan="9" style={{textAlign:'center',color:'var(--gray)',fontStyle:'italic',padding:20}}>Sin evaluaciones aún</td></tr>}
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