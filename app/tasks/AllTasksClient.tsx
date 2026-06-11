'use client'
import { useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Task, Area, TaskStatus, Priority } from '@/lib/types'
import Nav from '@/components/Nav'
import DeadlineBadge from '@/components/DeadlineBadge'
import AreaTag from '@/components/AreaTag'
import TaskEditModal from '@/components/TaskEditModal'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Circle, CheckCircle2, PlayCircle, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { nextDueDate, formatCompletedAt } from '@/lib/utils'

type TaskWithProject = Task & { projects: { name: string; color: string } }

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done']
const STATUS_LABELS: Record<TaskStatus, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low']
const PRIORITY_LABELS: Record<Priority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' }

interface Props { tasks: TaskWithProject[]; allAreas: Area[]; userId: string }

export default function AllTasksClient({ tasks, allAreas, userId }: Props) {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterCompletedDate, setFilterCompletedDate] = useState('')
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, TaskStatus>>({})
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const isOpen = (id: string) => !collapsed.has(id)

  function effectiveStatus(task: TaskWithProject): TaskStatus {
    return localStatuses[task.id] ?? task.status
  }

  const filtered = tasks.filter(t => {
    const status = effectiveStatus(t)
    if (filterStatus !== 'all' && status !== filterStatus) return false
    if (filterCompletedDate && t.completed_at) {
      if (t.completed_at.split('T')[0] !== filterCompletedDate) return false
    } else if (filterCompletedDate && !t.completed_at) {
      return false
    }
    return true
  })

  const areaGroups = [
    ...allAreas.map(area => ({
      id: area.id,
      name: area.name,
      color: area.color,
      tasks: filtered.filter(t => (t.areas ?? [])[0]?.id === area.id),
    })),
    {
      id: '__none__',
      name: 'No Area',
      color: '#888888',
      tasks: filtered.filter(t => (t.areas ?? []).length === 0),
    },
  ].filter(g => g.tasks.length > 0)

  function groupByStatusPriority(ts: TaskWithProject[]) {
    return STATUS_ORDER.map(status => {
      const st = ts.filter(t => effectiveStatus(t) === status)
      if (!st.length) return null
      const priorityGroups = PRIORITY_ORDER
        .map(priority => ({ priority, tasks: st.filter(t => t.priority === priority) }))
        .filter(g => g.tasks.length > 0)
      return { status, priorityGroups }
    }).filter(Boolean) as { status: TaskStatus; priorityGroups: { priority: Priority; tasks: TaskWithProject[] }[] }[]
  }

  async function toggleStatus(task: TaskWithProject) {
    const current = effectiveStatus(task)
    const next: TaskStatus = current === 'done' ? 'todo' : current === 'todo' ? 'in_progress' : 'done'
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

  const statusIcons = { all: null, todo: <Circle size={13} />, in_progress: <PlayCircle size={13} />, done: <CheckCircle2 size={13} /> }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckSquare size={16} color="var(--accent)" />
        </div>
        <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>All Tasks</h1>
      </div>

      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {(['all','todo','in_progress','done'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
            background: filterStatus === s ? 'var(--accent)' : 'var(--surface)',
            color: filterStatus === s ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${filterStatus === s ? 'var(--accent)' : 'var(--border)'}`,
          }}>{statusIcons[s]}{{all:'All',todo:'To do',in_progress:'In progress',done:'Done'}[s]}</button>
        ))}
      </div>

      {filterStatus === 'done' && (
        <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Completed on:</span>
          <input type="date" value={filterCompletedDate} onChange={e => setFilterCompletedDate(e.target.value)} style={{ fontSize: 13, padding: '5px 10px' }} />
          {filterCompletedDate && <button onClick={() => setFilterCompletedDate('')} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none' }}>Clear</button>}
        </div>
      )}

      <div style={{ padding: '0 16px 6px' }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 14 }}>No tasks match this filter</p>
          </div>
        )}

        {areaGroups.map(areaGroup => {
          const areaKey = `a-${areaGroup.id}`
          const statusGroups = groupByStatusPriority(areaGroup.tasks)
          return (
            <div key={areaGroup.id} style={{ marginBottom: 10 }}>
              <button onClick={() => toggleCollapse(areaKey)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 4px', background: 'none',
                borderBottom: `2px solid ${areaGroup.color}33`, marginBottom: 8,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: areaGroup.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 12, color: areaGroup.color, flex: 1, textAlign: 'left', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{areaGroup.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 4 }}>{areaGroup.tasks.length}</span>
                {isOpen(areaKey) ? <ChevronDown size={14} color="var(--text-dim)" /> : <ChevronRight size={14} color="var(--text-dim)" />}
              </button>

              {isOpen(areaKey) && statusGroups.map(sg => {
                const statusKey = `s-${areaGroup.id}-${sg.status}`
                const statusCount = sg.priorityGroups.reduce((n, g) => n + g.tasks.length, 0)
                return (
                  <div key={sg.status} style={{ marginLeft: 14, marginBottom: 8 }}>
                    <button onClick={() => toggleCollapse(statusKey)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 4px', background: 'none', marginBottom: 6,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flex: 1, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{STATUS_LABELS[sg.status]}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 4 }}>{statusCount}</span>
                      {isOpen(statusKey) ? <ChevronDown size={12} color="var(--text-dim)" /> : <ChevronRight size={12} color="var(--text-dim)" />}
                    </button>

                    {isOpen(statusKey) && sg.priorityGroups.map(pg => {
                      const priorityKey = `p-${areaGroup.id}-${sg.status}-${pg.priority}`
                      return (
                        <div key={pg.priority} style={{ marginLeft: 12, marginBottom: 4 }}>
                          <button onClick={() => toggleCollapse(priorityKey)} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                            padding: '3px 4px', background: 'none', marginBottom: 4,
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', flex: 1, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{PRIORITY_LABELS[pg.priority]}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginRight: 4 }}>{pg.tasks.length}</span>
                            {isOpen(priorityKey) ? <ChevronDown size={11} color="var(--text-dim)" /> : <ChevronRight size={11} color="var(--text-dim)" />}
                          </button>

                          {isOpen(priorityKey) && pg.tasks.map(task => {
                            const status = effectiveStatus(task)
                            const done = status === 'done'
                            const inProgress = status === 'in_progress'
                            return (
                              <div key={task.id} onClick={() => setEditingTask(task)} style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 12, padding: '11px 13px', marginBottom: 6,
                                opacity: done ? 0.6 : 1,
                                borderLeft: `3px solid ${areaGroup.color}`,
                                cursor: 'pointer',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                  <button onClick={e => { e.stopPropagation(); toggleStatus(task) }} style={{
                                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                                    border: `2px solid ${done ? 'var(--accent)' : inProgress ? 'var(--accent)' : 'var(--border)'}`,
                                    background: done ? 'var(--accent)' : inProgress ? 'var(--accent-dim)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                                    {inProgress && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />}
                                  </button>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 14, fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>
                                      {task.title}
                                      {task.recurrence_type && <RotateCcw size={11} style={{ marginLeft: 5, color: 'var(--accent)', display: 'inline', verticalAlign: 'middle' }} />}
                                    </p>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                                      {task.projects && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{task.projects.name}</span>}
                                      <DeadlineBadge date={task.deadline} />
                                      {done && task.completed_at && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Done {formatCompletedAt(task.completed_at)}</span>}
                                      {(task.areas ?? []).slice(1).map(a => <AreaTag key={a.id} area={a} />)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {editingTask && (
        <TaskEditModal
          task={editingTask} allAreas={allAreas} userId={userId}
          onClose={() => setEditingTask(null)}
          onSaved={() => { setEditingTask(null); startTransition(() => router.refresh()) }}
        />
      )}
      <Nav />
    </div>
  )
}
