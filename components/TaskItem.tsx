'use client'
import { useState, useEffect, startTransition } from 'react'
import { Task, Area } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import PriorityBadge from './PriorityBadge'
import DeadlineBadge from './DeadlineBadge'
import AreaTag from './AreaTag'
import TaskEditModal from './TaskEditModal'
import { ChevronRight, Plus, RotateCcw } from 'lucide-react'
import { nextDueDate, formatCompletedAt } from '@/lib/utils'

interface Props {
  task: Task
  allAreas: Area[]
  depth?: number
  onRefresh: () => void
  userId: string
}

export default function TaskItem({ task, allAreas, depth = 0, onRefresh, userId }: Props) {
  const [localStatus, setLocalStatus] = useState(task.status)
  const [expanded, setExpanded] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [editing, setEditing] = useState(false)
  const supabase = createClient()
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

  // Sync local status when server data refreshes
  useEffect(() => { setLocalStatus(task.status) }, [task.status])

  async function toggleStatus() {
    const next = localStatus === 'done' ? 'todo' : localStatus === 'todo' ? 'in_progress' : 'done'
    const completedAt = next === 'done' ? new Date().toISOString() : null

    setLocalStatus(next) // instant optimistic update

    await supabase.from('tasks').update({ status: next, completed_at: completedAt }).eq('id', task.id)

    if (next === 'done' && task.recurrence_type) {
      const due = nextDueDate(task.recurrence_type, task.recurrence_interval)
      await supabase.from('tasks').insert({
        title: task.title, notes: task.notes,
        priority: task.priority, status: 'todo',
        project_id: task.project_id, user_id: userId,
        parent_task_id: task.parent_task_id,
        deadline: due,
        recurrence_type: task.recurrence_type,
        recurrence_interval: task.recurrence_interval,
      })
    }

    startTransition(() => onRefresh()) // non-blocking background refresh
  }

  async function addSubtask() {
    if (!subtaskTitle.trim()) return
    await supabase.from('tasks').insert({
      title: subtaskTitle.trim(), project_id: task.project_id,
      parent_task_id: task.id, user_id: userId,
      priority: 'medium', status: 'todo',
    })
    setSubtaskTitle(''); setAddingSubtask(false); setExpanded(true)
    startTransition(() => onRefresh())
  }

  const done = localStatus === 'done'
  const inProgress = localStatus === 'in_progress'
  const areaColor = (task.areas ?? [])[0]?.color ?? '#888888'

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div
        onClick={() => setEditing(true)}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 6,
          opacity: done ? 0.6 : 1, transition: 'opacity 0.15s',
          borderLeft: `3px solid ${areaColor}`,
          cursor: 'pointer',
        }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <button onClick={e => { e.stopPropagation(); toggleStatus() }} style={{
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
              {task.recurrence_type && <RotateCcw size={11} style={{ marginLeft: 5, color: 'var(--accent)', display: 'inline', verticalAlign: 'middle' }} />}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              <PriorityBadge priority={task.priority} />
              <DeadlineBadge date={task.deadline} />
              {done && task.completed_at && (
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Done {formatCompletedAt(task.completed_at)}</span>
              )}
              {(task.areas ?? []).map(a => <AreaTag key={a.id} area={a} />)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
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
          </div>
        </div>

        {task.notes && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginLeft: 30 }}>{task.notes}</p>
        )}

        {addingSubtask && (
          <div style={{ marginTop: 10, marginLeft: 30, display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
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
        <TaskItem key={sub.id} task={sub} allAreas={allAreas} depth={depth + 1} onRefresh={onRefresh} userId={userId} />
      ))}

      {editing && (
        <TaskEditModal
          task={task} allAreas={allAreas} userId={userId}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); startTransition(() => onRefresh()) }}
        />
      )}
    </div>
  )
}
