import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Task, Area } from '@/lib/types'
import { toLocalDate } from '@/lib/utils'
import PlannerClient, { PlannerTask } from './PlannerClient'

export const dynamic = 'force-dynamic'

type PlannerTaskRaw = Task & {
  projects: { id: string; name: string; color: string; project_areas?: { areas: Area }[] } | null
}

function withAreas(t: PlannerTaskRaw): PlannerTask {
  const projectAreas = (t.projects?.project_areas ?? []) as { areas: Area }[]
  return {
    ...t,
    areas: projectAreas.map(r => r.areas).filter(Boolean),
    projects: t.projects ? { id: t.projects.id, name: t.projects.name, color: t.projects.color } : null,
  }
}

export default async function PlannerPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')

  const todayDate = new Date()
  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const today = toLocalDate(todayDate)
  const tomorrow = toLocalDate(tomorrowDate)

  const [{ data: poolRaw }, { data: slotRows }] = await Promise.all([
    supabase.from('tasks')
      .select('*, projects(id, name, color, project_areas(areas(*)))')
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .neq('status', 'done')
      .or(`deadline.is.null,deadline.lte.${tomorrow}`)
      .order('priority'),
    supabase.from('planner_slots')
      .select('task_id, date, start_minutes, tasks(*, projects(id, name, color, project_areas(areas(*))))')
      .eq('user_id', user.id)
      .in('date', [today, tomorrow]),
  ])

  const taskById: Record<string, PlannerTask> = {}
  for (const t of (poolRaw ?? []) as PlannerTaskRaw[]) taskById[t.id] = withAreas(t)

  const slotsByDate: Record<string, Record<string, number>> = { [today]: {}, [tomorrow]: {} }
  for (const row of (slotRows ?? []) as unknown as { task_id: string; date: string; start_minutes: number; tasks: PlannerTaskRaw | null }[]) {
    if (!row.tasks) continue
    if (!taskById[row.tasks.id]) taskById[row.tasks.id] = withAreas(row.tasks)
    if (!slotsByDate[row.date]) slotsByDate[row.date] = {}
    slotsByDate[row.date][row.task_id] = row.start_minutes
  }

  return (
    <PlannerClient
      taskById={taskById}
      slotsByDate={slotsByDate}
      today={today}
      tomorrow={tomorrow}
      userId={user.id}
    />
  )
}
