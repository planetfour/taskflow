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

  const [taskAreaResult, allAreasResult] = await Promise.all([
    taskIds.length > 0
      ? supabase.from('task_areas').select('task_id, areas(*)').in('task_id', taskIds)
      : Promise.resolve({ data: null }),
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
  ])

  const taskAreaMap: Record<string, Area[]> = {}
  ;((taskAreaResult.data ?? []) as { task_id: string; areas: unknown }[]).forEach(r => {
    if (!taskAreaMap[r.task_id]) taskAreaMap[r.task_id] = []
    taskAreaMap[r.task_id].push(r.areas as Area)
  })

  const tasksWithAreas = (tasks ?? []).map(t => ({
    ...t,
    areas: taskAreaMap[t.id] ?? [],
  }))

  return <AllTasksClient
    tasks={tasksWithAreas as (Task & { projects: { name: string; color: string } })[]}
    allAreas={allAreasResult.data ?? []}
    userId={user.id}
  />
}
