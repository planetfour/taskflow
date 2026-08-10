'use client'
import { useState, useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Task, Area, TaskStatus, Priority } from '@/lib/types'
import DeadlineBadge from '@/components/DeadlineBadge'
import AreaTag from '@/components/AreaTag'
import TaskEditModal from '@/components/TaskEditModal'
import TaskModal from '@/components/TaskModal'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, RotateCcw, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { nextDueDate, formatCompletedAt } from '@/lib/utils'

const HOLD_COLOR = '#eab308'

type TaskWithProject = Task & { projects: { name: string; color: string } | null }

const STATUS_ORDER: TaskStatus[] = ['todo', 'holding', 'done']
const STATUS_LABELS: Record<TaskStatus, string> = { todo: 'To Do', holding: 'Holding', done: 'Done' }
const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low']
const PRIORITY_LABELS: Record<Priority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' }

interface Props { tasks: TaskWithProject[]; allAreas: Area[]; userId: string }

export default function AllTasksClient({ tasks, allAreas, userId }: Props) {
  const [filterStatuses, setFilterStatuses] = useState<Set<TaskStatus>>(new Set(['todo', 'holding']))
  const [filterAreaIds, setFilterAreaIds] = useState<Set<string>>(new Set())
  const [filterCompletedDate, setFilterCompletedDate] = useState('')
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
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

  useEffect(() => { setLocalStatuses({}) }, [tasks])

  const filtered = tasks.filter(t => {
    const status = effectiveStatus(t)
    if (filterStatuses.size > 0 && !filterStatuses.has(status)) return false
    const tAreas = t.areas ?? []
    if (filterAreaIds.size > 0 && tAreas.length > 0 && !tAreas.some(a => filterAreaIds.has(a.id))) return false
    if (filterCompletedDate && t.completed_at) {
      if (t.completed_at.split('T')[0] !== filterCompletedDate) return false
    } else if (filterCompletedDate && !t.completed_at) {
      return false
    }
    return true
  })

  const areaGroups = [
    ...allAreas.map(area => ({
      id: area.id, name: area.name, color: area.color,
      tasks: filtered.filter(t => (t.areas ?? [])[0]?.id === area.id),
    })),
    {
      id: '__none__', name: 'No Area', color: '#888888',
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

  function toggleStatusFilter(s: TaskStatus) {
    setFilterStatuses(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }

  function toggleAreaFilter(id: string) {
    setFilterAreaIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const showDoneDate = filterStatuses.size === 0 || filterStatuses.has('done')

  const chipBase: React.CSSProperties = {
    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckSquare size={16} color="var(--accent)" />
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>All Tasks</h1>
        </div>
        <button onClick={() => setShowTaskModal(true)} style={{
          background: 'var(--accent)', color: '#fff', borderRadius: 10,
          padding: '8px 14px', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6,
        }}><Plus size={16} /> Add task</button>
      </div>

      {/* Status filter chips */}
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        <button onClick={() => setFilterStatuses(new Set())} style={{
          ...chipBase,
          background: filterStatuses.size === 0 ? 'var(--accent)' : 'var(--surface)',
          color: filterStatuses.size === 0 ? '#fff' : 'var(--text-muted)',
          border: `1px solid ${filterStatuses.size === 0 ? 'var(--accent)' : 'var(--border)'}`,
        }}>All</button>
        {STATUS_ORDER.map(s => {
          const active = filterStatuses.has(s)
          return (
            <button key={s} onClick={() => toggleStatusFilter(s)} style={{
              ...chipBase,
              background: active ? 'var(--accent)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
            }}>{STATUS_LABELS[s]}</button>
          )
        })}
      </div>

      {/* Area filter chips */}
      {allAreas.length > 0 && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          <button onClick={() => setFilterAreaIds(new Set())} style={{
            ...chipBase,
            background: filterAreaIds.size === 0 ? 'var(--surface2)' : 'var(--surface)',
            color: 'var(--text-muted)', border: '1px solid var(--border)',
            fontWeight: filterAreaIds.size === 0 ? 700 : 600,
          }}>All areas</button>
          {allAreas.map(a => {
            const active = filterAreaIds.has(a.id)
            return (
              <button key={a.id} onClick={() => toggleAreaFilter(a.id)} style={{
                ...chipBase,
                color: active ? '#fff' : a.color,
                background: active ? a.color : `${a.color}22`,
                border: `1px solid ${a.color}66`,
              }}>{a.name}</button>
            )
          })}
        </div>
      )}

      {showDoneDate && (
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
                            const holding = status === 'holding'
                            return (
                              <div key={task.id} onClick={() => setEditingTask(task)} style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 12, padding: '11px 13px', marginBottom: 6,
                                opacity: done ? 0.6 : 1,
                                borderLeft: `3px solid ${areaGroup.color}`,
                                cursor: 'pointer',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <button onClick={e => { e.stopPropagation(); toggleDone(task) }} style={{
                                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                    border: `2.5px solid ${done ? 'var(--accent)' : holding ? HOLD_COLOR : 'var(--border)'}`,
                                    background: done ? 'var(--accent)' : holding ? `${HOLD_COLOR}22` : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {done && <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>✓</span>}
                                    {holding && (
                                      <div style={{ display: 'flex', gap: 3 }}>
                                        <span style={{ width: 3, height: 14, borderRadius: 1.5, background: HOLD_COLOR, display: 'block' }} />
                                        <span style={{ width: 3, height: 14, borderRadius: 1.5, background: HOLD_COLOR, display: 'block' }} />
                                      </div>
                                    )}
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
      {showTaskModal && (
        <TaskModal projectId={null} userId={userId}
          onClose={() => setShowTaskModal(false)}
          onSaved={() => { setShowTaskModal(false); startTransition(() => router.refresh()) }} />
      )}
    </div>
  )
}
