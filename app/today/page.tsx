import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Task, Area } from '@/lib/types'
import TodayClient from './TodayClient'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [{ data: tasks }, { data: recurringRaw }, allAreasResult, { data: allProjects }] = await Promise.all([
    supabase.from('tasks')
      .select('*, projects(id, name, color)')
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .neq('status', 'done')
      .not('deadline', 'is', null)
      .lte('deadline', in7Days)
      .order('deadline', { ascending: true })
      .order('priority'),
    supabase.from('tasks')
      .select('*, projects(id, name, color)')
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .neq('status', 'done')
      .not('recurrence_type', 'is', null)
      .or(`deadline.is.null,deadline.gt.${in7Days}`)
      .order('recurrence_type')
      .order('priority'),
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
    supabase.from('projects').select('id').eq('user_id', user.id),
  ])

  const allProjectIds = (allProjects ?? []).map((p: any) => p.id)

  const { data: paRows } = allProjectIds.length
    ? await supabase.from('project_areas').select('project_id, areas(*)').in('project_id', allProjectIds)
    : { data: [] }

  const projectAreasMap: Record<string, Area[]> = {}
  ;((paRows ?? []) as { project_id: string; areas: unknown }[]).forEach(r => {
    if (!projectAreasMap[r.project_id]) projectAreasMap[r.project_id] = []
    const areaVal = r.areas
    if (Array.isArray(areaVal)) {
      areaVal.filter(Boolean).forEach(a => projectAreasMap[r.project_id].push(a as Area))
    } else if (areaVal) {
      projectAreasMap[r.project_id].push(areaVal as Area)
    }
  })

  type TaskWithProject = Task & { projects: { id: string; name: string; color: string } | null }

  function withAreas(raw: typeof tasks): TaskWithProject[] {
    return (raw ?? []).map(t => ({
      ...t,
      areas: projectAreasMap[(t as any).project_id] ?? [],
    })) as TaskWithProject[]
  }

  return (
    <TodayClient
      tasks={withAreas(tasks)}
      recurringTasks={withAreas(recurringRaw)}
      allAreas={allAreasResult.data ?? []}
      userId={user.id}
      today={today}
    />
  )
}
