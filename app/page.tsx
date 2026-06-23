import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Area } from '@/lib/types'
import ProjectsClient from './ProjectsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: projects }, { data: areas }, { data: allTasks }] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
    supabase.from('tasks').select('project_id, status').eq('user_id', user.id),
  ])

  const projectIds = (projects ?? []).map(p => p.id)

  if (projectIds.length === 0) {
    return <ProjectsClient projects={[]} allAreas={areas ?? []} userId={user.id} />
  }

  const { data: paRows } = await supabase.from('project_areas').select('project_id, areas(*)').in('project_id', projectIds)

  const taskCounts: Record<string, { total: number; done: number }> = {}
  ;(allTasks ?? []).forEach((t: { project_id: string; status: string }) => {
    if (!t.project_id) return
    if (!taskCounts[t.project_id]) taskCounts[t.project_id] = { total: 0, done: 0 }
    taskCounts[t.project_id].total++
    if (t.status === 'done') taskCounts[t.project_id].done++
  })

  const projectAreasMap: Record<string, Area[]> = {}
  ;((paRows ?? []) as { project_id: string; areas: unknown }[]).forEach(r => {
    if (!projectAreasMap[r.project_id]) projectAreasMap[r.project_id] = []
    if (r.areas) projectAreasMap[r.project_id].push(r.areas as Area)
  })

  const projectsWithData = (projects ?? []).map(p => ({
    ...p,
    task_count: taskCounts[p.id]?.total ?? 0,
    completed_count: taskCounts[p.id]?.done ?? 0,
    areas: projectAreasMap[p.id] ?? [],
  }))

  return <ProjectsClient projects={projectsWithData} allAreas={areas ?? []} userId={user.id} />
}
