import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app, #F8FAFC)',
        color: 'var(--text-primary, #0F172A)',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <div style={{ fontSize: '56px', marginBottom: '16px' }}>🧭</div>
      <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
        Page Not Found
      </h1>
      <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '340px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
        We couldn&apos;t find what you were looking for. Let Srushti guide you back to your agenda.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
        }}
      >
        <span>🏠 Return to Dashboard</span>
      </Link>
    </div>
  )
}
