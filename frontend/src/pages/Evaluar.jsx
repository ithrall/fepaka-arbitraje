import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../hooks/useAsync'
import { TopBar } from '../components/layout'
import { Spinner, Empty, ToastContainer, Badge } from '../components/ui'
import { CriteriaCard, ScorePanel, ProgressBar, EventoBanner } from '../components/data'
import { CRITERIOS, ESTADOS, nombreCompleto } from '../utils/criterios'
import api from '../api'

export default function Evaluar() {
  const { user, isAdmin } = useApp()
  const { toasts, toast } = useToast()
  const nav = useNavigate()

  const [eventos, setEventos] = useState([])
  const [eventoActivo, setEventoActivo] = useState(null)
  const [areas, setAreas] = useState([])
  const [miArea, setMiArea] = useState(null)
  const [arbitros, setArbitros] = useState([])
  const [arbIdx, setArbIdx] = useState(0)
  const [modalidad, setModalidad] = useState('kumite')
  const [scores, setScores] = useState({})
  const [comentarios, setComentarios] = useState({})
  const [guardados, setGuardados] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const criterios = CRITERIOS[modalidad] || CRITERIOS.kumite
  const estadoInfo = ESTADOS[eventoActivo?.estado] || ESTADOS.activo
  const puedeEvaluar = eventoActivo?.estado === 'activo'

  useEffect(() => { cargarEventos() }, [])
  useEffect(() => {
    if (eventoActivo) { cargarAreas(); cargarArbitros() }
  }, [eventoActivo?.id])
  useEffect(() => {
    const arb = arbitros[arbIdx]
    if (arb && eventoActivo) cargarMiEval(arb.id)
  }, [arbIdx, arbitros.length, eventoActivo?.id, modalidad])

  async function cargarEventos() {
    try {
      const { data } = await api.get('/eventos')
      const misEventos = isAdmin ? data : data.filter(ev => ev.estado !== 'finalizado')
      setEventos(misEventos)
      if (misEventos.length) setEventoActivo(misEventos[0])
    } catch { toast.error('Error al cargar eventos') }
    finally { setLoading(false) }
  }

  async function cargarAreas() {
    try {
      const { data } = await api.get(`/areas/evento/${eventoActivo.id}`)
      setAreas(data)
      const miA = data.find(a => a.jefe_id === user.id)
      setMiArea(miA || null)
    } catch {}
  }

  async function cargarArbitros() {
    try {
      const { data } = await api.get(`/eventos/${eventoActivo.id}/arbitros`)
      setArbitros(data)
      setArbIdx(0)
      setGuardados({})
    } catch { toast.error('Error al cargar árbitros') }
  }

  async function cargarMiEval(arbId) {
    try {
      const { data } = await api.get(
        `/evaluaciones/mia/arbitro/${arbId}/evento/${eventoActivo.id}?modalidad=${modalidad}`
      )
      const s = {}
      criterios.forEach(c => { s[c.key] = data && data[c.key] ? parseFloat(data[c.key]) : 0 })
      setScores(prev => ({ ...prev, [arbId]: s }))
      setComentarios(prev => ({ ...prev, [arbId]: data?.comentario || '' }))
      setGuardados(prev => ({ ...prev, [arbId]: !!data }))
    } catch {}
  }

  const arb = arbitros[arbIdx]
  const arbScores = arb ? (scores[arb.id] || {}) : {}
  const arbComentario = arb ? (comentarios[arb.id] || '') : ''
  const todoCompleto = criterios.every(c => (arbScores[c.key] || 0) > 0)

  const misArbitros = miArea
    ? arbitros.filter(a => a.area_id === miArea.id)
    : isAdmin ? arbitros : []

  const evaluadosCount = misArbitros.filter(a => guardados[a.id]).length
  const puedoEvaluarEste = isAdmin || (miArea && arb?.area_id === miArea.id)

  function handleScore(criterio, valor) {
    if (!arb) return
    setScores(prev => ({ ...prev, [arb.id]: { ...(prev[arb.id] || {}), [criterio]: valor } }))
  }

  function cambiarModalidad(nueva) {
    setModalidad(nueva)
  }

  async function guardar() {
    if (!todoCompleto) { toast.error('Evalúa todos los criterios antes de guardar'); return }
    if (!puedeEvaluar) { toast.error('Este evento no está disponible para evaluación'); return }
    setSaving(true)
    try {
      const payload = {
        evento_id: eventoActivo.id,
        arbitro_id: arb.id,
        area_id: miArea?.id || arb.area_id || null,
        modalidad,
        ...arbScores,
        comentario: arbComentario || null,
      }
      await api.post('/evaluaciones', payload)
      setGuardados(prev => ({ ...prev, [arb.id]: true }))
      toast.success(`✓ ${nombreCompleto(arb)} — ${modalidad.toUpperCase()} guardado`)
      setTimeout(() => {
        if (arbIdx < arbitros.length - 1) setArbIdx(i => i + 1)
      }, 1200)
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const apiBase = (import.meta.env.VITE_API_URL || '').replace('/api', '')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--light)' }}>
      <TopBar showBack={isAdmin} onBack={() => nav('/admin')} />
      <ToastContainer toasts={toasts} />

      <div style={{ paddingTop: 52 }}>
        <div style={{ background: 'var(--dark2)', padding: '10px 16px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
            {eventos.map(ev => {
              const est = ESTADOS[ev.estado] || ESTADOS.activo
              return (
                <button key={ev.id}
                  onClick={() => { setEventoActivo(ev); setArbIdx(0); setGuardados({}) }}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    fontFamily: 'var(--font)', cursor: 'pointer', transition: 'all 0.2s',
                    border: eventoActivo?.id === ev.id ? `2px solid ${est.color}` : '2px solid transparent',
                    background: eventoActivo?.id === ev.id ? est.bg : 'rgba(255,255,255,0.06)',
                    color: eventoActivo?.id === ev.id ? est.color : 'rgba(255,255,255,0.6)',
                    whiteSpace: 'nowrap',
                  }}>
                  {ev.nombre}
                  <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: est.color, color: 'white' }}>
                    {est.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ padding: '16px', maxWidth: 700, margin: '0 auto' }}>
          {eventoActivo && (
            <div style={{ background: 'var(--dark2)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{eventoActivo.nombre}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {eventoActivo.sede || ''}{miArea && ` · Área: ${miArea.nombre}`}
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: estadoInfo.bg, color: estadoInfo.color }}>
                {estadoInfo.label}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => cambiarModalidad('kumite')}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s',
                border: modalidad === 'kumite' ? '2px solid var(--gold)' : '1px solid var(--border)',
                background: modalidad === 'kumite' ? 'var(--gold-light)' : 'white',
                color: modalidad === 'kumite' ? '#92400E' : 'var(--gray)',
              }}>
              🥋 Kumite
            </button>
            <button onClick={() => cambiarModalidad('kata')}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s',
                border: modalidad === 'kata' ? '2px solid var(--blue)' : '1px solid var(--border)',
                background: modalidad === 'kata' ? 'var(--blue-light)' : 'white',
                color: modalidad === 'kata' ? 'var(--blue)' : 'var(--gray)',
              }}>
              🥋 Kata
            </button>
          </div>

          {!puedeEvaluar && (
            <div style={{ background: 'var(--red-light)', border: '1px solid #FCA5A5', borderRadius: 12, padding: '16px 20px', marginBottom: 14, fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>
              ⚠ Este evento está <strong>{estadoInfo.label}</strong> — no se puede evaluar
            </div>
          )}

          {arbitros.length === 0 && (
            <Empty icon="🥋" title="Sin árbitros asignados" description="El administrador debe asignar árbitros al evento." />
          )}

          {arbitros.length > 0 && arb && (
            <>
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                <ProgressBar value={evaluadosCount} max={misArbitros.length || 1}
                  label={`Progreso — ${modalidad.toUpperCase()}${miArea ? ` · ${miArea.nombre}` : ''}`}
                  sublabel={`${evaluadosCount} / ${misArbitros.length} evaluados`} />
              </div>

              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <button onClick={() => setArbIdx(i => Math.max(0, i-1))} disabled={arbIdx === 0}
                  style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: arbIdx===0?'not-allowed':'pointer', opacity: arbIdx===0?0.3:1, fontSize: 16, flexShrink: 0 }}>←</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {arb.foto_url
                      ? <img src={`${apiBase}${arb.foto_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--gray2)' }}>
                          {nombreCompleto(arb).split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase()}
                        </span>
                    }
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nombreCompleto(arb)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{arb.licencia}</div>
                    {arb.area_nombre && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 1 }}>📍 {arb.area_nombre}</div>}
                  </div>
                </div>

                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>{arbIdx+1}/{arbitros.length}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: guardados[arb.id] ? 'var(--green)' : 'var(--gray2)' }}>
                    {guardados[arb.id] ? '✓ Eval.' : 'Pendiente'}
                  </div>
                </div>

                <button onClick={() => setArbIdx(i => Math.min(arbitros.length-1, i+1))} disabled={arbIdx === arbitros.length-1}
                  style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: arbIdx===arbitros.length-1?'not-allowed':'pointer', opacity: arbIdx===arbitros.length-1?0.3:1, fontSize: 16, flexShrink: 0 }}>→</button>
              </div>

              {!puedoEvaluarEste && !isAdmin && (
                <div style={{ background: 'var(--gold-light)', border: '1px solid var(--gold)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#92400E' }}>
                  👁 Puedes ver este árbitro pero no puedes evaluarlo — no pertenece a tu área
                </div>
              )}

              <ScorePanel scores={arbScores} criterios={criterios} />

              {criterios.map(c => (
                <CriteriaCard key={c.key} label={c.label}
                  value={arbScores[c.key] || 0}
                  onChange={val => handleScore(c.key, val)}
                  disabled={saving || !puedeEvaluar || (!puedoEvaluarEste && !isAdmin)}
                />
              ))}

              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>
                  Comentario — {modalidad.toUpperCase()} <span style={{ fontWeight: 400, color: 'var(--gray2)' }}>(opcional)</span>
                </div>
                <textarea
                  value={arbComentario}
                  onChange={e => setComentarios(prev => ({ ...prev, [arb.id]: e.target.value }))}
                  placeholder={`Observaciones sobre el desempeño en ${modalidad}...`}
                  rows={3}
                  disabled={saving || !puedeEvaluar || (!puedoEvaluarEste && !isAdmin)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = 'var(--red)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {(puedoEvaluarEste || isAdmin) && puedeEvaluar && (
                <button onClick={guardar} disabled={saving || !todoCompleto}
                  style={{
                    width: '100%', padding: '13px',
                    background: todoCompleto ? 'var(--green)' : 'var(--border)',
                    color: todoCompleto ? 'white' : 'var(--gray)',
                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    cursor: saving || !todoCompleto ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font)', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {saving ? <Spinner size={16} color="white" /> : null}
                  {saving ? 'Guardando...' : todoCompleto ? `Guardar ${modalidad.toUpperCase()} y continuar →` : 'Evalúa todos los criterios'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
