export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer style={{
      padding: '16px 20px',
      textAlign: 'center',
      fontSize: 11,
      color: 'var(--gray2)',
      borderTop: '1px solid var(--border)',
      background: 'var(--light)',
    }}>
      © {year} S2TechGroup · Todos los derechos reservados ·{' '}
      <a href="https://s2techgroup.net" target="_blank" rel="noopener noreferrer"
        style={{ color: 'var(--gray)', textDecoration: 'none' }}
        onMouseEnter={e => e.target.style.textDecoration = 'underline'}
        onMouseLeave={e => e.target.style.textDecoration = 'none'}>
        s2techgroup.net
      </a>
      {' '}· v1.0.0
    </footer>
  )
}
