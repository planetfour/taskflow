'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Task, Priority, TaskStatus } from '@/lib/types'
import Nav from '@/components/Nav'
import TaskItem from '@/components/TaskItem'
import TaskModal from '@/components/TaskModal'
import ProjectModal from '@/components/ProjectModal'
import PriorityBadge from '@/components/PriorityBadge'
import DeadlineBadge from '@/components/DeadlineBadge'
import { ArrowLeft, Plus, Settings, CheckCircle2, Circle, PlayCircle } from 'lucide-react'

interface Props { project: Project; tasks: Task[]; userId: string }

export default function ProjectDetailClient({ project, tasks, userId }: Props) {
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const router = useRouter()

  const rootTasks = tasks.filter(t => !t.parent_task_id)
  const filtered = rootTasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  const total = rootTasks.length
  const done = rootTasks.filter(t => t.status === 'done').length
  const pct = total ? Math.round((done / total) * 100) : 0

  function handleRefresh() { router.refresh() }

  const statusIcons = { all: null, todo: <Circle size={13} />, in_progress: <PlayCircle size={13} />, done: <CheckCircle2 size={13} /> }
  const statusLabels = { all: 'All', todo: 'To do', in_progress: 'In progress', done: 'Done' }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      {/* Header */}
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

        {/* Project card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '16px', marginBottom: 14,
          borderTop: `3px solid ${project.color}`,
        }}>
          <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.4px', marginBottom: 6 }}>{project.name}</h1>
          {project.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{project.description}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <PriorityBadge priority={project.priority} />
            <DeadlineBadge date={project.deadline} />
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{done}/{total} tasks done</span>
          </div>
          {total > 0 && (
            <div style={{ marginTop: 12, height: 4, background: 'var(--surface2)', borderRadius: 4 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: project.color, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>

        {/* Filters + Add */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' }}>
          {(['all','todo','in_progress','done'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
              background: filterStatus === s ? 'var(--accent)' : 'var(--surface)',
              color: filterStatus === s ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${filterStatus === s ? 'var(--accent)' : 'var(--border)'}`,
            }}>{statusIcons[s]}{statusLabels[s]}</button>
          ))}
        </div>
      </div>

      {/* Tasks */}
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
            <p style={{ fontSize: 14 }}>No tasks {filterStatus !== 'all' ? `with status "${filterStatus}"` : 'yet'}</p>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>Tap Add task to get started</p>
          </div>
        )}

        {filtered.map(task => (
          <TaskItem key={task.id} task={task} onRefresh={handleRefresh} userId={userId} />
        ))}
      </div>

      {showTaskModal && (
        <TaskModal projectId={project.id} userId={userId} onClose={() => setShowTaskModal(false)} onSaved={() => { setShowTaskModal(false); handleRefresh() }} />
      )}
      {showProjectModal && (
        <ProjectModal project={project} userId={userId} onClose={() => setShowProjectModal(false)} onSaved={() => { setShowProjectModal(false); router.push('/') }} />
      )}
      <Nav />
    </div>
  )
}
