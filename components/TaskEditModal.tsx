'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, Priority, TaskStatus, Area, RecurrenceType } from '@/lib/types'
import { X, RotateCcw } from 'lucide-react'
import PriorityBadge from './PriorityBadge'
import AreaPicker from './AreaPicker'
import RecurrencePicker from './RecurrencePicker'
import { formatCompletedAt, recurrenceLabel, nextDueDate } from '@/lib/utils'

interface Props {
  task: Task
  allAreas: Area[]
  userId: string
  onClose: () => void
  onSaved: () => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em',
  textTransform: 'uppercase', display: 'block', marginBottom: 6,
}

export default function TaskEditModal({ task, allAreas, userId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [priority, setPriority] = useState<Priority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [deadline, setDeadline] = useState(task.deadline ?? '')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | null>(task.recurrence_type)
  const [recurrenceInterval, setRecurrenceInterval] = useState<number | null>(task.recurrence_interval)
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>((task.areas ?? []).map(a => a.id))
  const [localAreas, setLocalAreas] = useState<Area[]>(allAreas)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setLoading(true); setError('')

    const wasNotDone = task.status !== 'done'
    const isNowDone = status === 'done'
    const completedAt = isNowDone && wasNotDone ? new Date().toISOString() : (status !== 'done' ? null : task.completed_at)

    let nextDue: string | null = null
    if (isNowDone && wasNotDone && recurrenceType) {
      nextDue = nextDueDate(recurrenceType, recurrenceInterval)
    }

    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      priority, status, deadline: deadline || null,
      completed_at: completedAt,
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceInterval,
      recurrence_next_due: nextDue ?? (recurrenceType && deadline ? deadline : null),
    }

    const { error: updateError } = await supabase.from('tasks').update(payload).eq('id', task.id)
    if (updateError) { setError(updateError.message); setLoading(false); return }

    if (isNowDone && wasNotDone && recurrenceType) {
      await supabase.from('tasks').insert({
        title: task.title, notes: task.notes,
        priority: task.priority, status: 'todo',
        project_id: task.project_id, user_id: userId,
        parent_task_id: task.parent_task_id,
        deadline: nextDue,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
      })
    }

    await supabase.from('task_areas').delete().eq('task_id', task.id)
    if (selectedAreaIds.length > 0) {
      await supabase.from('task_areas').insert(selectedAreaIds.map(area_id => ({ task_id: task.id, area_id })))
    }

    setLoading(false)
    onSaved()
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onSaved()
  }

  const recLabel = recurrenceLabel(recurrenceType, recurrenceInterval)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)', borderBottom: 'none',
        padding: '24px', width: '100%', maxWidth: 480,
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, fontSize: 17 }}>Edit task</h2>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', borderRadius: 8, padding: '6px', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%' }} />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} style={{ width: '100%' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} style={{ width: '100%' }}>
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: '100%' }} />
          </div>

          {task.completed_at && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
              ✓ Completed {formatCompletedAt(task.completed_at)}
            </div>
          )}

          <div>
            <label style={labelStyle}>Recurrence</label>
            <RecurrencePicker
              type={recurrenceType}
              interval={recurrenceInterval}
              onChange={(t, i) => { setRecurrenceType(t); setRecurrenceInterval(i) }}
            />
            {recLabel && (
              <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <RotateCcw size={11} /> Repeats {recLabel.toLowerCase()} — next occurrence created on completion
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Areas</label>
            <AreaPicker
              allAreas={localAreas}
              selectedIds={selectedAreaIds}
              onChange={setSelectedAreaIds}
              userId={userId}
              onAreaCreated={a => setLocalAreas(p => [...p, a])}
              onAreaDeleted={id => setLocalAreas(p => p.filter(x => x.id !== id))}
            />
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleDelete} style={{
              flex: 1, padding: '11px', background: 'rgba(229,62,62,0.12)',
              color: 'var(--red)', borderRadius: 10, fontWeight: 600, fontSize: 14,
            }}>Delete</button>
            <button onClick={handleSave} disabled={loading} style={{
              flex: 2, padding: '11px', background: 'var(--accent)',
              color: '#fff', borderRadius: 10, fontWeight: 600, fontSize: 15,
              opacity: loading ? 0.7 : 1,
            }}>{loading ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
