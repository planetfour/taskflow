import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Task, Area } from '@/lib/types'
import ProjectDetailClient from './ProjectDetailClient'

function nestTasks(tasks: Task[]): Task[] {
  const map = new Map<string, Task>()
  tasks.forEach(t => map.set(t.id, { ...t, subtasks: [] }))
  const roots: Task[] = []
  map.forEach(t => {
    if (t.parent_task_id && map.has(t.parent_task_id)) {
      map.get(t.parent_task_id)!.subtasks!.push(t)
    } else {
      roots.push(t)
    }
  })
  return roots
}

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, { data: projectAreaRows }, { data: tasks }, { data: allAreas }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('project_areas').select('areas(*)').eq('project_id', id),
    supabase.from('tasks').select('*').eq('project_id', id).eq('user_id', user.id).order('sort_order').order('created_at'),
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
  ])
  if (!project) redirect('/')

  const projectAreas = (projectAreaRows ?? []).map((r: { areas: unknown }) => r.areas).flat() as Area[]
  const tasksWithAreas = (tasks ?? []).map(t => ({ ...t, areas: projectAreas })) as Task[]
  const nested = nestTasks(tasksWithAreas)

  return <ProjectDetailClient project={{ ...project, areas: projectAreas }} tasks={nested} allAreas={allAreas ?? []} userId={user.id} />
}
