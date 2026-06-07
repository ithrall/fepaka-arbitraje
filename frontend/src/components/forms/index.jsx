import { forwardRef, useState, useId } from 'react'
import { Spinner } from '../ui'

// ─────────────────────────────────────────
// FIELD WRAPPER
// ─────────────────────────────────────────
export function Field({ label, error, hint, required, children, style = {} }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      {label && (
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 500,
          color: error ? 'var(--red)' : 'var(--gray)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5,
        }}>
          {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 4 }}>{hint}</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

// ─────────────────────────────────────────
// INPUT
// ─────────────────────────────────────────
const inputBase = {
  width: '100%', padding: '9px 12px',
  border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, fontFamily: 'var(--font)', color: 'var(--dark)',
  outline: 'none', background: 'white', transition: 'border 0.2s, box-shadow 0.2s',
}

export const Input = forwardRef(({
  error, icon, iconRight, size = 'md', style = {}, ...props
}, ref) => {
  const [focused, setFocused] = useState(false)
  const padding = size === 'sm' ? '7px 10px' : size === 'lg' ? '11px 14px' : '9px 12px'

  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--gray2)', fontSize: 14, pointerEvents: 'none',
        }}>{icon}</span>
      )}
      <input
        ref={ref}
        style={{
          ...inputBase, padding,
          paddingLeft: icon ? 32 : undefined,
          paddingRight: iconRight ? 32 : undefined,
          borderColor: error ? 'var(--red)' : focused ? 'var(--red)' : 'var(--border)',
          boxShadow: focused ? '0 0 0 3px rgba(200,16,46,0.1)' : 'none',
          ...style,
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        {...props}
      />
      {iconRight && (
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--gray2)', fontSize: 14,
        }}>{iconRight}</span>
      )}
    </div>
  )
})
Input.displayName = 'Input'

// ─────────────────────────────────────────
// PASSWORD INPUT (toggle visibility)
// ─────────────────────────────────────────
export const PasswordInput = forwardRef(({ error, ...props }, ref) => {
  const [show, setShow] = useState(false)
  return (
    <Input
      ref={ref}
      type={show ? 'text' : 'password'}
      error={error}
      iconRight={
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, color: 'var(--gray)' }}
          aria-label={show ? 'Ocultar password' : 'Mostrar password'}
        >
          {show ? '🙈' : '👁'}
        </button>
      }
      {...props}
    />
  )
})
PasswordInput.displayName = 'PasswordInput'

// ─────────────────────────────────────────
// SELECT
// ─────────────────────────────────────────
export const Select = forwardRef(({ children, error, style = {}, ...props }, ref) => {
  const [focused, setFocused] = useState(false)
  return (
    <select
      ref={ref}
      style={{
        ...inputBase,
        borderColor: error ? 'var(--red)' : focused ? 'var(--red)' : 'var(--border)',
        boxShadow: focused ? '0 0 0 3px rgba(200,16,46,0.1)' : 'none',
        cursor: 'pointer',
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    >
      {children}
    </select>
  )
})
Select.displayName = 'Select'

// ─────────────────────────────────────────
// TEXTAREA
// ─────────────────────────────────────────
export const Textarea = forwardRef(({ error, rows = 3, style = {}, ...props }, ref) => {
  const [focused, setFocused] = useState(false)
  return (
    <textarea
      ref={ref}
      rows={rows}
      style={{
        ...inputBase,
        resize: 'vertical', lineHeight: 1.5,
        borderColor: error ? 'var(--red)' : focused ? 'var(--red)' : 'var(--border)',
        boxShadow: focused ? '0 0 0 3px rgba(200,16,46,0.1)' : 'none',
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

// ─────────────────────────────────────────
// SEARCH INPUT
// ─────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Buscar...', style = {} }) {
  return (
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      icon="🔍"
      style={style}
    />
  )
}

// ─────────────────────────────────────────
// FILE DROP ZONE
// ─────────────────────────────────────────
export function FileDropZone({ accept, onChange, title, description, hint, disabled = false }) {
  const [dragOver, setDragOver] = useState(false)
  const id = useId()

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onChange({ target: { files: [file] } })
  }

  return (
    <label
      htmlFor={id}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        display: 'block',
        border: `2px dashed ${dragOver ? 'var(--red)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '24px 20px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        background: dragOver ? 'var(--red-light)' : 'var(--light)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)', marginBottom: 4 }}>
        {title || 'Haz clic o arrastra el archivo aquí'}
      </div>
      {description && <div style={{ fontSize: 13, color: 'var(--gray)' }}>{description}</div>}
      {hint && <div style={{ fontSize: 11, color: 'var(--gray2)', marginTop: 6 }}>{hint}</div>}
      <input id={id} type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} disabled={disabled} />
    </label>
  )
}

// ─────────────────────────────────────────
// SLIDER (para criterios de evaluación)
// ─────────────────────────────────────────
export function ScoreSlider({ value, onChange, min = 1, max = 5, step = 0.1, disabled = false }) {
  const pct = value ? ((value - min) / (max - min)) * 100 : 0
  const track = `linear-gradient(to right, var(--red) ${pct}%, var(--border) ${pct}%)`

  return (
    <input
      type="range"
      min={min * 10} max={max * 10} step={step * 10}
      value={value ? Math.round(value * 10) : min * 10}
      disabled={disabled}
      onChange={e => onChange(parseInt(e.target.value) / 10)}
      style={{
        width: '100%', height: 6, borderRadius: 3,
        background: track, outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        WebkitAppearance: 'none', appearance: 'none',
      }}
    />
  )
}
