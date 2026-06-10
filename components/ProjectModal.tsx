'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, Priority, ProjectStatus, Area } from '@/lib/types'
import { X } from 'lucide-react'
import AreaPicker from './AreaPicker'

const COLORS = ['#6c5ce7','#e53e3e','#38a169','#f97316','#3182ce','#d53f8c','#805ad5','#2b6cb0']

interface Props {
  project?: Project
  allAreas: Area[]
  onClose: () => void
  onSaved: () => void
  userId: string
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em',
  textTransform: 'uppercase', display: 'block', marginBottom: 6,
}

export default function ProjectModal({ project, allAreas, onClose, onSaved, userId }: Props) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? '#6c5ce7')
  const [priority, setPriority] = useState<Priority>(project?.priority ?? 'medium')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>((project?.areas ?? []).map(a => a.id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setLoading(true); setError('')
    const payload = {
      name: name.trim(), description: description.trim() || null,
      color, priority, status, deadline: deadline || null, user_id: userId,
    }
    let projectId = project?.id
    if (project) {
      const { error } = await supabase.from('projects').update(payload).eq('id', project.id)
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { data, error } = await supabase.from('projects').insert(payload).select().single()
      if (error) { setError(error.message); setLoading(false); return }
      projectId = data.id
    }

    // Update area associations
    if (projectId) {
      await supabase.from('project_areas').delete().eq('project_id', projectId)
      if (selectedAreaIds.length > 0) {
        await supabase.from('project_areas').insert(selectedAreaIds.map(area_id => ({ project_id: projectId, area_id })))
      }
    }

    setLoading(false)
    onSaved()
  }

  async function handleDelete() {
    if (!project) return
    if (!confirm('Delete this project and all its tasks?')) return
    await supabase.from('projects').delete().eq('id', project.id)
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
          <h2 style={{ fontWeight: 700, fontSize: 17 }}>{project ? 'Edit project' : 'New project'}</h2>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', borderRadius: 8, padding: '6px', color: 'var(--text-muted)', display: 'flex' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Project name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website redesign" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional notes…" rows={2} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c,
                  border: color === c ? '3px solid #fff' : '3px solid transparent',
                  outline: color === c ? `2px solid ${c}` : 'none', cursor: 'pointer',
                }} />
              ))}
            </div>
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
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} style={{ width: '100%' }}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Deadline</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={labelStyle}>Areas of Responsibility</label>
            <AreaPicker allAreas={allAreas} selectedIds={selectedAreaIds} onChange={setSelectedAreaIds} userId={userId} onAreasChanged={onSaved} />
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {project && (
              <button onClick={handleDelete} style={{
                flex: 1, padding: '11px', background: 'rgba(229,62,62,0.12)',
                color: 'var(--red)', borderRadius: 10, fontWeight: 600, fontSize: 14,
              }}>Delete</button>
            )}
            <button onClick={handleSave} disabled={loading} style={{
              flex: 2, padding: '11px', background: 'var(--accent)',
              color: '#fff', borderRadius: 10, fontWeight: 600, fontSize: 15,
              opacity: loading ? 0.7 : 1,
            }}>{loading ? 'Saving…' : project ? 'Save changes' : 'Create project'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
