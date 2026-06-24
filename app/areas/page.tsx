import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AreasClient from './AreasClient'

export const dynamic = 'force-dynamic'

export default async function AreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: areas } = await supabase.from('areas').select('*').eq('user_id', user.id).order('name')

  const areaIds = (areas ?? []).map(a => a.id)

  const { data: allProjectRows } = areaIds.length > 0
    ? await supabase.from('project_areas')
        .select('area_id, projects(id, name, color, status, priority, tasks(id, title, status, priority, deadline, project_id))')
        .in('area_id', areaIds)
    : { data: [] as { area_id: string; projects: unknown }[] }

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

  return <AreasClient areas={areasWithContent as never} userId={user.id} />
}
