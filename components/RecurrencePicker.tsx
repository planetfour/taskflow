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
  { value: 'custom', label: 'Custom days' },
]

const WEEKDAYS = [
  { label: 'Mon', bit: 1 },
  { label: 'Tue', bit: 2 },
  { label: 'Wed', bit: 4 },
  { label: 'Thu', bit: 8 },
  { label: 'Fri', bit: 16 },
  { label: 'Sat', bit: 32 },
  { label: 'Sun', bit: 64 },
]

export default function RecurrencePicker({ type, interval, onChange }: Props) {
  const dayMask = interval ?? 31

  function toggleDay(bit: number) {
    const next = dayMask ^ bit
    onChange('custom', next === 0 ? 1 : next)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: type === 'custom' ? 8 : 0 }}>
        {OPTIONS.map(o => (
          <button key={String(o.value)} onClick={() => {
            if (o.value === 'custom') {
              const defaultMask = interval !== null && interval > 0 && interval <= 127 ? interval : 31
              onChange('custom', defaultMask)
            } else {
              onChange(o.value, null)
            }
          }} style={{
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
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
          {WEEKDAYS.map(({ label, bit }) => {
            const selected = (dayMask & bit) !== 0
            return (
              <button key={bit} onClick={() => toggleDay(bit)} style={{
                fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 6,
                background: selected ? 'var(--accent)' : 'var(--surface2)',
                color: selected ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
              }}>{label}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}
