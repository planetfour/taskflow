'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Area } from '@/lib/types'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'
import { Tag, Plus, Pencil, Trash2, X } from 'lucide-react'

type AreaWithCounts = Area & { project_count: number; task_count: number }

const COLORS = ['#6c5ce7','#e53e3e','#38a169','#f97316','#3182ce','#d53f8c','#805ad5','#0891b2']

export default function AreasClient({ areas, userId }: { areas: AreaWithCounts[]; userId: string }) {
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6c5ce7')
  const router = useRouter()
  const supabase = createClient()

  async function createArea() {
    if (!name.trim()) return
    await supabase.from('areas').insert({ name: name.trim(), color, user_id: userId })
    setName(''); setShowNew(false); router.refresh()
  }

  async function updateArea(id: string) {
    await supabase.from('areas').update({ name, color }).eq('id', id)
    setEditingId(null); router.refresh()
  }

  async function deleteArea(id: string) {
    if (!confirm('Delete this area? It will be removed from all projects and tasks.')) return
    await supabase.from('areas').delete().eq('id', id)
    router.refresh()
  }

  function startEdit(a: AreaWithCounts) {
    setEditingId(a.id); setName(a.name); setColor(a.color)
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Tag size={16} color="var(--accent)" />
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>Areas</h1>
        </div>
        <button onClick={() => { setShowNew(true); setName(''); setColor('#6c5ce7') }} style={{
          background: 'var(--accent)', color: '#fff', borderRadius: 10,
          padding: '8px 14px', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6,
        }}><Plus size={16} /> New</button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 20px 16px' }}>
        Areas of responsibility let you tag projects and tasks across different life domains — like Work, Health, or Finance.
      </p>

      {showNew && (
        <div style={{ margin: '0 16px 16px', background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>New Area</p>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createArea(); if (e.key === 'Escape') setShowNew(false) }}
            placeholder="e.g. Health, Work, Finance" style={{ width: '100%', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 26, height: 26, borderRadius: '50%', background: c,
                border: color === c ? '3px solid #fff' : '3px solid transparent',
                outline: color === c ? `2px solid ${c}` : 'none',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '9px', background: 'var(--surface2)', color: 'var(--text-muted)', borderRadius: 9, fontWeight: 600 }}>Cancel</button>
            <button onClick={createArea} style={{ flex: 2, padding: '9px', background: 'var(--accent)', color: '#fff', borderRadius: 9, fontWeight: 600 }}>Create area</button>
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {areas.length === 0 && !showNew && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>No areas yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Create areas to tag projects and tasks by life domain</p>
          </div>
        )}

        {areas.map(a => (
          <div key={a.id} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 10,
            borderLeft: `3px solid ${a.color}`,
          }}>
            {editingId === a.id ? (
              <div>
                <input value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') updateArea(a.id); if (e.key === 'Escape') setEditingId(null) }}
                  style={{ width: '100%', marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{
                      width: 24, height: 24, borderRadius: '50%', background: c,
                      border: color === c ? '3px solid #fff' : '3px solid transparent',
                      outline: color === c ? `2px solid ${c}` : 'none',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: '8px', background: 'var(--surface2)', color: 'var(--text-muted)', borderRadius: 8, fontWeight: 600 }}>Cancel</button>
                  <button onClick={() => updateArea(a.id)} style={{ flex: 2, padding: '8px', background: 'var(--accent)', color: '#fff', borderRadius: 8, fontWeight: 600 }}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, display: 'inline-block' }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{a.name}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', paddingLeft: 18 }}>
                    {a.project_count} project{a.project_count !== 1 ? 's' : ''} · {a.task_count} task{a.task_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startEdit(a)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px', color: 'var(--text-muted)', display: 'flex' }}><Pencil size={14} /></button>
                  <button onClick={() => deleteArea(a.id)} style={{ background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.2)', borderRadius: 8, padding: '7px', color: 'var(--red)', display: 'flex' }}><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Nav />
    </div>
  )
}
