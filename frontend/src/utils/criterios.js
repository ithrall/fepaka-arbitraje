export const CRITERIOS = {
  kumite: [
    { key: 'voz_mando',              label: 'Voz y Mando',              short: 'Voz' },
    { key: 'movilidad',              label: 'Movilidad del Árbitro',    short: 'Movilidad' },
    { key: 'gestos_senalizaciones',  label: 'Gestos y Señalizaciones',  short: 'Gestos' },
    { key: 'aplicacion_reglamento',  label: 'Aplicación del Reglamento',short: 'Reglamento' },
    { key: 'performance_presencia',  label: 'Performance y Presencia',  short: 'Performance' },
  ],
  kata: [
    { key: 'aplicacion_reglamento',  label: 'Aplicación del Reglamento',short: 'Reglamento' },
    { key: 'procedimiento',          label: 'Procedimiento',             short: 'Procedimiento' },
    { key: 'performance_presencia',  label: 'Performance y Presencia',  short: 'Performance' },
    { key: 'dominio_criterios',      label: 'Dominio de Criterios',      short: 'Dominio' },
    { key: 'focalizacion',           label: 'Focalización',              short: 'Focalización' },
  ],
}

export const LICENCIAS = [
  'Provincial Juez C','Provincial Juez B','Provincial Juez A',
  'Provincial Referee C','Provincial Referee B','Provincial Referee A',
  'Nacional Juez C','Nacional Juez B','Nacional Juez A',
  'Nacional Referee C','Nacional Referee B','Nacional Referee A',
  'CONDEKA Juez C','CONDEKA Juez B','CONDEKA Juez A',
  'CONDEKA Referee C','CONDEKA Referee B','CONDEKA Referee A',
  'PKF Juez C','PKF Juez B','PKF Juez A',
  'PKF Referee C','PKF Referee B','PKF Referee A',
  'WKF Juez B','WKF Juez A','WKF Referee B','WKF Referee A',
]

export const ESTADOS = {
  activo:     { label: 'Activo',     color: '#10B981', bg: '#ECFDF5' },
  detenido:   { label: 'Detenido',   color: '#F59E0B', bg: '#FFFBEB' },
  finalizado: { label: 'Finalizado', color: '#EF4444', bg: '#FEF2F2' },
  proximo:    { label: 'Próximo',    color: '#3B82F6', bg: '#EFF6FF' },
}

export function calcPromedio(scores, modalidad = 'kumite') {
  const crits = CRITERIOS[modalidad] || CRITERIOS.kumite
  const vals = crits.map(c => parseFloat(scores[c.key])).filter(v => !isNaN(v) && v > 0)
  if (!vals.length) return null
  return (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(2)
}

export function nombreCompleto(arb) {
  if (!arb) return ''
  return arb.nombre_completo ||
    (arb.apellido ? `${arb.nombre} ${arb.apellido}` : arb.nombre)
}
