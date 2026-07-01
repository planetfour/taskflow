import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Area } from '@/lib/types'
import ProjectsClient from './ProjectsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')

  const [{ data: projects }, { data: areas }, { data: allTasks }] = await Promise.all([
    supabase.from('projects').select('*, project_areas(areas(*))').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
    supabase.from('tasks').select('project_id, status').eq('user_id', user.id),
  ])

  const taskCounts: Record<string, { total: number; done: number }> = {}
  ;(allTasks ?? []).forEach((t: { project_id: string; status: string }) => {
    if (!t.project_id) return
    if (!taskCounts[t.project_id]) taskCounts[t.project_id] = { total: 0, done: 0 }
    taskCounts[t.project_id].total++
    if (t.status === 'done') taskCounts[t.project_id].done++
  })

  const projectsWithData = (projects ?? []).map(p => {
    const projectAreas = ((p as any).project_areas ?? []) as { areas: Area }[]
    return {
      ...p,
      task_count: taskCounts[p.id]?.total ?? 0,
      completed_count: taskCounts[p.id]?.done ?? 0,
      areas: projectAreas.map(r => r.areas).filter(Boolean),
    }
  })

  return <ProjectsClient projects={projectsWithData} allAreas={areas ?? []} userId={user.id} />
}
