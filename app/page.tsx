import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get task counts
  const projectsWithCounts = await Promise.all((projects ?? []).map(async (p) => {
    const { count: total } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', p.id)
    const { count: done } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'done')
    return { ...p, task_count: total ?? 0, completed_count: done ?? 0 }
  }))

  return <ProjectsClient projects={projectsWithCounts} userId={user.id} />
}
