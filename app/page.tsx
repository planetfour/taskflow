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

  const { data: areas } = await supabase.from('areas').select('*').eq('user_id', user.id).order('name')
  const { data: projectAreas } = await supabase.from('project_areas').select('project_id, areas(*)')

  const projectsWithData = await Promise.all((projects ?? []).map(async (p) => {
    const { count: total } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', p.id)
    const { count: done } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'done')
    const pAreas = (projectAreas ?? []).filter(pa => pa.project_id === p.id).map((pa: { areas: unknown }) => pa.areas).flat()
    return { ...p, task_count: total ?? 0, completed_count: done ?? 0, areas: pAreas }
  }))

  return <ProjectsClient projects={projectsWithData} allAreas={areas ?? []} userId={user.id} />
}
