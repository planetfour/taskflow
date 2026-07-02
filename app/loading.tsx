import { LayoutGrid } from 'lucide-react'

const S = { background: 'var(--surface2)', borderRadius: 8, animation: 'skeleton-pulse 1.4s ease-in-out infinite' }

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutGrid size={16} color="var(--accent)" />
          </div>
          <div style={{ ...S, width: 90, height: 22 }} />
        </div>
        <div style={{ ...S, width: 72, height: 34, borderRadius: 10 }} />
      </div>
      <div style={{ height: 28 }} />
      <div style={{ padding: '0 16px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, borderLeft: '3px solid var(--surface2)' }}>
            <div style={{ ...S, width: `${55 + i * 8}%`, height: 17, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ ...S, width: 52, height: 20, borderRadius: 20 }} />
              <div style={{ ...S, width: 70, height: 20, borderRadius: 20 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
