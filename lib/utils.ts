import { Priority, RecurrenceType } from './types'

export function priorityColor(priority: Priority): string {
  switch (priority) {
    case 'urgent': return '#ef4444'
    case 'high':   return '#f97316'
    case 'medium': return '#6c5ce7'
    case 'low':    return '#6b7280'
  }
}

export function priorityLabel(priority: Priority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

export function formatDeadline(date: string | null): string | null {
  if (!date) return null
  const d = new Date(date + 'T00:00:00')
  const now = new Date()
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff <= 7) return `${diff}d left`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function deadlineUrgency(date: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!date) return null
  const d = new Date(date + 'T00:00:00')
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'overdue'
  if (diff <= 3) return 'soon'
  return 'ok'
}

export function formatCompletedAt(ts: string | null): string | null {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function recurrenceLabel(type: RecurrenceType | null, interval?: number | null): string | null {
  if (!type) return null
  switch (type) {
    case 'daily': return 'Daily'
    case 'weekly': return 'Weekly'
    case 'biweekly': return 'Every 2 weeks'
    case 'monthly': return 'Monthly'
    case 'custom': {
      const mask = interval ?? 0
      if (!mask) return 'Custom'
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const bits = [1, 2, 4, 8, 16, 32, 64]
      const names = days.filter((_, i) => mask & bits[i])
      return names.join(', ')
    }
  }
}

// dayBits maps JS getDay() (0=Sun...6=Sat) to bitmask values (Mon=1,Tue=2,Wed=4,Thu=8,Fri=16,Sat=32,Sun=64)
const DAY_BITS = [64, 1, 2, 4, 8, 16, 32]

export function nextDueDate(type: RecurrenceType, interval: number | null, fromDate?: Date): string {
  const base = fromDate ?? new Date()
  const d = new Date(base)
  switch (type) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'biweekly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'custom': {
      const mask = interval ?? 31
      for (let i = 1; i <= 7; i++) {
        const candidate = new Date(base)
        candidate.setDate(base.getDate() + i)
        if (mask & DAY_BITS[candidate.getDay()]) {
          return candidate.toISOString().split('T')[0]
        }
      }
      d.setDate(d.getDate() + 7); break
    }
  }
  return d.toISOString().split('T')[0]
}
