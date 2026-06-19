'use client'
import { useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Task, Area, Priority, TaskStatus } from '@/lib/types'
import Nav from '@/components/Nav'
import TaskItem from '@/components/TaskItem'
import TaskModal from '@/components/TaskModal'
import ProjectModal from '@/components/ProjectModal'
import PriorityBadge from '@/components/PriorityBadge'
import DeadlineBadge from '@/components/DeadlineBadge'
import AreaTag from '@/components/AreaTag'
import { ArrowLeft, Plus, Settings, Circle, Clock, CheckCircle2 } from 'lucide-react'
import { effectiveDueDate } from '@/lib/utils'

interface Props { project: Project; tasks: Task[]; allAreas: Area[]; userId: string }

export default function ProjectDetailClient({ project, tasks, allAreas, userId }: Props) {
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [filterStatuses, setFilterStatuses] = useState<Set<TaskStatus>>(new Set())
  const [filterAreaIds, setFilterAreaIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const projectAreaColor = (project.areas ?? [])[0]?.color ?? '#888888'
  const rootTasks = tasks.filter(t => !t.parent_task_id)
  const filtered = rootTasks.filter(t => {
    if (filterStatuses.size > 0 && !filterStatuses.has(t.status)) return false
    if (filterAreaIds.size > 0 && !(t.areas ?? []).some(a => filterAreaIds.has(a.id))) return false
    return true
  })

  const sortedFiltered = [...filtered].sort((a, b) => {
    const da = effectiveDueDate(a)
    const db = effectiveDueDate(b)
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  })
  const datedTasks = sortedFiltered.filter(t => effectiveDueDate(t) !== null)
  const undatedTasks = sortedFiltered.filter(t => effectiveDueDate(t) === null)

  const total = rootTasks.length
  const done = rootTasks.filter(t => t.status === 'done').length
  const pct = total ? Math.round((done / total) * 100) : 0

  const statusIcons: Record<TaskStatus, React.ReactNode> = {
    todo: <Circle size={13} />,
    holding: <Clock size={13} />,
    done: <CheckCircle2 size={13} />,
  }
  const statusLabels: Record<TaskStatus, string> = { todo: 'To do', holding: 'Holding', done: 'Done' }

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

  const chipBase: React.CSSProperties = {
    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => router.push('/')} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '7px 12px', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
          }}><ArrowLeft size={15} /> Projects</button>
          <button onClick={() => setShowProjectModal(true)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '7px', color: 'var(--text-muted)', display: 'flex',
          }}><Settings size={16} /></button>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '16px', marginBottom: 14,
          borderTop: `3px solid ${projectAreaColor}`,
        }}>
          <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.4px', marginBottom: 6 }}>{project.name}</h1>
          {project.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{project.description}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <PriorityBadge priority={project.priority} />
            <DeadlineBadge date={project.deadline} />
            {(project.areas ?? []).map(a => <AreaTag key={a.id} area={a} />)}
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{done}/{total} done</span>
          </div>
          {total > 0 && (
            <div style={{ marginTop: 12, height: 4, background: 'var(--surface2)', borderRadius: 4 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: projectAreaColor, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>

        {/* Status filters — multi-select */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, overflowX: 'auto' }}>
          <button onClick={() => setFilterStatuses(new Set())} style={{
            ...chipBase,
            background: filterStatuses.size === 0 ? 'var(--accent)' : 'var(--surface)',
            color: filterStatuses.size === 0 ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${filterStatuses.size === 0 ? 'var(--accent)' : 'var(--border)'}`,
          }}>All</button>
          {(['todo', 'holding', 'done'] as TaskStatus[]).map(s => {
            const active = filterStatuses.has(s)
            return (
              <button key={s} onClick={() => toggleStatusFilter(s)} style={{
                ...chipBase,
                background: active ? 'var(--accent)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              }}>{statusIcons[s]}{statusLabels[s]}</button>
            )
          })}
        </div>

        {/* Area filters — multi-select */}
        {allAreas.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
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
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </p>
          <button onClick={() => setShowTaskModal(true)} style={{
            background: 'var(--accent)', color: '#fff', borderRadius: 8,
            padding: '6px 12px', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
          }}><Plus size={14} /> Add task</button>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 14 }}>No tasks {filterStatuses.size > 0 || filterAreaIds.size > 0 ? 'match this filter' : 'yet'}</p>
          </div>
        )}

        {datedTasks.map(task => (
          <TaskItem key={task.id} task={task} allAreas={allAreas} onRefresh={() => startTransition(() => router.refresh())} userId={userId} />
        ))}

        {undatedTasks.length > 0 && (
          <>
            {datedTasks.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '14px 0 8px', paddingLeft: 2 }}>
                No date
              </div>
            )}
            {undatedTasks.map(task => (
              <TaskItem key={task.id} task={task} allAreas={allAreas} onRefresh={() => startTransition(() => router.refresh())} userId={userId} />
            ))}
          </>
        )}
      </div>

      {showTaskModal && (
        <TaskModal projectId={project.id} userId={userId} allAreas={allAreas} onClose={() => setShowTaskModal(false)} onSaved={() => { setShowTaskModal(false); startTransition(() => router.refresh()) }} />
      )}
      {showProjectModal && (
        <ProjectModal project={project} allAreas={allAreas} userId={userId} onClose={() => setShowProjectModal(false)} onSaved={() => { setShowProjectModal(false); router.push('/') }} />
      )}
      <Nav />
    </div>
  )
}
