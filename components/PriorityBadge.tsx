import { Priority } from '@/lib/types'
import { priorityColor, priorityLabel } from '@/lib/utils'

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const color = priorityColor(priority)
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
      color, background: `${color}22`, border: `1px solid ${color}44`,
      padding: '2px 7px', borderRadius: 5,
    }}>
      {priorityLabel(priority)}
    </span>
  )
}
