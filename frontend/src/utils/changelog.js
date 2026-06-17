// ════════════════════════════════════════════════════
// FEPAKA — Historial de versiones
// Cada vez que se entrega un cambio, se agrega aquí una
// nueva entrada con versión, fecha y detalle de cambios.
// La entrada más reciente va PRIMERO en el array.
// ════════════════════════════════════════════════════

export const CHANGELOG = [
  {
    version: '1.5.0',
    fecha: '2026-06-17',
    titulo: 'Personalización de marca y corrección de persistencia',
    cambios: [
      { tipo: 'fix', texto: 'El logo y el nombre del club/federación ahora se guardan de forma confiable en el navegador (localStorage) y ya no se pierden al recargar la página o tras un nuevo despliegue.' },
      { tipo: 'nuevo', texto: 'Nuevo campo "Título de la aplicación" en Configuración para personalizar el subtítulo que aparece debajo del nombre (antes era el texto fijo "Gestión de Arbitraje").' },
      { tipo: 'mejora', texto: 'Renombrado "Escudo de la Federación" a "Logo" en toda la interfaz, y "Nombre de la Federación" a "Nombre del Club / Federación" para mayor flexibilidad de uso.' },
    ],
  },
  {
    version: '1.4.0',
    fecha: '2026-06-17',
    titulo: 'Corrección de árbitros duplicados en Resultados',
    cambios: [
      { tipo: 'fix', texto: 'Corregido bug donde un árbitro aparecía dos veces en "Promedios generales" cuando tenía registros de área duplicados en la base de datos.' },
      { tipo: 'fix', texto: 'La asignación de árbitros a un área ahora usa una transacción que elimina cualquier asignación previa antes de crear la nueva, evitando duplicados futuros.' },
      { tipo: 'nuevo', texto: 'Agregada ruta de limpieza para eliminar duplicados de área existentes en eventos ya creados.' },
    ],
  },
  {
    version: '1.3.0',
    fecha: '2026-06-17',
    titulo: 'Versionamiento y pie de página corporativo',
    cambios: [
      { tipo: 'nuevo', texto: 'Pie de página "© S2TechGroup · Todos los derechos reservados · s2techgroup.net" visible en Login, Admin, Evaluar y Reporte PDF.' },
      { tipo: 'nuevo', texto: 'Sistema de versionamiento semántico (v1.0.0) visible en el pie de página.' },
      { tipo: 'nuevo', texto: 'Historial de cambios (este panel) disponible en Configuración → Versión.' },
      { tipo: 'mejora', texto: 'Sidebar ahora responsive: se convierte en menú deslizable (drawer) en pantallas de celular, con botón ☰ para abrir/cerrar.' },
      { tipo: 'mejora', texto: 'Tamaño de texto de inputs ajustado a 16px en móvil para evitar el zoom automático de iOS.' },
    ],
  },
  {
    version: '1.2.0',
    fecha: '2026-06-16',
    titulo: 'Comparativa de árbitros y gráficos en reporte PDF',
    cambios: [
      { tipo: 'nuevo', texto: 'Estadísticas Globales ahora tiene modo "Comparar árbitros": selecciona entre 2 y 4 árbitros y compara sus promedios por evento o por criterio.' },
      { tipo: 'nuevo', texto: 'Opción de comparar un árbitro individual contra el promedio global de todos los evaluados del sistema.' },
      { tipo: 'nuevo', texto: 'Checkbox "Incluir gráficos en el reporte" en el reporte PDF — agrega gráfica de barras por evento y gráfica radar por criterio.' },
      { tipo: 'fix', texto: 'Footer de S2TechGroup ahora se repite correctamente en cada bloque de evento al imprimir el reporte a PDF.' },
    ],
  },
  {
    version: '1.1.0',
    fecha: '2026-06-16',
    titulo: 'Botón Inicio, edición de registros y papelera de reciclaje',
    cambios: [
      { tipo: 'nuevo', texto: 'Botón "Inicio" siempre visible en la barra superior para volver a la pantalla de bienvenida desde cualquier sección.' },
      { tipo: 'nuevo', texto: 'Edición de árbitros, evaluadores y eventos existentes mediante formularios modales.' },
      { tipo: 'nuevo', texto: 'Borrado lógico: eliminar un árbitro, evaluador o evento lo mueve a una papelera en lugar de borrarlo permanentemente.' },
      { tipo: 'nuevo', texto: 'Papelera de reciclaje en Configuración con opción de restaurar cualquier elemento eliminado.' },
      { tipo: 'nuevo', texto: 'Log de auditoría: registro de quién creó, editó, eliminó o restauró cada elemento, y cuándo.' },
      { tipo: 'fix', texto: 'Corregido apellido faltante en árbitros — ahora se muestra nombre y apellido completos en toda la aplicación.' },
    ],
  },
  {
    version: '1.0.0',
    fecha: '2026-06-15',
    titulo: 'Lanzamiento: modalidades Kata/Kumite, áreas y reportes',
    cambios: [
      { tipo: 'nuevo', texto: 'Rediseño de criterios: cada evaluación ahora es de modalidad Kata (5 criterios) o Kumite (5 criterios), elegida libremente por el evaluador.' },
      { tipo: 'nuevo', texto: 'Sistema de Áreas (tatamis): el administrador crea áreas, asigna un jefe de área (evaluador) y asigna árbitros a cada área.' },
      { tipo: 'nuevo', texto: 'El evaluador asignado como jefe de área solo ve y evalúa a los árbitros de su propia área.' },
      { tipo: 'nuevo', texto: 'Licencias actualizadas: 28 licencias posibles (Provincial, Nacional, CONDEKA, PKF, WKF — Juez y Referee, niveles A/B/C).' },
      { tipo: 'nuevo', texto: 'Estados de evento automáticos por fecha (Activo / Próximo / Finalizado), con override manual del administrador y estado "Detenido".' },
      { tipo: 'nuevo', texto: 'Reporte individual en PDF por árbitro con historial completo de evaluaciones por evento, exportable e imprimible en hoja carta.' },
      { tipo: 'nuevo', texto: 'Estadísticas Globales: gráfica interactiva del historial de un árbitro a través de todos los eventos.' },
      { tipo: 'nuevo', texto: 'Diseño completamente responsive para uso principal desde celular.' },
    ],
  },
]

export const VERSION_ACTUAL = CHANGELOG[0].version
