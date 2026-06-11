'use client'
import { Area } from '@/lib/types'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  allAreas: Area[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  userId: string
  onAreaCreated?: (area: Area) => void
  onAreaDeleted?: (id: string) => void
}

const COLORS = ['#6c5ce7','#e53e3e','#38a169','#f97316','#3182ce','#d53f8c','#805ad5','#0891b2']

export default function AreaPicker({ allAreas, selectedIds, onChange, userId, onAreaCreated, onAreaDeleted }: Props) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6c5ce7')
  const supabase = createClient()

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id])
  }

  async function createArea() {
    if (!newName.trim()) return
    const { data } = await supabase.from('areas').insert({ name: newName.trim(), color: newColor, user_id: userId }).select().single()
    if (data) {
      onChange([...selectedIds, data.id])
      onAreaCreated?.(data as Area)
    }
    setNewName(''); setCreating(false)
  }

  async function deleteArea(id: string) {
    if (!confirm('Delete this area? It will be removed from all projects and tasks.')) return
    await supabase.from('areas').delete().eq('id', id)
    onChange(selectedIds.filter(x => x !== id))
    onAreaDeleted?.(id)
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {allAreas.map(a => {
          const selected = selectedIds.includes(a.id)
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={() => toggle(a.id)} style={{
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: '6px 0 0 6px',
                color: selected ? '#fff' : a.color,
                background: selected ? a.color : `${a.color}22`,
                border: `1px solid ${a.color}66`,
                transition: 'all 0.15s',
              }}>{a.name}</button>
              <button onClick={() => deleteArea(a.id)} style={{
                fontSize: 10, padding: '4px 5px', borderRadius: '0 6px 6px 0',
                color: selected ? '#fff' : a.color,
                background: selected ? a.color : `${a.color}22`,
                border: `1px solid ${a.color}66`, borderLeft: 'none',
                opacity: 0.6,
              }}><X size={10} /></button>
            </div>
          )
        })}
        <button onClick={() => setCreating(!creating)} style={{
          fontSize: 12, padding: '4px 8px', borderRadius: 6,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
        }}><Plus size={12} /> New area</button>
      </div>
      {creating && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createArea(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="Area name" style={{ flex: 1, minWidth: 120, fontSize: 13, padding: '6px 10px' }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)} style={{
                width: 20, height: 20, borderRadius: '50%', background: c,
                border: newColor === c ? '2px solid #fff' : '2px solid transparent',
              }} />
            ))}
          </div>
          <button onClick={createArea} style={{ background: 'var(--accent)', color: '#fff', borderRadius: 7, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>Add</button>
          <button onClick={() => setCreating(false)} style={{ background: 'none', color: 'var(--text-muted)', padding: 4 }}><X size={16} /></button>
        </div>
      )}
    </div>
  )
}
