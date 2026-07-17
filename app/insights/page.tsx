import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Area } from '@/lib/types'
import InsightsClient from './InsightsClient'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: recentDone },
    { count: totalAllTime },
    allAreasResult,
    { data: dormant },
  ] = await Promise.all([
    supabase.from('tasks')
      .select('id, completed_at, project_id, projects(project_areas(areas(*)))')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .not('completed_at', 'is', null)
      .gte('completed_at', ninetyDaysAgo)
      .order('completed_at', { ascending: false }),
    supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'done'),
    supabase.from('areas').select('*').eq('user_id', user.id).order('name'),
    supabase.from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['todo', 'holding'])
      .lte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true }),
  ])

  type DoneTaskRow = { id: string; completed_at: string | null; project_id: string | null; projects: { project_areas: { areas: Area }[] } | null }

  const tasks = ((recentDone ?? []) as unknown as DoneTaskRow[]).map(t => ({
    id: t.id,
    completed_at: t.completed_at as string,
    areas: (t.projects?.project_areas ?? []).map(r => r.areas).filter(Boolean),
  }))

  return (
    <InsightsClient
      tasks={tasks}
      totalAllTime={totalAllTime ?? 0}
      allAreas={allAreasResult.data ?? []}
      dormantTasks={dormant ?? []}
      userId={user.id}
    />
  )
}
