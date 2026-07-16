'use client'
import { useEffect, useState } from 'react'
import { formatDeadline, deadlineUrgency } from '@/lib/utils'
import { CalendarClock } from 'lucide-react'

export default function DeadlineBadge({ date }: { date: string | null }) {
  // SSR runs in the server's TZ (UTC), which can be a different calendar day than the viewer's — defer to client render.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!date) return null
  const label = mounted ? formatDeadline(date) : date
  const urgency = mounted ? deadlineUrgency(date) : null
  const color = urgency === 'overdue' ? '#ef4444' : urgency === 'soon' ? '#f97316' : 'var(--text-muted)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color }}>
      <CalendarClock size={12} />
      {label}
    </span>
  )
}
