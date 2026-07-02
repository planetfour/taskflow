import { Tag } from 'lucide-react'

const S = { background: 'var(--surface2)', borderRadius: 8, animation: 'skeleton-pulse 1.4s ease-in-out infinite' }

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={16} color="var(--accent)" />
          </div>
          <div style={{ ...S, width: 60, height: 22 }} />
        </div>
        <div style={{ ...S, width: 72, height: 34, borderRadius: 10 }} />
      </div>
      <div style={{ padding: '0 16px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...S, width: 28, height: 28, borderRadius: '50%' }} />
              <div style={{ ...S, width: `${40 + i * 15}%`, height: 17 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
