import { CalendarClock } from 'lucide-react'

const S = { background: 'var(--surface2)', borderRadius: 8, animation: 'skeleton-pulse 1.4s ease-in-out infinite' }

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarClock size={16} color="var(--accent)" />
        </div>
        <div style={{ ...S, width: 80, height: 22 }} />
      </div>
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
        <div style={{ ...S, flex: 1, height: 36, borderRadius: 10 }} />
        <div style={{ ...S, flex: 1, height: 36, borderRadius: 10 }} />
      </div>
      <div style={{ margin: '0 16px 20px' }}>
        <div style={{ ...S, height: 420, borderRadius: 12 }} />
      </div>
      <div style={{ padding: '0 16px' }}>
        <div style={{ ...S, width: 140, height: 12, marginBottom: 10 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', marginBottom: 6 }}>
            <div style={{ ...S, width: `${60 + i * 10}%`, height: 15 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
