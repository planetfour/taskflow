import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Task } from '@/lib/types'
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

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!project) redirect('/')

  const { data: tasks } = await supabase.from('tasks').select('*').eq('project_id', id).eq('user_id', user.id).order('sort_order').order('created_at')

  const nested = nestTasks((tasks ?? []) as Task[])
  return <ProjectDetailClient project={project} tasks={nested} userId={user.id} />
}
