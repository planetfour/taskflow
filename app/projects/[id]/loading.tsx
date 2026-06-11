import Nav from '@/components/Nav'

const S = { background: 'var(--surface2)', borderRadius: 8, animation: 'skeleton-pulse 1.4s ease-in-out infinite' }

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ ...S, width: 90, height: 34, borderRadius: 10 }} />
          <div style={{ ...S, width: 34, height: 34, borderRadius: 10 }} />
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', marginBottom: 14, borderTop: '3px solid var(--surface2)' }}>
          <div style={{ ...S, width: '55%', height: 24, marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ ...S, width: 52, height: 20, borderRadius: 20 }} />
            <div style={{ ...S, width: 70, height: 20, borderRadius: 20 }} />
          </div>
          <div style={{ marginTop: 12, height: 4, background: 'var(--surface2)', borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ padding: '0 16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 6, borderLeft: '3px solid var(--surface2)' }}>
            <div style={{ ...S, width: `${45 + i * 10}%`, height: 16, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ ...S, width: 55, height: 18, borderRadius: 20 }} />
            </div>
          </div>
        ))}
      </div>
      <Nav />
    </div>
  )
}
