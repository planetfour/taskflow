'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import DeadlineBadge from '@/components/DeadlineBadge'
import { Search, LayoutGrid, CheckSquare, Circle, CheckCircle2, Clock } from 'lucide-react'

const HOLD_COLOR = '#eab308'

type TaskResult = {
  id: string
  title: string
  status: string
  priority: string
  deadline: string | null
  project_id: string
  projects: { id: string; name: string; color: string } | null
}

type ProjectResult = {
  id: string
  name: string
  color: string
  status: string
  priority: string
}

const statusIcon = (s: string) => {
  if (s === 'done') return <CheckCircle2 size={13} color="var(--accent)" />
  if (s === 'holding') return <Clock size={13} color={HOLD_COLOR} />
  return <Circle size={13} color="var(--text-dim)" />
}

export default function SearchClient({ userId }: { userId: string }) {
  const [query, setQuery] = useState('')
  const [tasks, setTasks] = useState<TaskResult[]>([])
  const [projects, setProjects] = useState<ProjectResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) { setTasks([]); setProjects([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const pattern = `%${q}%`
      const [tasksRes, projectsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, status, priority, deadline, project_id, projects(id, name, color)')
          .eq('user_id', userId)
          .ilike('title', pattern)
          .is('parent_task_id', null)
          .limit(25),
        supabase
          .from('projects')
          .select('id, name, color, status, priority')
          .eq('user_id', userId)
          .ilike('name', pattern)
          .limit(15),
      ])
      setTasks((tasksRes.data ?? []) as TaskResult[])
      setProjects((projectsRes.data ?? []) as ProjectResult[])
      setLoading(false)
    }, 280)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const hasResults = tasks.length > 0 || projects.length > 0
  const searched = query.trim().length > 0

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Search size={16} color="var(--accent)" />
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>Search</h1>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks and projects…"
            style={{ width: '100%', paddingLeft: 38, paddingRight: 12 }}
          />
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {!searched && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ marginBottom: 12, opacity: 0.2 }} />
            <p style={{ fontSize: 14 }}>Type to search tasks and projects</p>
          </div>
        )}

        {searched && !loading && !hasResults && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 14 }}>No results for "{query.trim()}"</p>
          </div>
        )}

        {projects.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <LayoutGrid size={13} color="var(--text-dim)" />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Projects
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.6 }}>{projects.length}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 6 }}>
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '11px 13px',
                  borderLeft: `3px solid ${p.color}`,
                }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{p.status}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <CheckSquare size={13} color="var(--text-dim)" />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                Tasks
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', opacity: 0.6 }}>{tasks.length}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            {tasks.map(t => {
              const proj = t.projects
              const borderColor = proj?.color ?? 'var(--border)'
              return (
                <Link key={t.id} href={`/projects/${t.project_id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginBottom: 6 }}>
                  <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '11px 13px',
                    borderLeft: `3px solid ${borderColor}`,
                    opacity: t.status === 'done' ? 0.55 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ paddingTop: 2, flexShrink: 0 }}>{statusIcon(t.status)}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 500, marginBottom: 4,
                          textDecoration: t.status === 'done' ? 'line-through' : 'none',
                        }}>{t.title}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {proj && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: proj.color }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
                              {proj.name}
                            </span>
                          )}
                          <DeadlineBadge date={t.deadline} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <Nav />
    </div>
  )
}
