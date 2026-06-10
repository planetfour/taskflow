import { formatDeadline, deadlineUrgency } from '@/lib/utils'
import { CalendarClock } from 'lucide-react'

export default function DeadlineBadge({ date }: { date: string | null }) {
  if (!date) return null
  const label = formatDeadline(date)
  const urgency = deadlineUrgency(date)
  const color = urgency === 'overdue' ? '#ef4444' : urgency === 'soon' ? '#f97316' : 'var(--text-muted)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color }}>
      <CalendarClock size={12} />
      {label}
    </span>
  )
}
