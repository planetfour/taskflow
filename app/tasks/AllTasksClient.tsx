'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Task, Priority, TaskStatus } from '@/lib/types'
import Nav from '@/components/Nav'
import PriorityBadge from '@/components/PriorityBadge'
import DeadlineBadge from '@/components/DeadlineBadge'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Circle, CheckCircle2, PlayCircle } from 'lucide-react'

type TaskWithProject = Task & { projects: { name: string; color: string } }

interface Props { tasks: TaskWithProject[]; userId: string }

export default function AllTasksClient({ tasks, userId }: Props) {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const router = useRouter()
  const supabase = createClient()

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  async function toggleStatus(task: TaskWithProject) {
    const next = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done'
    await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    router.refresh()
  }

  const statusIcons = { all: null, todo: <Circle size={13} />, in_progress: <PlayCircle size={13} />, done: <CheckCircle2 size={13} /> }
  const statusLabels = { all: 'All', todo: 'To do', in_progress: 'In progress', done: 'Done' }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckSquare size={16} color="var(--accent)" />
        </div>
        <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>All Tasks</h1>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {(['all','todo','in_progress','done'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
            background: filterStatus === s ? 'var(--accent)' : 'var(--surface)',
            color: filterStatus === s ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${filterStatus === s ? 'var(--accent)' : 'var(--border)'}`,
          }}>{statusIcons[s]}{statusLabels[s]}</button>
        ))}
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        {(['all','urgent','high','medium','low'] as const).map(p => (
          <button key={p} onClick={() => setFilterPriority(p)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            whiteSpace: 'nowrap',
            background: filterPriority === p ? 'var(--surface2)' : 'var(--surface)',
            color: filterPriority === p ? 'var(--text)' : 'var(--text-muted)',
            border: `1px solid ${filterPriority === p ? 'var(--accent)' : 'var(--border)'}`,
          }}>{p === 'all' ? 'All priority' : p.charAt(0).toUpperCase() + p.slice(1)}</button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 14 }}>No tasks match this filter</p>
          </div>
        )}
        {filtered.map(task => {
          const done = task.status === 'done'
          const inProgress = task.status === 'in_progress'
          return (
            <div key={task.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px', marginBottom: 8,
              opacity: done ? 0.55 : 1,
              borderLeft: inProgress ? '3px solid var(--accent)' : `3px solid ${task.projects?.color ?? 'var(--border)'}`,
              cursor: 'pointer',
            }} onClick={() => router.push(`/projects/${task.project_id}`)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <button onClick={e => { e.stopPropagation(); toggleStatus(task) }} style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  border: `2px solid ${done ? 'var(--accent)' : inProgress ? 'var(--accent)' : 'var(--border)'}`,
                  background: done ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 5 }}>
                    {task.projects && (
                      <span style={{ fontSize: 11, color: task.projects.color, fontWeight: 600 }}>{task.projects.name}</span>
                    )}
                    <PriorityBadge priority={task.priority} />
                    <DeadlineBadge date={task.deadline} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Nav />
    </div>
  )
}
