import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AreasClient from './AreasClient'

export const dynamic = 'force-dynamic'

export default async function AreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Step 1: fetch areas and all projects in parallel
  const [{ data: areas }, { data: allProjects }] = await Promise.all([
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
    supabase.from('projects').select('id, name, color, status, priority').eq('user_id', user.id),
  ])

  const areaIds = (areas ?? []).map(a => a.id)
  const allProjectIds = (allProjects ?? []).map(p => p.id)

  // Step 2: fetch area-content rows and project_areas membership in parallel
  const [{ data: allProjectRows }, { data: paRows }] = await Promise.all([
    areaIds.length > 0
      ? supabase.from('project_areas')
          .select('area_id, projects(id, name, color, status, priority, tasks(id, title, status, priority, deadline, project_id))')
          .in('area_id', areaIds)
      : Promise.resolve({ data: [] as any[] }),
    allProjectIds.length > 0
      ? supabase.from('project_areas').select('project_id').in('project_id', allProjectIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // Step 3: compute no-area projects
  const projectIdsWithArea = new Set((paRows ?? []).map((r: any) => r.project_id))
  const noAreaProjects = (allProjects ?? []).filter(p => !projectIdsWithArea.has(p.id))
  const noAreaProjectIds = noAreaProjects.map(p => p.id)

  // Step 4: fetch tasks for no-area projects
  const { data: noAreaTasks } = noAreaProjectIds.length > 0
    ? await supabase.from('tasks')
        .select('id, title, status, priority, deadline, project_id')
        .in('project_id', noAreaProjectIds)
        .is('parent_task_id', null)
        .neq('status', 'done')
    : { data: [] as any[] }

  const areaProjectsMap: Record<string, unknown[]> = {}
  const areaTasksMap: Record<string, unknown[]> = {}

  ;(allProjectRows ?? []).forEach((r: { area_id: string; projects: unknown }) => {
    const proj = r.projects as { id: string; tasks?: unknown[] } | null
    if (!proj) return
    if (!areaProjectsMap[r.area_id]) areaProjectsMap[r.area_id] = []
    areaProjectsMap[r.area_id].push(r.projects)
    if (!areaTasksMap[r.area_id]) areaTasksMap[r.area_id] = []
    ;(proj.tasks ?? []).forEach(t => areaTasksMap[r.area_id].push(t))
  })

  const areasWithContent = (areas ?? []).map(a => ({
    ...a,
    projects: areaProjectsMap[a.id] ?? [],
    tasks: areaTasksMap[a.id] ?? [],
    project_count: (areaProjectsMap[a.id] ?? []).length,
    task_count: (areaTasksMap[a.id] ?? []).length,
  }))

  return (
    <AreasClient
      areas={areasWithContent as never}
      userId={user.id}
      noAreaProjects={noAreaProjects as never}
      noAreaTasks={(noAreaTasks ?? []) as never}
    />
  )
}
