import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AreasClient from './AreasClient'

export default async function AreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: areas } = await supabase.from('areas').select('*').eq('user_id', user.id).order('name')

  // Fetch projects and tasks for each area with full details
  const areasWithContent = await Promise.all((areas ?? []).map(async (a) => {
    const { data: projectRows } = await supabase
      .from('project_areas')
      .select('projects(id, name, color, status, priority)')
      .eq('area_id', a.id)

    const { data: taskRows } = await supabase
      .from('task_areas')
      .select('tasks(id, title, status, priority, deadline, project_id)')
      .eq('area_id', a.id)

    const projects = (projectRows ?? []).map(r => r.projects).filter(Boolean)
    const tasks = (taskRows ?? []).map(r => r.tasks).filter(Boolean)

    return { ...a, projects, tasks, project_count: projects.length, task_count: tasks.length }
  }))

  return <AreasClient areas={areasWithContent} userId={user.id} />
}
