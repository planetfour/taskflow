import Nav from '@/components/Nav'
import { CalendarDays } from 'lucide-react'

const S = { background: 'var(--surface2)', borderRadius: 8, animation: 'skeleton-pulse 1.4s ease-in-out infinite' }

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarDays size={16} color="var(--accent)" />
        </div>
        <div style={{ ...S, width: 60, height: 22 }} />
        <div style={{ ...S, width: 130, height: 14 }} />
      </div>
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ ...S, width: 60, height: 13 }} />
          <div style={{ ...S, width: 22, height: 18, borderRadius: 10 }} />
          <div style={{ flex: 1, height: 1, background: 'var(--surface2)' }} />
        </div>
        {[1, 2].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px', marginBottom: 6, borderLeft: '3px solid #ef444433' }}>
            <div style={{ ...S, width: `${55 + i * 15}%`, height: 16, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ ...S, width: 55, height: 17, borderRadius: 20 }} />
              <div style={{ ...S, width: 72, height: 17, borderRadius: 20 }} />
            </div>
          </div>
        ))}
        <div style={{ height: 18 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ ...S, width: 48, height: 13 }} />
          <div style={{ ...S, width: 22, height: 18, borderRadius: 10 }} />
          <div style={{ flex: 1, height: 1, background: 'var(--surface2)' }} />
        </div>
        {[1].map(i => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 13px', marginBottom: 6, borderLeft: '3px solid var(--accent)44' }}>
            <div style={{ ...S, width: '70%', height: 16, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ ...S, width: 64, height: 17, borderRadius: 20 }} />
            </div>
          </div>
        ))}
      </div>
      <Nav />
    </div>
  )
}
