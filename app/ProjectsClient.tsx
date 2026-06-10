'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Area, Priority, ProjectStatus } from '@/lib/types'
import Nav from '@/components/Nav'
import ProjectModal from '@/components/ProjectModal'
import PriorityBadge from '@/components/PriorityBadge'
import DeadlineBadge from '@/components/DeadlineBadge'
import AreaTag from '@/components/AreaTag'
import { Plus, ChevronRight, LayoutGrid } from 'lucide-react'

interface Props { projects: Project[]; allAreas: Area[]; userId: string }

const STATUS_ORDER: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']

export default function ProjectsClient({ projects, allAreas, userId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterAreaId, setFilterAreaId] = useState<string | 'all'>('all')
  const router = useRouter()

  const filtered = projects.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterPriority !== 'all' && p.priority !== filterPriority) return false
    if (filterAreaId !== 'all' && !(p.areas ?? []).some(a => a.id === filterAreaId)) return false
    return true
  }).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))

  const active = filtered.filter(p => p.status === 'active')
  const rest = filtered.filter(p => p.status !== 'active')

  function handleSaved() { setShowModal(false); router.refresh() }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutGrid size={16} color="var(--accent)" />
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>Projects</h1>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: 'var(--accent)', color: '#fff', borderRadius: 10,
          padding: '8px 14px', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6,
        }}><Plus size={16} /> New</button>
      </div>

      {/* Filters */}
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {(['all','active','paused','completed','archived'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            background: filterStatus === s ? 'var(--accent)' : 'var(--surface)',
            color: filterStatus === s ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${filterStatus === s ? 'var(--accent)' : 'var(--border)'}`,
          }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>
      {allAreas.length > 0 && (
        <div style={{ padding: '8px 20px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
          <button onClick={() => setFilterAreaId('all')} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            background: filterAreaId === 'all' ? 'var(--surface2)' : 'var(--surface)',
            color: 'var(--text-muted)', border: `1px solid var(--border)`,
          }}>All areas</button>
          {allAreas.map(a => (
            <button key={a.id} onClick={() => setFilterAreaId(a.id)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              color: filterAreaId === a.id ? '#fff' : a.color,
              background: filterAreaId === a.id ? a.color : `${a.color}22`,
              border: `1px solid ${a.color}66`,
            }}>{a.name}</button>
          ))}
        </div>
      )}
      <div style={{ height: 14 }} />

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>No projects yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Tap + New to create your first project</p>
          </div>
        )}
        {active.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>Active</p>
            {active.map(p => <ProjectCard key={p.id} project={p} onClick={() => router.push(`/projects/${p.id}`)} />)}
          </>
        )}
        {rest.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '20px 0 10px', paddingLeft: 4 }}>Other</p>
            {rest.map(p => <ProjectCard key={p.id} project={p} onClick={() => router.push(`/projects/${p.id}`)} />)}
          </>
        )}
      </div>

      {showModal && <ProjectModal allAreas={allAreas} userId={userId} onClose={() => setShowModal(false)} onSaved={handleSaved} />}
      <Nav />
    </div>
  )
}

function ProjectCard({ project: p, onClick }: { project: Project; onClick: () => void }) {
  const taskCount = p.task_count ?? 0
  const pct = taskCount ? Math.round(((p.completed_count ?? 0) / taskCount) * 100) : 0
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
      borderLeft: `3px solid ${p.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.name}</p>
          {p.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <PriorityBadge priority={p.priority} />
            <DeadlineBadge date={p.deadline} />
            {(p.areas ?? []).map(a => <AreaTag key={a.id} area={a} />)}
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
          {taskCount > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>}
          <ChevronRight size={16} color="var(--text-dim)" />
        </div>
      </div>
      {taskCount > 0 && (
        <div style={{ marginTop: 12, height: 3, background: 'var(--surface2)', borderRadius: 4 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: p.color, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      )}
    </div>
  )
}
