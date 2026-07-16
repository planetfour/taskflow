'use client'
import { useState, useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Task, Area, TaskStatus } from '@/lib/types'
import DeadlineBadge from '@/components/DeadlineBadge'
import TaskEditModal from '@/components/TaskEditModal'
import SnoozeModal from '@/components/SnoozeModal'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, RotateCcw, AlarmClock, ChevronDown, ChevronRight } from 'lucide-react'
import { nextDueDate, recurrenceLabel, toLocalDate } from '@/lib/utils'

const HOLD_COLOR = '#eab308'

type TaskWithProject = Task & { projects: { id: string; name: string; color: string } | null }

type AreaGroup = {
  area: Area | null
  projects: { project: { id: string; name: string; color: string } | null; tasks: TaskWithProject[] }[]
}

interface Props {
  tasks: TaskWithProject[]
  recurringTasks: TaskWithProject[]
  allAreas: Area[]
  userId: string
  today: string
}

export default function TodayClient({ tasks, recurringTasks, allAreas, userId }: Props) {
  const today = toLocalDate(new Date())
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null)
  const [snoozingTask, setSnoozingTask] = useState<TaskWithProject | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, TaskStatus>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const supabase = createClient()

  function effectiveStatus(task: TaskWithProject): TaskStatus {
    return localStatuses[task.id] ?? task.status
  }

  useEffect(() => { setLocalStatuses({}) }, [tasks, recurringTasks])

  const activeTasks = tasks.filter(t => effectiveStatus(t) !== 'done')
  const overdue = activeTasks.filter(t => t.deadline! < today)
  const todayTasks = activeTasks.filter(t => t.deadline === today)
  const upcoming = activeTasks.filter(t => t.deadline! > today)
  const activeRecurring = recurringTasks.filter(t => effectiveStatus(t) !== 'done' && t.deadline !== null)
  const recurringDueNow = recurringTasks.filter(t => effectiveStatus(t) !== 'done' && t.deadline === null)

  const upcomingByDate: Record<string, TaskWithProject[]> = {}
  upcoming.forEach(t => {
    const d = t.deadline!
    if (!upcomingByDate[d]) upcomingByDate[d] = []
    upcomingByDate[d].push(t)
  })
  const upcomingDates = Object.keys(upcomingByDate).sort()

  function getTaskArea(task: TaskWithProject): Area | null {
    return task.areas?.[0] ?? null
  }

  function groupByAreaThenProject(taskList: TaskWithProject[]): AreaGroup[] {
    const groups: AreaGroup[] = []

    for (const area of allAreas) {
      const areaTasks = taskList.filter(t => (t.areas ?? [])[0]?.id === area.id)
      if (!areaTasks.length) continue
      const projMap = new Map<string | null, TaskWithProject[]>()
      for (const task of areaTasks) {
        const key = task.projects?.id ?? null
        if (!projMap.has(key)) projMap.set(key, [])
        projMap.get(key)!.push(task)
      }
      groups.push({
        area,
        projects: [...projMap.values()].map(ptasks => ({ project: ptasks[0].projects, tasks: ptasks })),
      })
    }

    const noAreaTasks = taskList.filter(t => (t.areas ?? []).length === 0)
    if (noAreaTasks.length) {
      const projMap = new Map<string | null, TaskWithProject[]>()
      for (const task of noAreaTasks) {
        const key = task.projects?.id ?? null
        if (!projMap.has(key)) projMap.set(key, [])
        projMap.get(key)!.push(task)
      }
      groups.push({
        area: null,
        projects: [...projMap.values()].map(ptasks => ({ project: ptasks[0].projects, tasks: ptasks })),
      })
    }

    return groups
  }

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function toggleDone(task: TaskWithProject) {
    const next: TaskStatus = effectiveStatus(task) === 'done' ? 'todo' : 'done'
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

  async function snoozeTask(date: string) {
    if (!snoozingTask) return
    await supabase.from('tasks').update({ deadline: date }).eq('id', snoozingTask.id)
    setSnoozingTask(null)
    startTransition(() => router.refresh())
  }

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === toLocalDate(tomorrow)) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function renderTask(task: TaskWithProject, showRecurrenceLabel = false) {
    const status = effectiveStatus(task)
    const done = status === 'done'
    const holding = status === 'holding'
    const proj = task.projects
    const area = getTaskArea(task)
    const recurLabel = showRecurrenceLabel ? recurrenceLabel(task.recurrence_type, task.recurrence_interval) : null
    const borderColor = area?.color ?? proj?.color ?? 'var(--border)'
    return (
      <div key={task.id} onClick={() => setEditingTask(task)} style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '11px 13px', marginBottom: 6,
        opacity: done ? 0.5 : 1,
        borderLeft: `3px solid ${borderColor}`,
        cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <button onClick={e => { e.stopPropagation(); toggleDone(task) }} style={{
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
          <button
            onClick={e => { e.stopPropagation(); setSnoozingTask(task) }}
            style={{ flexShrink: 0, padding: 4, background: 'none', color: 'var(--text-dim)', marginTop: 1 }}
            title="Snooze"
          >
            <AlarmClock size={15} />
          </button>
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

  function renderGrouped(taskList: TaskWithProject[], sectionKey: string, showRecurrenceLabel = false) {
    const groups = groupByAreaThenProject(taskList)
    return groups.map(({ area, projects }) => {
      const groupKey = `${sectionKey}-${area?.id ?? 'none'}`
      const isCollapsed = !!collapsedGroups[groupKey]
      const groupColor = area?.color ?? '#888888'
      const totalCount = projects.reduce((n, p) => n + p.tasks.length, 0)
      return (
        <div key={groupKey} style={{ marginBottom: 8 }}>
          <button
            onClick={() => toggleGroup(groupKey)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', padding: '3px 0', marginBottom: isCollapsed ? 0 : 5,
              width: '100%', textAlign: 'left', cursor: 'pointer',
            }}
          >
            {isCollapsed
              ? <ChevronRight size={13} style={{ color: groupColor, flexShrink: 0 }} />
              : <ChevronDown size={13} style={{ color: groupColor, flexShrink: 0 }} />
            }
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: groupColor, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: groupColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {area?.name ?? 'No Area'}
            </span>
            <span style={{ fontSize: 10, color: groupColor, opacity: 0.6, fontWeight: 600 }}>
              {totalCount}
            </span>
          </button>
          {!isCollapsed && projects.map(({ project, tasks: ptasks }) => (
            <div key={project?.id ?? 'no-project'} style={{ marginBottom: 6 }}>
              {projects.length > 1 && (
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: project?.color ?? 'var(--text-dim)',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                  paddingLeft: 19, marginBottom: 3,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: project?.color ?? 'var(--text-dim)', flexShrink: 0 }} />
                  {project?.name ?? 'No Project'}
                </div>
              )}
              {ptasks.map(t => renderTask(t, showRecurrenceLabel))}
            </div>
          ))}
        </div>
      )
    })
  }

  const isEmpty = overdue.length === 0 && todayTasks.length === 0 && recurringDueNow.length === 0 && upcoming.length === 0 && activeRecurring.length === 0

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
            {renderGrouped(overdue, 'overdue')}
          </div>
        )}

        {(todayTasks.length > 0 || recurringDueNow.length > 0) && (
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Today" count={todayTasks.length + recurringDueNow.length} color="var(--accent)" />
            {renderGrouped([...todayTasks, ...recurringDueNow], 'today', true)}
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
                {renderGrouped(upcomingByDate[date], `upcoming-${date}`)}
              </div>
            ))}
          </div>
        )}

        {activeRecurring.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionHeader label="Recurring" count={activeRecurring.length} color="#6c5ce7" />
            {renderGrouped(activeRecurring, 'recurring', true)}
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
      {snoozingTask && (
        <SnoozeModal
          task={snoozingTask}
          onSnooze={snoozeTask}
          onClose={() => setSnoozingTask(null)}
        />
      )}
    </div>
  )
}
