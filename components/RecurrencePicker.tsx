'use client'
import { RecurrenceType } from '@/lib/types'
import { RotateCcw } from 'lucide-react'

interface Props {
  type: RecurrenceType | null
  interval: number | null
  onChange: (type: RecurrenceType | null, interval: number | null) => void
}

const OPTIONS: { value: RecurrenceType | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
]

export default function RecurrencePicker({ type, interval, onChange }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: type === 'custom' ? 8 : 0 }}>
        {OPTIONS.map(o => (
          <button key={String(o.value)} onClick={() => onChange(o.value, o.value === 'custom' ? (interval ?? 7) : null)} style={{
            fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            background: type === o.value ? 'var(--accent)' : 'var(--surface2)',
            color: type === o.value ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${type === o.value ? 'var(--accent)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {o.value === null ? o.label : <><RotateCcw size={11} />{o.label}</>}
          </button>
        ))}
      </div>
      {type === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Every</span>
          <input type="number" min={1} max={365} value={interval ?? 7}
            onChange={e => onChange('custom', parseInt(e.target.value) || 7)}
            style={{ width: 64, textAlign: 'center' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>days</span>
        </div>
      )}
    </div>
  )
}
