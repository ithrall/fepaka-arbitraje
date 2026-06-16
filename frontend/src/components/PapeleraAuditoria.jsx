import { useState, useEffect } from 'react'
import { useToast } from '../hooks/useAsync'
import { Spinner, Empty, Badge, Button } from './ui'
import { Card } from './data'
import { nombreCompleto } from '../utils/criterios'
import api from '../api'

const ACCION_LABEL = {
  crear: { label: 'Creó', color: 'green' },
  editar: { label: 'Editó', color: 'blue' },
  eliminar: { label: 'Eliminó', color: 'red' },
  restaurar: { label: 'Restauró', color: 'gold' },
  cambiar_password: { label: 'Cambió password', color: 'gray' },
  cambiar_estado: { label: 'Cambió estado', color: 'gold' },
  importar_csv: { label: 'Importó CSV', color: 'blue' },
}

const ENTIDAD_LABEL = { evento: 'Evento', arbitro: 'Árbitro', evaluador: 'Evaluador' }

export default function PapeleraAuditoria() {
  const { toast } = useToast()
  const [tab, setTab] = useState('papelera')
  const [papelera, setPapelera] = useState(null)
  const [auditoria, setAuditoria] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEntidad, setFiltroEntidad] = useState('')

  useEffect(() => { cargarTodo() }, [])
  useEffect(() => { if (tab === 'log') cargarAuditoria() }, [tab, filtroEntidad])

  async function cargarTodo() {
    setLoading(true)
    try {
      const { data } = await api.get('/auditoria/papelera')
      setPapelera(data)
    } catch { toast.error('Error al cargar papelera') }
    finally { setLoading(false) }
  }

  async function cargarAuditoria() {
    try {
      const url = filtroEntidad ? `/auditoria?entidad=${filtroEntidad}` : '/auditoria'
      const { data } = await api.get(url)
      setAuditoria(data)
    } catch { toast.error('Error al cargar el log') }
  }

  async function restaurar(tipo, id, nombre) {
    try {
      await api.post(`/${tipo}/${id}/restaurar`)
      toast.success(`✓ ${nombre} restaurado correctamente`)
      cargarTodo()
    } catch (err) { toast.error(err.response?.data?.error || 'Error al restaurar') }
  }

  const totalPapelera = papelera
    ? papelera.eventos.length + papelera.arbitros.length + papelera.usuarios.length
    : 0

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '2px', color: 'var(--dark)', margin: 0 }}>
          PAPELERA Y AUDITORÍA
        </h1>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
          Elementos eliminados se pueden restaurar. Todas las acciones quedan registradas.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant={tab === 'papelera' ? 'primary' : 'secondary'} onClick={() => setTab('papelera')}>
          🗑 Papelera {totalPapelera > 0 && `(${totalPapelera})`}
        </Button>
        <Button variant={tab === 'log' ? 'primary' : 'secondary'} onClick={() => setTab('log')}>
          📋 Log de auditoría
        </Button>
      </div>

      {loading && tab === 'papelera' ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div>
      ) : tab === 'papelera' ? (
        <>
          {/* Eventos eliminados */}
          <Card title={`EVENTOS ELIMINADOS (${papelera?.eventos.length || 0})`}>
            {!papelera?.eventos.length ? (
              <Empty icon="📅" title="Sin eventos eliminados" />
            ) : papelera.eventos.map(ev => (
              <FilaPapelera key={ev.id}
                titulo={ev.nombre}
                subtitulo={[ev.sede, ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-ES') : null].filter(Boolean).join(' · ')}
                onRestaurar={() => restaurar('eventos', ev.id, ev.nombre)}
              />
            ))}
          </Card>

          {/* Árbitros eliminados */}
          <Card title={`ÁRBITROS ELIMINADOS (${papelera?.arbitros.length || 0})`}>
            {!papelera?.arbitros.length ? (
              <Empty icon="🥋" title="Sin árbitros eliminados" />
            ) : papelera.arbitros.map(a => (
              <FilaPapelera key={a.id}
                titulo={nombreCompleto(a)}
                subtitulo={[a.provincia, a.fepaka_id].filter(Boolean).join(' · ')}
                onRestaurar={() => restaurar('arbitros', a.id, nombreCompleto(a))}
              />
            ))}
          </Card>

          {/* Evaluadores eliminados */}
          <Card title={`EVALUADORES ELIMINADOS (${papelera?.usuarios.length || 0})`}>
            {!papelera?.usuarios.length ? (
              <Empty icon="👤" title="Sin evaluadores eliminados" />
            ) : papelera.usuarios.map(u => (
              <FilaPapelera key={u.id}
                titulo={u.nombre}
                subtitulo={`${u.username} · ${u.rol}`}
                onRestaurar={() => restaurar('usuarios', u.id, u.nombre)}
              />
            ))}
          </Card>
        </>
      ) : (
        <Card title="HISTORIAL DE ACCIONES" action={
          <select value={filtroEntidad} onChange={e => setFiltroEntidad(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, fontFamily: 'var(--font)' }}>
            <option value="">Todas las entidades</option>
            <option value="evento">Eventos</option>
            <option value="arbitro">Árbitros</option>
            <option value="evaluador">Evaluadores</option>
          </select>
        }>
          {auditoria.length === 0 ? (
            <Empty icon="📋" title="Sin registros" description="Aún no hay acciones registradas." />
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {auditoria.map(log => {
                const acc = ACCION_LABEL[log.accion] || { label: log.accion, color: 'gray' }
                return (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <Badge variant={acc.color}>{acc.label}</Badge>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>
                        <strong>{log.usuario_nombre}</strong> {acc.label.toLowerCase()} {ENTIDAD_LABEL[log.entidad] || log.entidad}
                        {log.entidad_nombre && <> — <strong>{log.entidad_nombre}</strong></>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 2 }}>
                        {new Date(log.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function FilaPapelera({ titulo, subtitulo, onRestaurar }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{titulo}</div>
        {subtitulo && <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 1 }}>{subtitulo}</div>}
      </div>
      <Button size="xs" variant="success" onClick={onRestaurar}>↩ Restaurar</Button>
    </div>
  )
}
