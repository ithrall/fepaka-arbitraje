import { useState } from 'react'
import { Skeleton, Empty, ScorePill, Badge } from '../ui'

// ─────────────────────────────────────────
// CARD
// ─────────────────────────────────────────
export function Card({ title, subtitle, children, action, padding = '18px 20px', style = {} }) {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 14, padding, marginBottom: 14, ...style,
    }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: title ? 14 : 0 }}>
          <div>
            {title && (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '1.5px', color: 'var(--dark)' }}>
                {title}
              </div>
            )}
            {subtitle && <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'var(--red)', icon, style = {} }) {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14, ...style,
    }}>
      {icon && (
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: color + '15', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div>
        <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color, letterSpacing: '0.5px', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────
export function Table({
  columns, rows, loading = false, empty,
  onRowClick, keyExtractor = (_, i) => i,
  skeletonRows = 4,
}) {
  if (loading) return (
    <div style={{ overflow: 'hidden', borderRadius: 8, border: '1px solid var(--border)' }}>
      <div style={{ background: 'var(--dark)', padding: '9px 14px' }}>
        <Skeleton height={12} width="60%" style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>
      {Array.from({ length: skeletonRows }).map((_, i) => (
        <div key={i} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20 }}>
          {columns.map((col, j) => (
            <Skeleton key={j} height={12} width={col.skeletonWidth || '80px'} />
          ))}
        </div>
      ))}
    </div>
  )

  if (!loading && rows?.length === 0) return (
    empty || <Empty icon="📋" title="Sin datos" description="No hay registros para mostrar." />
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{
                background: 'var(--dark)', color: 'rgba(255,255,255,0.6)',
                padding: '9px 14px', textAlign: col.align || 'left',
                fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500,
                borderRadius: i === 0 ? '8px 0 0 0' : i === columns.length - 1 ? '0 8px 0 0' : 0,
                whiteSpace: 'nowrap',
                width: col.width,
              }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row, ri) => (
            <tr
              key={keyExtractor(row, ri)}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = 'var(--light)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}
            >
              {columns.map((col, ci) => (
                <td key={ci} style={{
                  padding: '10px 14px',
                  borderBottom: ri < rows.length - 1 ? '1px solid var(--border)' : 'none',
                  textAlign: col.align || 'left',
                  verticalAlign: 'middle',
                }}>
                  {col.cell ? col.cell(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────
export function ProgressBar({ value = 0, max = 100, label, sublabel, color = 'var(--green)', style = {} }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={style}>
      {(label || sublabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray)', marginBottom: 6 }}>
          <span>{label}</span>
          <span>{sublabel}</span>
        </div>
      )}
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// SCORE PANEL (barra de promedios en tiempo real)
// ─────────────────────────────────────────
export function ScorePanel({ scores = {}, criterios = [] }) {
  const allFilled = criterios.every(c => scores[c.key] > 0)
  const total = allFilled
    ? (criterios.reduce((s, c) => s + scores[c.key], 0) / criterios.length).toFixed(2)
    : null

  return (
    <div style={{
      background: 'var(--dark)', borderRadius: 12,
      padding: '14px 18px', marginBottom: 12,
      display: 'grid',
      gridTemplateColumns: `repeat(${criterios.length}, 1fr) auto`,
      gap: 8, alignItems: 'center',
    }}>
      {criterios.map((c, i) => (
        <div key={c.key} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>
            {c.short || c.label}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'white' }}>
            {scores[c.key] ? scores[c.key].toFixed(1) : '—'}
          </div>
        </div>
      ))}
      <div style={{ background: 'var(--red)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>Total</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'white' }}>{total || '—'}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// CRITERIA CARD (slider de evaluación)
// ─────────────────────────────────────────
export function CriteriaCard({ label, value, onChange, disabled = false }) {
  const pct = value ? ((value - 1) / 4) * 100 : 0
  const track = `linear-gradient(to right, var(--red) ${pct}%, var(--border) ${pct}%)`
  const filled = value > 0

  return (
    <div style={{
      background: 'white', border: `1px solid ${filled ? 'var(--border)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 18px', marginBottom: 10,
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1,
          color: filled ? 'var(--red)' : 'var(--gray2)',
          transition: 'color 0.2s',
        }}>
          {filled ? value.toFixed(1) : '—'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--gray2)', fontWeight: 500 }}>1.0</span>
        <input
          type="range" min="10" max="50" step="1"
          value={value ? Math.round(value * 10) : 10}
          disabled={disabled}
          onChange={e => onChange(parseInt(e.target.value) / 10)}
          style={{
            flex: 1, height: 6, borderRadius: 3, background: track,
            outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
            WebkitAppearance: 'none', appearance: 'none',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--gray2)', fontWeight: 500 }}>5.0</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────
// ASSIGN LIST ITEM
// ─────────────────────────────────────────
export function AssignItem({ name, sub, assigned, onToggle, loading = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 14px', borderBottom: '1px solid var(--border)',
      background: assigned ? 'var(--green-light)' : 'white',
      transition: 'background 0.2s', fontSize: 13,
    }}>
      <div>
        <div style={{ fontWeight: 500, color: 'var(--dark)' }}>{name}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        style={{
          padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 500,
          cursor: loading ? 'wait' : 'pointer', border: 'none', fontFamily: 'var(--font)',
          background: assigned ? 'var(--light)' : 'var(--red)',
          color: assigned ? 'var(--dark)' : 'white',
          border: assigned ? '1px solid var(--border)' : 'none',
          transition: 'all 0.15s',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '...' : assigned ? 'Quitar' : '+ Agregar'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────
// EVENTO BANNER (mostrar evento activo en pantalla de evaluación)
// ─────────────────────────────────────────
export function EventoBanner({ nombre, fecha, sede }) {
  if (!nombre) return null
  const fechaFmt = fecha
    ? new Date(fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  return (
    <div style={{
      background: 'var(--dark2)', borderRadius: 10,
      padding: '10px 16px', marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{
        background: 'var(--red)', borderRadius: 6, padding: '3px 10px',
        fontSize: 10, fontWeight: 600, color: 'white', letterSpacing: '1px',
        textTransform: 'uppercase', flexShrink: 0,
      }}>Evento</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{nombre}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          {[fechaFmt, sede].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}
