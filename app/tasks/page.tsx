import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Task, Area } from '@/lib/types'
import AllTasksClient from './AllTasksClient'

export const dynamic = 'force-dynamic'

export default async function AllTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tasks }, allAreasResult] = await Promise.all([
    supabase.from('tasks')
      .select('*, projects(name, color, project_areas(areas(*)))')
      .eq('user_id', user.id)
      .is('parent_task_id', null)
      .order('status')
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
  ])

  const tasksWithAreas = (tasks ?? []).map(t => ({
    ...t,
    areas: ((t.projects as any)?.project_areas ?? [])
      .map((pa: { areas: unknown }) => pa.areas as Area)
      .filter(Boolean),
  }))

  return <AllTasksClient
    tasks={tasksWithAreas as (Task & { projects: { name: string; color: string } })[]}
    allAreas={allAreasResult.data ?? []}
    userId={user.id}
  />
}
