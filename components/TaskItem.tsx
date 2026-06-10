'use client'
import { useState } from 'react'
import { Task } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import PriorityBadge from './PriorityBadge'
import DeadlineBadge from './DeadlineBadge'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'

interface Props {
  task: Task
  depth?: number
  onRefresh: () => void
  userId: string
}

export default function TaskItem({ task, depth = 0, onRefresh, userId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const supabase = createClient()
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

  async function toggleStatus() {
    const next = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done'
    await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    onRefresh()
  }

  async function deleteTask() {
    await supabase.from('tasks').delete().eq('id', task.id)
    onRefresh()
  }

  async function addSubtask() {
    if (!subtaskTitle.trim()) return
    await supabase.from('tasks').insert({
      title: subtaskTitle.trim(), project_id: task.project_id,
      parent_task_id: task.id, user_id: userId,
      priority: 'medium', status: 'todo',
    })
    setSubtaskTitle(''); setAddingSubtask(false); setExpanded(true); onRefresh()
  }

  const done = task.status === 'done'
  const inProgress = task.status === 'in_progress'

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 14px', marginBottom: 6,
        opacity: done ? 0.55 : 1, transition: 'opacity 0.15s',
        borderLeft: inProgress ? '3px solid var(--accent)' : undefined,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Status toggle */}
          <button onClick={toggleStatus} style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 2,
            border: `2px solid ${done ? 'var(--accent)' : inProgress ? 'var(--accent)' : 'var(--border)'}`,
            background: done ? 'var(--accent)' : inProgress ? 'var(--accent-dim)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
            {inProgress && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-muted)' : 'var(--text)' }}>
              {task.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
              <PriorityBadge priority={task.priority} />
              <DeadlineBadge date={task.deadline} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {depth < 2 && (
              <button onClick={() => setAddingSubtask(!addingSubtask)} style={{
                background: 'none', color: 'var(--text-dim)', padding: 4, borderRadius: 6, display: 'flex',
              }}><Plus size={15} /></button>
            )}
            {hasSubtasks && (
              <button onClick={() => setExpanded(!expanded)} style={{
                background: 'none', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex',
                transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s',
              }}><ChevronRight size={15} /></button>
            )}
            <button onClick={deleteTask} style={{
              background: 'none', color: 'var(--text-dim)', padding: 4, borderRadius: 6, display: 'flex',
            }}><Trash2 size={15} /></button>
          </div>
        </div>

        {task.notes && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginLeft: 30 }}>{task.notes}</p>
        )}

        {addingSubtask && (
          <div style={{ marginTop: 10, marginLeft: 30, display: 'flex', gap: 8 }}>
            <input
              autoFocus value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false) }}
              placeholder="Subtask title…" style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
            />
            <button onClick={addSubtask} style={{ background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>Add</button>
          </div>
        )}
      </div>

      {expanded && hasSubtasks && task.subtasks!.map(sub => (
        <TaskItem key={sub.id} task={sub} depth={depth + 1} onRefresh={onRefresh} userId={userId} />
      ))}
    </div>
  )
}
