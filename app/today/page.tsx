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

  const [{ data: tasks }, { data: recurringRaw }] = await Promise.all([
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
  ])

  const allRaw = [...(tasks ?? []), ...(recurringRaw ?? [])]
  const taskIds = allRaw.map(t => t.id)

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

  type TaskWithProject = Task & { projects: { id: string; name: string; color: string } | null }

  function withAreas(raw: typeof tasks): TaskWithProject[] {
    return (raw ?? []).map(t => ({ ...t, areas: taskAreaMap[t.id] ?? [] })) as TaskWithProject[]
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
