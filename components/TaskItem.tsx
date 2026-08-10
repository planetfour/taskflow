'use client'
import { useState, useEffect, startTransition } from 'react'
import { Task, TaskStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import PriorityBadge from './PriorityBadge'
import DeadlineBadge from './DeadlineBadge'
import AreaTag from './AreaTag'
import TaskEditModal from './TaskEditModal'
import { ChevronRight, Plus, RotateCcw, AlarmClock } from 'lucide-react'
import { nextDueDate, formatCompletedAt, effectiveDueDate } from '@/lib/utils'
import SnoozeModal from './SnoozeModal'

const HOLD_COLOR = '#eab308'

interface Props {
  task: Task
  depth?: number
  onRefresh: () => void
  userId: string
  statusFilter?: Set<TaskStatus>
}

export default function TaskItem({ task, depth = 0, onRefresh, userId, statusFilter }: Props) {
  const [localStatus, setLocalStatus] = useState(task.status)
  const [expanded, setExpanded] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [editing, setEditing] = useState(false)
  const [snoozing, setSnoozing] = useState(false)
  const supabase = createClient()
  const visibleSubtasks = (task.subtasks ?? []).filter(
    sub => !statusFilter || statusFilter.size === 0 || statusFilter.has(sub.status)
  )
  const hasSubtasks = visibleSubtasks.length > 0

  useEffect(() => { setLocalStatus(task.status) }, [task.status])

  async function toggleDone() {
    const next = localStatus === 'done' ? 'todo' : 'done'
    const completedAt = next === 'done' ? new Date().toISOString() : null

    setLocalStatus(next)
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

    startTransition(() => onRefresh())
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

  async function handleSnooze(date: string) {
    await supabase.from('tasks').update({ deadline: date }).eq('id', task.id)
    setSnoozing(false)
    startTransition(() => onRefresh())
  }

  const done = localStatus === 'done'
  const holding = localStatus === 'holding'
  const areaColor = (task.areas ?? [])[0]?.color ?? '#888888'
  const dueDate = holding ? null : effectiveDueDate(task)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={e => { e.stopPropagation(); toggleDone() }} style={{
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

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-muted)' : 'var(--text)' }}>
              {task.title}
              {task.recurrence_type && <RotateCcw size={11} style={{ marginLeft: 5, color: 'var(--accent)', display: 'inline', verticalAlign: 'middle' }} />}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              <PriorityBadge priority={task.priority} />
              <DeadlineBadge date={dueDate} />
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
            <button onClick={() => setSnoozing(true)} style={{
              background: 'none', color: 'var(--text-dim)', padding: 4, borderRadius: 6, display: 'flex',
            }} title="Snooze"><AlarmClock size={15} /></button>
          </div>
        </div>

        {task.notes && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginLeft: 54 }}>{task.notes}</p>
        )}

        {addingSubtask && (
          <div style={{ marginTop: 10, marginLeft: 54, display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
            <input
              autoFocus value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false) }}
              placeholder="Subtask title…" style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
            />
            <button onClick={addSubtask} style={{ background: 'var(--accent)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>Add</button>
          </div>
        )}
      </div>

      {expanded && hasSubtasks && visibleSubtasks.map(sub => (
        <TaskItem key={sub.id} task={sub} depth={depth + 1} onRefresh={onRefresh} userId={userId} statusFilter={statusFilter} />
      ))}

      {editing && (
        <TaskEditModal
          task={task} userId={userId}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); startTransition(() => onRefresh()) }}
        />
      )}
      {snoozing && (
        <SnoozeModal
          task={task}
          onSnooze={handleSnooze}
          onClose={() => setSnoozing(false)}
        />
      )}
    </div>
  )
}
