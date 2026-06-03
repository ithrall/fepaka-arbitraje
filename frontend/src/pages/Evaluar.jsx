import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import api from '../api'

const CRITERIOS = [
  { key: 'conformidad', label: 'Conformidad' },
  { key: 'manejo_tatami', label: 'Manejo del tatami' },
  { key: 'instrucciones', label: 'Instrucciones claras' },
  { key: 'aplicacion_reglamento', label: 'Aplicación del reglamento' },
  { key: 'presencia', label: 'Presencia' },
]

export default function Evaluar() {
  const user = JSON.parse(localStorage.getItem('fepaka_user') || '{}')
  const nav = useNavigate()
  const [eventos, setEventos] = useState([])
  const [eventoId, setEventoId] = useState(null)
  const [arbitros, setArbitros] = useState([])
  const [idx, setIdx] = useState(0)
  const [scores, setScores] = useState({}) // { arbitroId: { criterio: valor } }
  const [guardados, setGuardados] = useState({})
  const [notif, setNotif] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { cargarEventos() }, [])
  useEffect(() => { if (eventoId) cargarArbitros() }, [eventoId])
  useEffect(() => { if (arbitros.length) cargarMiEval() }, [idx, arbitros])

  function mostrarNotif(msg, tipo='ok') { setNotif({msg,tipo}); setTimeout(()=>setNotif(null),3000) }

  async function cargarEventos() {
    try {
      const { data } = await api.get('/eventos')
      setEventos(data)
      if (data.length) setEventoId(data[0].id)
    } catch {}
  }

  async function cargarArbitros() {
    try { const { data } = await api.get(`/arbitros/evento/${eventoId}`); setArbitros(data); setIdx(0) } catch {}
  }

  async function cargarMiEval() {
    const arb = arbitros[idx]; if (!arb) return
    try {
      const { data } = await api.get(`/evaluaciones/mia/arbitro/${arb.id}/evento/${eventoId}`)
      if (data) {
        const s = {}
        CRITERIOS.forEach(c => { s[c.key] = data[c.key] ? parseFloat(data[c.key]) : 0 })
        setScores(prev => ({ ...prev, [arb.id]: s }))
        setGuardados(prev => ({ ...prev, [arb.id]: true }))
      }
    } catch {}
  }

  const arb = arbitros[idx]
  const arbScores = arb ? (scores[arb.id] || {}) : {}
  const todoCompleto = CRITERIOS.every(c => arbScores[c.key] > 0)
  const promedio = todoCompleto
    ? (CRITERIOS.reduce((s,c) => s + arbScores[c.key], 0) / 5).toFixed(2)
    : null
  const evaluadosCount = Object.keys(guardados).length

  function setScore(criterio, valor) {
    const v = parseFloat(valor)
    setScores(prev => ({ ...prev, [arb.id]: { ...prev[arb.id], [criterio]: v } }))
  }

  function sliderStyle(val) {
    const pct = val ? ((val - 1) / 4 * 100) : 0
    return { background: `linear-gradient(to right, var(--red) ${pct}%, var(--border) ${pct}%)` }
  }

  async function guardar() {
    if (!todoCompleto) return mostrarNotif('Evalúa los 5 criterios antes de guardar', 'err')
    setSaving(true)
    try {
      await api.post('/evaluaciones', {
        evento_id: eventoId,
        arbitro_id: arb.id,
        ...arbScores
      })
      setGuardados(prev => ({ ...prev, [arb.id]: true }))
      mostrarNotif(`✓ Evaluación de ${arb.nombre} guardada`)
      setTimeout(() => { if (idx < arbitros.length - 1) setIdx(i => i + 1) }, 1500)
    } catch(err) { mostrarNotif(err.response?.data?.error || 'Error al guardar', 'err') }
    finally { setSaving(false) }
  }

  if (!arb) return (
    <div className="screen">
      <Header showBack={user.rol==='admin'} />
      <div className="app-body" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center',color:'var(--gray)'}}>
          {eventos.length === 0 ? 'No hay eventos creados aún.' : 'No hay árbitros registrados en este evento.'}
        </div>
      </div>
    </div>
  )

  const initials = arb.nombre.split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase()
  const apiBase = (import.meta.env.VITE_API_URL || '').replace('/api','')

  return (
    <div className="screen">
      <Header showBack={user.rol==='admin'} />
      <div className="app-body">
        {notif && <div className={`notif ${notif.tipo}`}>{notif.msg}</div>}

        {/* Selector de evento */}
        {eventos.length > 1 && (
          <div style={{marginBottom:12}}>
            <select value={eventoId||''} onChange={e=>setEventoId(Number(e.target.value))}
              style={{padding:'8px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,fontFamily:'var(--font)'}}>
              {eventos.map(ev=><option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Barra de progreso */}
        <div className="card" style={{padding:'12px 16px',marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--gray)',marginBottom:6}}>
            <span>Progreso de evaluación</span>
            <span>{evaluadosCount} / {arbitros.length} árbitros evaluados</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{width:`${arbitros.length ? evaluadosCount/arbitros.length*100 : 0}%`}} />
          </div>
        </div>

        {/* Navegación árbitro */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'white',border:'1px solid var(--border)',borderRadius:12,padding:'10px 16px',marginBottom:14}}>
          <button className="btn btn-secondary" style={{padding:'6px 12px'}} onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0}>←</button>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            {arb.foto_url
              ? <img src={`${apiBase}${arb.foto_url}`} alt="" style={{width:52,height:52,borderRadius:10,objectFit:'cover',border:'1px solid var(--border)'}} />
              : <div style={{width:52,height:52,borderRadius:10,background:'var(--light)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-display)',fontSize:18,color:'var(--gray2)'}}>{initials}</div>
            }
            <div>
              <div style={{fontSize:15,fontWeight:600}}>{arb.nombre}</div>
              <div style={{fontSize:12,color:'var(--gray)',marginTop:2}}>{arb.provincia} · {arb.licencia}</div>
              <div style={{fontSize:11,color:'var(--gray2)',marginTop:1}}>{arb.club} · {arb.fepaka_id}</div>
            </div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:12,color:'var(--gray)'}}>{idx+1} / {arbitros.length}</div>
            <div style={{fontSize:11,marginTop:3,color:guardados[arb.id]?'var(--green)':'var(--gray2)'}}>{guardados[arb.id]?'✓ Evaluado':'Sin evaluar'}</div>
          </div>
          <button className="btn btn-secondary" style={{padding:'6px 12px'}} onClick={()=>setIdx(i=>Math.min(arbitros.length-1,i+1))} disabled={idx===arbitros.length-1}>→</button>
        </div>

        {/* Promedio en vivo */}
        <div className="prom-bar">
          {CRITERIOS.map((c,i) => (
            <div key={c.key} className="prom-item">
              <div className="prom-label">{['Conform.','Tatami','Instruc.','Reglam.','Presencia'][i]}</div>
              <div className="prom-val">{arbScores[c.key] ? arbScores[c.key].toFixed(1) : '—'}</div>
            </div>
          ))}
          <div className="prom-total-box">
            <div className="prom-label">Mi prom.</div>
            <div className="prom-val">{promedio || '—'}</div>
          </div>
        </div>

        {/* Criterios con slider */}
        {CRITERIOS.map(c => {
          const val = arbScores[c.key] || 0
          return (
            <div key={c.key} className="crit-card">
              <div className="crit-top">
                <span className="crit-name">{c.label}</span>
                <span className={`crit-val-big${val?' filled':''}`}>{val ? val.toFixed(1) : '—'}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:11,color:'var(--gray2)',fontWeight:500}}>1.0</span>
                <input type="range" className="crit-slider" min="10" max="50" step="1"
                  value={val ? Math.round(val*10) : 10}
                  style={sliderStyle(val)}
                  onChange={e => setScore(c.key, parseInt(e.target.value)/10)} />
                <span style={{fontSize:11,color:'var(--gray2)',fontWeight:500}}>5.0</span>
              </div>
            </div>
          )
        })}

        <button className="btn btn-green" style={{width:'100%',padding:12,fontSize:14}} onClick={guardar} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar y continuar →'}
        </button>
      </div>
    </div>
  )
}
