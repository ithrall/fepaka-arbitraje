import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAsync, useToast } from '../hooks/useAsync'
import { AppShell } from '../components/layout'
import { Spinner, Empty, ErrorState, ToastContainer } from '../components/ui'
import { CriteriaCard, ScorePanel, ProgressBar, EventoBanner } from '../components/data'
import api from '../api'

const CRITERIOS = [
  { key: 'conformidad',           label: 'Conformidad',               short: 'Conform.' },
  { key: 'manejo_tatami',         label: 'Manejo del tatami',         short: 'Tatami'   },
  { key: 'instrucciones',         label: 'Instrucciones claras',      short: 'Instruc.' },
  { key: 'aplicacion_reglamento', label: 'Aplicación del reglamento', short: 'Reglam.'  },
  { key: 'presencia',             label: 'Presencia',                 short: 'Presencia'},
]

export default function Evaluar() {
  const { user, isAdmin } = useApp()
  const { toasts, toast } = useToast()
  const nav = useNavigate()

  const [eventoActivo, setEventoActivo] = useState(null)
  const [arbitros, setArbitros] = useState([])
  const [arbIdx, setArbIdx] = useState(0)
  const [scores, setScores] = useState({})       // { arbId: { criterio: valor } }
  const [comentarios, setComentarios] = useState({}) // { arbId: string }
  const [guardados, setGuardados] = useState({})  // { arbId: bool }
  const [saving, setSaving] = useState(false)
  const [loadingArbs, setLoadingArbs] = useState(false)

  // ── Cargar eventos disponibles ──
  const { data: eventos, loading: loadingEventos, error: errorEventos } = useAsync(
    () => api.get('/eventos').then(r => r.data), []
  )

  // ── Seleccionar evento del evaluador automáticamente ──
  useEffect(() => {
    if (!eventos?.length) return
    const evDelUsuario = eventos.find(ev => ev.evaluadores?.includes(user.id)) || eventos[0]
    setEventoActivo(evDelUsuario)
  }, [eventos, user.id])

  // ── Cargar árbitros del evento activo ──
  useEffect(() => {
    if (!eventoActivo) return
    setLoadingArbs(true)
    setArbIdx(0)
    api.get(`/arbitros/evento/${eventoActivo.id}`)
      .then(r => setArbitros(r.data))
      .catch(() => toast.error('Error al cargar árbitros'))
      .finally(() => setLoadingArbs(false))
  }, [eventoActivo?.id])

  // ── Cargar evaluación existente al cambiar árbitro ──
  useEffect(() => {
    const arb = arbitros[arbIdx]
    if (!arb || !eventoActivo) return
    if (guardados[arb.id] !== undefined) return // ya la tenemos en memoria

    api.get(`/evaluaciones/mia/arbitro/${arb.id}/evento/${eventoActivo.id}`)
      .then(r => {
        if (!r.data) return
        const s = {}
        CRITERIOS.forEach(c => { s[c.key] = r.data[c.key] ? parseFloat(r.data[c.key]) : 0 })
        setScores(prev => ({ ...prev, [arb.id]: s }))
        setComentarios(prev => ({ ...prev, [arb.id]: r.data.comentario || '' }))
        setGuardados(prev => ({ ...prev, [arb.id]: true }))
      })
      .catch(() => {})
  }, [arbIdx, arbitros, eventoActivo?.id])

  // ── Árbitro actual ──
  const arb = arbitros[arbIdx]
  const arbScores = arb ? (scores[arb.id] || {}) : {}
  const arbComentario = arb ? (comentarios[arb.id] || '') : ''
  const todoCompleto = CRITERIOS.every(c => (arbScores[c.key] || 0) > 0)
  const evaluadosCount = arbitros.filter(a => guardados[a.id]).length

  // ── Handlers ──
  const handleScore = useCallback((criterio, valor) => {
    if (!arb) return
    setScores(prev => ({
      ...prev,
      [arb.id]: { ...(prev[arb.id] || {}), [criterio]: valor }
    }))
  }, [arb])

  const handleComentario = useCallback((val) => {
    if (!arb) return
    setComentarios(prev => ({ ...prev, [arb.id]: val }))
  }, [arb])

  const handleGuardar = useCallback(async () => {
    if (!todoCompleto) { toast.error('Evalúa los 5 criterios antes de guardar'); return }
    setSaving(true)
    try {
      await api.post('/evaluaciones', {
        evento_id: eventoActivo.id,
        arbitro_id: arb.id,
        ...arbScores,
        comentario: arbComentario || null,
      })
      setGuardados(prev => ({ ...prev, [arb.id]: true }))
      toast.success(`✓ Evaluación de ${arb.nombre} guardada`)
      setTimeout(() => {
        if (arbIdx < arbitros.length - 1) setArbIdx(i => i + 1)
      }, 1200)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [todoCompleto, eventoActivo, arb, arbScores, arbComentario, arbIdx, arbitros.length])

  const navArb = useCallback((dir) => {
    setArbIdx(i => Math.max(0, Math.min(arbitros.length - 1, i + dir)))
  }, [arbitros.length])

  // ── Thumbnail del árbitro ──
  const apiBase = (import.meta.env.VITE_API_URL || '').replace('/api', '')
  const initials = arb?.nombre.split(' ').map(x => x[0]).join('').substring(0, 2).toUpperCase() || '??'

  // ── Loading / Error states ──
  if (loadingEventos) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={36} />
    </div>
  )

  if (errorEventos) return (
    <AppShell showBack={isAdmin}>
      <ErrorState message={errorEventos} onRetry={() => window.location.reload()} />
    </AppShell>
  )

  const tabs = isAdmin ? [
    { id: 'evaluar', label: '▶ Evaluando', icon: null }
  ] : []

  return (
    <AppShell showBack={isAdmin} onBack={() => nav('/admin')}>
      <ToastContainer toasts={toasts} />

      {/* Banner del evento activo */}
      {eventoActivo && (
        <EventoBanner
          nombre={eventoActivo.nombre}
          fecha={eventoActivo.fecha}
          sede={eventoActivo.sede}
        />
      )}

      {/* Barra de progreso general */}
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 14,
      }}>
        <ProgressBar
          value={evaluadosCount}
          max={arbitros.length || 1}
          label="Progreso de evaluación"
          sublabel={`${evaluadosCount} / ${arbitros.length} árbitros evaluados`}
        />
      </div>

      {/* Loading árbitros */}
      {loadingArbs && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner size={28} />
        </div>
      )}

      {/* Sin árbitros */}
      {!loadingArbs && arbitros.length === 0 && (
        <Empty
          icon="🥋"
          title="Sin árbitros asignados"
          description="El administrador debe asignar árbitros a este evento antes de evaluar."
        />
      )}

      {/* Panel de evaluación */}
      {!loadingArbs && arb && (
        <>
          {/* Navegación árbitro */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 16px', marginBottom: 14,
          }}>
            <button
              onClick={() => navArb(-1)} disabled={arbIdx === 0}
              style={navBtnStyle(arbIdx === 0)}
              aria-label="Árbitro anterior"
            >←</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Foto o iniciales */}
              <div style={{
                width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                background: 'var(--light)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {arb.foto_url
                  ? <img src={`${apiBase}${arb.foto_url}`} alt={arb.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gray2)' }}>{initials}</span>
                }
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--dark)' }}>{arb.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{arb.provincia} · {arb.licencia}</div>
                <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 1 }}>{arb.club} · {arb.fepaka_id}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>{arbIdx + 1} / {arbitros.length}</div>
              <div style={{
                fontSize: 11, marginTop: 3, fontWeight: 500,
                color: guardados[arb.id] ? 'var(--green)' : 'var(--gray2)',
              }}>
                {guardados[arb.id] ? '✓ Evaluado' : 'Sin evaluar'}
              </div>
            </div>

            <button
              onClick={() => navArb(1)} disabled={arbIdx === arbitros.length - 1}
              style={navBtnStyle(arbIdx === arbitros.length - 1)}
              aria-label="Árbitro siguiente"
            >→</button>
          </div>

          {/* Promedios en tiempo real */}
          <ScorePanel scores={arbScores} criterios={CRITERIOS} />

          {/* Criterios */}
          {CRITERIOS.map(c => (
            <CriteriaCard
              key={c.key}
              label={c.label}
              value={arbScores[c.key] || 0}
              onChange={val => handleScore(c.key, val)}
              disabled={saving}
            />
          ))}

          {/* Comentarios */}
          <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 12,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 500, color: 'var(--gray)',
              textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8,
            }}>
              Comentarios{' '}
              <span style={{ fontWeight: 400, color: 'var(--gray2)' }}>(opcional)</span>
            </div>
            <textarea
              value={arbComentario}
              onChange={e => handleComentario(e.target.value)}
              placeholder="Observaciones adicionales sobre el desempeño del árbitro..."
              rows={3}
              disabled={saving}
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)',
                outline: 'none', resize: 'vertical', lineHeight: 1.5,
                transition: 'border 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--red)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Botón guardar */}
          <button
            onClick={handleGuardar}
            disabled={saving || !todoCompleto}
            style={{
              width: '100%', padding: '13px',
              background: todoCompleto ? 'var(--green)' : 'var(--border)',
              color: todoCompleto ? 'white' : 'var(--gray)',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: saving || !todoCompleto ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font)', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving ? <Spinner size={16} color="white" /> : null}
            {saving ? 'Guardando...' : todoCompleto ? 'Guardar y continuar →' : 'Completa los 5 criterios para guardar'}
          </button>
        </>
      )}
    </AppShell>
  )
}

function navBtnStyle(disabled) {
  return {
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid var(--border)', background: 'white',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 16, opacity: disabled ? 0.3 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', fontFamily: 'var(--font)',
  }
}
