'use client'
import { useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Area, ProjectStatus, Priority } from '@/lib/types'
import Nav from '@/components/Nav'
import ProjectModal from '@/components/ProjectModal'
import DeadlineBadge from '@/components/DeadlineBadge'
import { Plus, ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react'
import Link from 'next/link'

const STATUS_ORDER: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']
const STATUS_LABELS: Record<ProjectStatus, string> = { active: 'Active', paused: 'Paused', completed: 'Completed', archived: 'Archived' }
const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low']
const PRIORITY_LABELS: Record<Priority, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' }

interface Props { projects: Project[]; allAreas: Area[]; userId: string }

export default function ProjectsClient({ projects, allAreas, userId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [filterStatuses, setFilterStatuses] = useState<Set<ProjectStatus>>(new Set())
  const [filterAreaIds, setFilterAreaIds] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const router = useRouter()

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const isOpen = (id: string) => !collapsed.has(id)

  function toggleStatusFilter(s: ProjectStatus) {
    setFilterStatuses(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }

  function toggleAreaFilter(id: string) {
    setFilterAreaIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const filteredProjects = projects.filter(p => {
    if (filterStatuses.size > 0 && !filterStatuses.has(p.status)) return false
    if (filterAreaIds.size > 0 && !(p.areas ?? []).some(a => filterAreaIds.has(a.id))) return false
    return true
  })

  const areaGroups = [
    ...allAreas.map(area => ({
      id: area.id, name: area.name, color: area.color,
      projects: filteredProjects.filter(p => (p.areas ?? [])[0]?.id === area.id),
    })),
    {
      id: '__none__', name: 'No Area', color: '#888888',
      projects: filteredProjects.filter(p => (p.areas ?? []).length === 0),
    },
  ].filter(g => g.projects.length > 0)

  function groupByStatusPriority(ps: Project[]) {
    return STATUS_ORDER.map(status => {
      const sp = ps.filter(p => p.status === status)
      if (!sp.length) return null
      const priorityGroups = PRIORITY_ORDER
        .map(priority => ({ priority, projects: sp.filter(p => p.priority === priority) }))
        .filter(g => g.projects.length > 0)
      return { status, priorityGroups }
    }).filter(Boolean) as { status: ProjectStatus; priorityGroups: { priority: Priority; projects: Project[] }[] }[]
  }

  const chipBase: React.CSSProperties = {
    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {/* Status filter chips */}
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        <button onClick={() => setFilterStatuses(new Set())} style={{
          ...chipBase,
          background: filterStatuses.size === 0 ? 'var(--accent)' : 'var(--surface)',
          color: filterStatuses.size === 0 ? '#fff' : 'var(--text-muted)',
          border: `1px solid ${filterStatuses.size === 0 ? 'var(--accent)' : 'var(--border)'}`,
        }}>All</button>
        {STATUS_ORDER.map(s => {
          const active = filterStatuses.has(s)
          return (
            <button key={s} onClick={() => toggleStatusFilter(s)} style={{
              ...chipBase,
              background: active ? 'var(--accent)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
            }}>{STATUS_LABELS[s]}</button>
          )
        })}
      </div>

      {/* Area filter chips */}
      {allAreas.length > 0 && (
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          <button onClick={() => setFilterAreaIds(new Set())} style={{
            ...chipBase,
            background: filterAreaIds.size === 0 ? 'var(--surface2)' : 'var(--surface)',
            color: 'var(--text-muted)', border: '1px solid var(--border)',
            fontWeight: filterAreaIds.size === 0 ? 700 : 600,
          }}>All areas</button>
          {allAreas.map(a => {
            const active = filterAreaIds.has(a.id)
            return (
              <button key={a.id} onClick={() => toggleAreaFilter(a.id)} style={{
                ...chipBase,
                color: active ? '#fff' : a.color,
                background: active ? a.color : `${a.color}22`,
                border: `1px solid ${a.color}66`,
              }}>{a.name}</button>
            )
          })}
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {filteredProjects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            {projects.length === 0
              ? <><p style={{ fontSize: 15, marginBottom: 8 }}>No projects yet</p><p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Tap + New to create your first project</p></>
              : <p style={{ fontSize: 14 }}>No projects match this filter</p>
            }
          </div>
        )}

        {areaGroups.map(areaGroup => {
          const areaKey = `a-${areaGroup.id}`
          const statusGroups = groupByStatusPriority(areaGroup.projects)
          return (
            <div key={areaGroup.id} style={{ marginBottom: 10 }}>
              <button onClick={() => toggleCollapse(areaKey)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 4px', background: 'none',
                borderBottom: `2px solid ${areaGroup.color}33`, marginBottom: 8,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: areaGroup.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 12, color: areaGroup.color, flex: 1, textAlign: 'left', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{areaGroup.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 4 }}>{areaGroup.projects.length}</span>
                {isOpen(areaKey) ? <ChevronDown size={14} color="var(--text-dim)" /> : <ChevronRight size={14} color="var(--text-dim)" />}
              </button>

              {isOpen(areaKey) && statusGroups.map(sg => {
                const statusKey = `s-${areaGroup.id}-${sg.status}`
                const statusCount = sg.priorityGroups.reduce((n, g) => n + g.projects.length, 0)
                return (
                  <div key={sg.status} style={{ marginLeft: 14, marginBottom: 8 }}>
                    <button onClick={() => toggleCollapse(statusKey)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 4px', background: 'none', marginBottom: 6,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flex: 1, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{STATUS_LABELS[sg.status]}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 4 }}>{statusCount}</span>
                      {isOpen(statusKey) ? <ChevronDown size={12} color="var(--text-dim)" /> : <ChevronRight size={12} color="var(--text-dim)" />}
                    </button>

                    {isOpen(statusKey) && sg.priorityGroups.map(pg => {
                      const priorityKey = `p-${areaGroup.id}-${sg.status}-${pg.priority}`
                      return (
                        <div key={pg.priority} style={{ marginLeft: 12, marginBottom: 4 }}>
                          <button onClick={() => toggleCollapse(priorityKey)} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                            padding: '3px 4px', background: 'none', marginBottom: 4,
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', flex: 1, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{PRIORITY_LABELS[pg.priority]}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginRight: 4 }}>{pg.projects.length}</span>
                            {isOpen(priorityKey) ? <ChevronDown size={11} color="var(--text-dim)" /> : <ChevronRight size={11} color="var(--text-dim)" />}
                          </button>

                          {isOpen(priorityKey) && pg.projects.map(p => (
                            <ProjectCard key={p.id} project={p} href={`/projects/${p.id}`} />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {showModal && (
        <ProjectModal allAreas={allAreas} userId={userId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); startTransition(() => router.refresh()) }} />
      )}
      <Nav />
    </div>
  )
}

function ProjectCard({ project: p, href }: { project: Project; href: string }) {
  const taskCount = p.task_count ?? 0
  const pct = taskCount ? Math.round(((p.completed_count ?? 0) / taskCount) * 100) : 0
  const areaColor = (p.areas ?? [])[0]?.color ?? '#888888'
  return (
    <Link href={href} style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 8 }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '12px 14px',
        borderLeft: `3px solid ${areaColor}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</p>
            {p.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <DeadlineBadge date={p.deadline} />
              {taskCount > 0 && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{p.completed_count ?? 0}/{taskCount}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
            {taskCount > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>}
            <ChevronRight size={16} color="var(--text-dim)" />
          </div>
        </div>
        {taskCount > 0 && (
          <div style={{ marginTop: 10, height: 3, background: 'var(--surface2)', borderRadius: 4 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: areaColor, borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>
    </Link>
  )
}
