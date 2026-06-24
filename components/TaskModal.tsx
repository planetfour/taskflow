'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Priority, RecurrenceType } from '@/lib/types'
import { X } from 'lucide-react'
import RecurrencePicker from './RecurrencePicker'

interface Props {
  projectId: string
  userId: string
  onClose: () => void
  onSaved: () => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em',
  textTransform: 'uppercase', display: 'block', marginBottom: 6,
}

export default function TaskModal({ projectId, userId, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [deadline, setDeadline] = useState('')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | null>(null)
  const [recurrenceInterval, setRecurrenceInterval] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setLoading(true)
    const { error } = await supabase.from('tasks').insert({
      title: title.trim(), notes: notes.trim() || null,
      priority, deadline: deadline || null,
      project_id: projectId, user_id: userId,
      status: 'todo', parent_task_id: null,
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceInterval,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border)', borderBottom: 'none',
        padding: '24px', width: '100%', maxWidth: 480,
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontWeight: 700, fontSize: 17 }}>New task</h2>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', borderRadius: 8, padding: '6px', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="What needs to be done?" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" rows={2} style={{ width: '100%', resize: 'vertical' }} />
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
              <label style={labelStyle}>Deadline</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Recurrence</label>
            <RecurrencePicker type={recurrenceType} interval={recurrenceInterval}
              onChange={(t, i) => { setRecurrenceType(t); setRecurrenceInterval(i) }} />
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

          <button onClick={handleSave} disabled={loading} style={{
            padding: '11px', background: 'var(--accent)', color: '#fff',
            borderRadius: 10, fontWeight: 600, fontSize: 15, opacity: loading ? 0.7 : 1,
          }}>{loading ? 'Adding…' : 'Add task'}</button>
        </div>
      </div>
    </div>
  )
}
