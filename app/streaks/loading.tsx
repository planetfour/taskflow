import { Flame } from 'lucide-react'

const S = { background: 'var(--surface2)', borderRadius: 8, animation: 'skeleton-pulse 1.4s ease-in-out infinite' }

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Flame size={16} color="var(--accent)" />
        </div>
        <div style={{ ...S, width: 80, height: 22 }} />
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {[1, 2].map(g => (
          <div key={g}>
            <div style={{ ...S, width: 90, height: 12, marginBottom: 10 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2].map(i => (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ ...S, width: 46, height: 46, borderRadius: 12 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...S, width: '60%', height: 14, marginBottom: 6 }} />
                    <div style={{ ...S, width: '40%', height: 11 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
