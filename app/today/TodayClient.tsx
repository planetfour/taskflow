'use client'
import { useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Task, Area, TaskStatus } from '@/lib/types'
import Nav from '@/components/Nav'
import DeadlineBadge from '@/components/DeadlineBadge'
import TaskEditModal from '@/components/TaskEditModal'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, RotateCcw } from 'lucide-react'
import { nextDueDate, recurrenceLabel } from '@/lib/utils'

const HOLD_COLOR = '#eab308'

type TaskWithProject = Task & { projects: { id: string; name: string; color: string } | null }

interface Props {
  tasks: TaskWithProject[]
  recurringTasks: TaskWithProject[]
  allAreas: Area[]
  userId: string
  today: string
}

export default function TodayClient({ tasks, recurringTasks, allAreas, userId, today }: Props) {
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, TaskStatus>>({})
  const router = useRouter()
  const supabase = createClient()

  function effectiveStatus(task: TaskWithProject): TaskStatus {
    return localStatuses[task.id] ?? task.status
  }

  const activeTasks = tasks.filter(t => effectiveStatus(t) !== 'done')
  const overdue = activeTasks.filter(t => t.deadline! < today)
  const todayTasks = activeTasks.filter(t => t.deadline === today)
  const upcoming = activeTasks.filter(t => t.deadline! > today)
  const activeRecurring = recurringTasks.filter(t => effectiveStatus(t) !== 'done')

  const upcomingByDate: Record<string, TaskWithProject[]> = {}
  upcoming.forEach(t => {
    const d = t.deadline!
    if (!upcomingByDate[d]) upcomingByDate[d] = []
    upcomingByDate[d].push(t)
  })
  const upcomingDates = Object.keys(upcomingByDate).sort()

  async function toggleStatus(task: TaskWithProject) {
    const current = effectiveStatus(task)
    const next: TaskStatus = current === 'done' ? 'todo' : current === 'todo' ? 'holding' : 'done'
    const completedAt = next === 'done' ? new Date().toISOString() : null
    setLocalStatuses(prev => ({ ...prev, [task.id]: next }))
    await supabase.from('tasks').update({ status: next, completed_at: completedAt }).eq('id', task.id)
    if (next === 'done' && task.recurrence_type) {
      const due = nextDueDate(task.recurrence_type, task.recurrence_interval)
      await supabase.from('tasks').insert({
        title: task.title, notes: task.notes, priority: task.priority, status: 'todo',
        project_id: task.project_id, user_id: userId, parent_task_id: null,
        deadline: due, recurrence_type: task.recurrence_type, recurrence_interval: task.recurrence_interval,
      })
    }
    startTransition(() => router.refresh())
  }

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function renderTask(task: TaskWithProject, showRecurrenceLabel = false) {
    const status = effectiveStatus(task)
    const done = status === 'done'
    const holding = status === 'holding'
    const proj = task.projects
    const recurLabel = showRecurrenceLabel ? recurrenceLabel(task.recurrence_type, task.recurrence_interval) : null
    return (
      <div key={task.id} onClick={() => setEditingTask(task)} style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '11px 13px', marginBottom: 6,
        opacity: done ? 0.5 : 1,
        borderLeft: proj ? `3px solid ${proj.color}` : '3px solid var(--border)',
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <button onClick={e => { e.stopPropagation(); toggleStatus(task) }} style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            border: `2px solid ${done ? 'var(--accent)' : holding ? HOLD_COLOR : 'var(--border)'}`,
            background: done ? 'var(--accent)' : holding ? `${HOLD_COLOR}22` : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
            {holding && (
              <div style={{ display: 'flex', gap: 2 }}>
                <span style={{ width: 2, height: 7, borderRadius: 1, background: HOLD_COLOR, display: 'block' }} />
                <span style={{ width: 2, height: 7, borderRadius: 1, background: HOLD_COLOR, display: 'block' }} />
              </div>
            )}
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', marginBottom: 4 }}>
              {task.title}
              {task.recurrence_type && (
                <RotateCcw size={11} style={{ marginLeft: 5, color: 'var(--accent)', display: 'inline', verticalAlign: 'middle' }} />
              )}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {proj && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: proj.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
                  {proj.name}
                </span>
              )}
              {recurLabel && (
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>{recurLabel}</span>
              )}
              <DeadlineBadge date={task.deadline} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color }}>
          {label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, background: `${color}22`, color,
          borderRadius: 10, padding: '1px 7px',
        }}>{count}</span>
        <div style={{ flex: 1, height: 1, background: `${color}33` }} />
      </div>
    )
  }

  const isEmpty = overdue.length === 0 && todayTasks.length === 0 && upcoming.length === 0 && activeRecurring.length === 0

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarDays size={16} color="var(--accent)" />
        </div>
        <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>Today</h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div style={{ padding: '0 16px' }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <CalendarDays size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No tasks due today or in the next 7 days</p>
          </div>
        )}

        {overdue.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Overdue" count={overdue.length} color="#ef4444" />
            {overdue.map(t => renderTask(t))}
          </div>
        )}

        {todayTasks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Today" count={todayTasks.length} color="var(--accent)" />
            {todayTasks.map(t => renderTask(t))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Upcoming" count={upcoming.length} color="var(--text-muted)" />
            {upcomingDates.map(date => (
              <div key={date} style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  marginBottom: 6, paddingLeft: 2,
                }}>
                  {formatDateLabel(date)}
                </div>
                {upcomingByDate[date].map(t => renderTask(t))}
              </div>
            ))}
          </div>
        )}

        {activeRecurring.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Recurring" count={activeRecurring.length} color="#6c5ce7" />
            {activeRecurring.map(t => renderTask(t, true))}
          </div>
        )}
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allAreas={allAreas}
          userId={userId}
          onClose={() => setEditingTask(null)}
          onSaved={() => { setEditingTask(null); startTransition(() => router.refresh()) }}
        />
      )}
      <Nav />
    </div>
  )
}
