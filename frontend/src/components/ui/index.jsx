import { forwardRef } from 'react'

// ─────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────
const buttonVariants = {
  primary:   { background: 'var(--red)',   color: 'white',          border: 'none' },
  secondary: { background: 'var(--light)', color: 'var(--dark)',    border: '1px solid var(--border)' },
  ghost:     { background: 'transparent',  color: 'var(--gray)',    border: '1px solid var(--border)' },
  danger:    { background: 'var(--red-light)', color: 'var(--red)', border: '1px solid #FCA5A5' },
  success:   { background: 'var(--green)', color: 'white',          border: 'none' },
}
const buttonSizes = {
  xs: { padding: '3px 8px',   fontSize: 11, borderRadius: 6 },
  sm: { padding: '5px 10px',  fontSize: 12, borderRadius: 7 },
  md: { padding: '8px 16px',  fontSize: 13, borderRadius: 8 },
  lg: { padding: '11px 20px', fontSize: 14, borderRadius: 10 },
  xl: { padding: '13px 24px', fontSize: 15, borderRadius: 10 },
}

export const Button = forwardRef(({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = false,
  icon, iconRight, style = {}, onClick, type = 'button', ...props
}, ref) => {
  const v = buttonVariants[variant] || buttonVariants.primary
  const s = buttonSizes[size] || buttonSizes.md
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        ...v, ...s,
        fontFamily: 'var(--font)',
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: fullWidth ? '100%' : 'auto',
        transition: 'all 0.15s ease',
        outline: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={e => {
        if (!isDisabled) e.currentTarget.style.filter = 'brightness(0.92)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'brightness(1)'
      }}
      {...props}
    >
      {loading ? <Spinner size={14} color="currentColor" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
})
Button.displayName = 'Button'

// ─────────────────────────────────────────
// BADGE
// ─────────────────────────────────────────
const badgeVariants = {
  red:     { background: 'var(--red-light)',   color: 'var(--red)' },
  green:   { background: 'var(--green-light)', color: 'var(--green)' },
  blue:    { background: 'var(--blue-light)',  color: 'var(--blue)' },
  gold:    { background: 'var(--gold-light)',  color: '#92400E' },
  gray:    { background: 'var(--light)',       color: 'var(--gray)' },
  dark:    { background: 'var(--dark)',        color: 'white' },
}

export function Badge({ children, variant = 'gray', dot = false, style = {} }) {
  const v = badgeVariants[variant] || badgeVariants.gray
  return (
    <span style={{
      ...v,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 9999,
      fontSize: 11, fontWeight: 500,
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  )
}

// ─────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--red)', style = {} }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0, ...style }}
      aria-label="Cargando..."
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.2" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ─────────────────────────────────────────
// SKELETON (loading placeholder)
// ─────────────────────────────────────────
export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'linear-gradient(90deg, var(--light) 25%, var(--border) 50%, var(--light) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  )
}

// ─────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────
export function Empty({ icon = '📭', title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      {title && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>{title}</div>}
      {description && <div style={{ fontSize: 13, color: 'var(--gray)', maxWidth: 280, lineHeight: 1.5 }}>{description}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

// ─────────────────────────────────────────
// ERROR STATE
// ─────────────────────────────────────────
export function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      background: 'var(--red-light)', border: '1px solid #FCA5A5',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 20 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 2 }}>Algo salió mal</div>
        <div style={{ fontSize: 12, color: '#B91C1C' }}>{message}</div>
      </div>
      {onRetry && <Button variant="ghost" size="sm" onClick={onRetry}>Reintentar</Button>}
    </div>
  )
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
const toastStyles = {
  success: { background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--successBorder)', icon: '✓' },
  error:   { background: 'var(--red-light)',   color: 'var(--red)',   border: '1px solid #FCA5A5', icon: '✕' },
  info:    { background: 'var(--blue-light)',  color: 'var(--blue)',  border: '1px solid #93C5FD', icon: 'ℹ' },
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = toastStyles[t.type] || toastStyles.info
        return (
          <div key={t.id} style={{
            ...s, borderRadius: 10, padding: '10px 16px',
            fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            animation: 'slideIn 0.2s ease',
            pointerEvents: 'auto', maxWidth: 320,
          }}>
            <style>{`@keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }`}</style>
            <span style={{ fontWeight: 700 }}>{s.icon}</span>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────
export function Divider({ label, style = {} }) {
  if (!label) return <div style={{ height: 1, background: 'var(--border)', margin: '12px 0', ...style }} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', ...style }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 11, color: 'var(--gray2)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ─────────────────────────────────────────
// PILL SCORE
// ─────────────────────────────────────────
export function ScorePill({ value }) {
  if (!value) return <span style={{ color: 'var(--gray2)', fontSize: 12 }}>—</span>
  const num = parseFloat(value)
  const variant = num >= 4 ? 'green' : num >= 3 ? 'gold' : 'red'
  return <Badge variant={variant} style={{ fontWeight: 700, fontSize: 12 }}>{value}</Badge>
}

// ─────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────
export function Avatar({ name = '', size = 32, src, color = 'var(--red)' }) {
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, color: 'white',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  )
}
