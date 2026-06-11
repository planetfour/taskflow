import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Task, Area } from '@/lib/types'
import AllTasksClient from './AllTasksClient'

export const dynamic = 'force-dynamic'

export default async function AllTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tasks } = await supabase.from('tasks')
    .select('*, projects(name, color)')
    .eq('user_id', user.id)
    .is('parent_task_id', null)
    .order('status')
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const taskIds = (tasks ?? []).map(t => t.id)
  const projectIds = [...new Set((tasks ?? []).map(t => t.project_id).filter(Boolean))]

  const [taskAreaResult, paResult, allAreasResult] = await Promise.all([
    taskIds.length > 0
      ? supabase.from('task_areas').select('task_id, areas(*)').in('task_id', taskIds)
      : Promise.resolve({ data: null }),
    projectIds.length > 0
      ? supabase.from('project_areas').select('project_id, areas(color)').in('project_id', projectIds)
      : Promise.resolve({ data: null }),
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
  ])

  const taskAreaMap: Record<string, Area[]> = {}
  ;((taskAreaResult.data ?? []) as { task_id: string; areas: unknown }[]).forEach(r => {
    if (!taskAreaMap[r.task_id]) taskAreaMap[r.task_id] = []
    taskAreaMap[r.task_id].push(r.areas as Area)
  })

  const projectAreaColorMap: Record<string, string> = {}
  // Supabase types embedded resources as arrays; handle both array and object shape
  ;((paResult.data ?? []) as { project_id: string; areas: unknown }[]).forEach(r => {
    const areas = r.areas
    const color: string | undefined = Array.isArray(areas)
      ? (areas as { color: string }[])[0]?.color
      : (areas as { color: string } | null)?.color
    if (color && !projectAreaColorMap[r.project_id]) {
      projectAreaColorMap[r.project_id] = color
    }
  })

  const tasksWithAreas = (tasks ?? []).map(t => ({
    ...t,
    areas: taskAreaMap[t.id] ?? [],
    projects: t.projects ? { ...t.projects, areaColor: projectAreaColorMap[t.project_id] } : t.projects,
  }))

  return <AllTasksClient
    tasks={tasksWithAreas as (Task & { projects: { name: string; color: string; areaColor?: string } })[]}
    allAreas={allAreasResult.data ?? []}
    userId={user.id}
  />
}
