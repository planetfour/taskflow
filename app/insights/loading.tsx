import { BarChart2 } from 'lucide-react'

const S = { background: 'var(--surface2)', borderRadius: 8, animation: 'skeleton-pulse 1.4s ease-in-out infinite' }

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart2 size={16} color="var(--accent)" />
        </div>
        <div style={{ ...S, width: 80, height: 22 }} />
      </div>
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[90, 70, 80, 60].map((w, i) => (
            <div key={i} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 12px' }}>
              <div style={{ ...S, width: `${w}%`, height: 28, marginBottom: 6 }} />
              <div style={{ ...S, width: '60%', height: 12 }} />
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 14px', marginBottom: 14 }}>
          <div style={{ ...S, width: 100, height: 13, marginBottom: 14 }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {[40, 65, 30, 80, 50, 70, 45].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ ...S, width: '100%', height: `${h}%`, borderRadius: 4 }} />
                <div style={{ ...S, width: '70%', height: 10, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px' }}>
          <div style={{ ...S, width: 80, height: 13, marginBottom: 12 }} />
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ ...S, width: `${40 + i * 10}%`, height: 14 }} />
              <div style={{ ...S, width: 30, height: 14, borderRadius: 20 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
