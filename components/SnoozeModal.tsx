'use client'
import { useState } from 'react'
import { Task } from '@/lib/types'
import { X, AlarmClock } from 'lucide-react'

const WEEKDAYS = [
  { name: 'Mon', jsDay: 1, bit: 1 },
  { name: 'Tue', jsDay: 2, bit: 2 },
  { name: 'Wed', jsDay: 3, bit: 4 },
  { name: 'Thu', jsDay: 4, bit: 8 },
  { name: 'Fri', jsDay: 5, bit: 16 },
  { name: 'Sat', jsDay: 6, bit: 32 },
  { name: 'Sun', jsDay: 0, bit: 64 },
]

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nextOccurrenceOf(jsDay: number): string {
  const d = new Date()
  const current = d.getDay()
  let diff = jsDay - current
  if (diff <= 0) diff += 7
  d.setDate(d.getDate() + diff)
  return toLocalDate(d)
}

function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toLocalDate(d)
}

function formatShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  task: Task
  onSnooze: (date: string) => void
  onClose: () => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em',
  textTransform: 'uppercase', display: 'block', marginBottom: 8,
}

export default function SnoozeModal({ task, onSnooze, onClose }: Props) {
  const [customDate, setCustomDate] = useState('')
  const todayStr = toLocalDate(new Date())
  const isRecurring = !!task.recurrence_type
  const mask = task.recurrence_interval ?? 0

  const quickOptions = [
    { label: 'Tomorrow', date: addDays(1) },
    { label: 'In 2 days', date: addDays(2) },
    { label: 'In 3 days', date: addDays(3) },
    { label: 'Next week', date: addDays(7) },
  ]

  const chipBase: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
    border: '1px solid var(--border)', background: 'var(--surface2)',
    color: 'var(--text)', cursor: 'pointer', textAlign: 'center',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)', borderBottom: 'none',
        padding: '24px', width: '100%', maxWidth: 480,
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlarmClock size={16} color="var(--accent)" />
            <h2 style={{ fontWeight: 700, fontSize: 17 }}>Snooze task</h2>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', borderRadius: 8, padding: 6, color: 'var(--text-muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </p>

        {isRecurring ? (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Snooze to weekday</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {WEEKDAYS.map(({ name, jsDay, bit }) => {
                const date = nextOccurrenceOf(jsDay)
                const isAssigned = task.recurrence_type === 'custom' && !!(mask & bit)
                return (
                  <button key={name} onClick={() => onSnooze(date)} style={{
                    ...chipBase,
                    border: `1px solid ${isAssigned ? 'var(--accent)' : 'var(--border)'}`,
                    background: isAssigned ? 'var(--accent-dim)' : 'var(--surface2)',
                    color: isAssigned ? 'var(--accent)' : 'var(--text)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 4px',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }}>{formatShort(date)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Quick pick</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {quickOptions.map(o => (
                <button key={o.date} onClick={() => onSnooze(o.date)} style={{
                  ...chipBase, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}>
                  <span>{o.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>{formatShort(o.date)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Custom date</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              min={todayStr}
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              style={{ flex: 1, fontSize: 14 }}
            />
            <button
              onClick={() => customDate && onSnooze(customDate)}
              disabled={!customDate}
              style={{
                padding: '8px 18px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                background: customDate ? 'var(--accent)' : 'var(--surface2)',
                color: customDate ? '#fff' : 'var(--text-dim)',
                border: 'none', cursor: customDate ? 'pointer' : 'default',
              }}
            >
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
