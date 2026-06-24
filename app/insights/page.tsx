import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Area } from '@/lib/types'
import InsightsClient from './InsightsClient'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: recentDone },
    { count: totalAllTime },
    allAreasResult,
  ] = await Promise.all([
    supabase.from('tasks')
      .select('id, completed_at, project_id')
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
  ])

  const projectIds = [...new Set((recentDone ?? []).map(t => t.project_id).filter(Boolean) as string[])]

  const { data: projectAreaRows } = projectIds.length > 0
    ? await supabase.from('project_areas').select('project_id, areas(*)').in('project_id', projectIds)
    : { data: null }

  const projectAreaMap: Record<string, Area[]> = {}
  ;((projectAreaRows ?? []) as { project_id: string; areas: unknown }[]).forEach(r => {
    if (!projectAreaMap[r.project_id]) projectAreaMap[r.project_id] = []
    projectAreaMap[r.project_id].push(r.areas as Area)
  })

  const tasks = (recentDone ?? []).map(t => ({
    id: t.id,
    completed_at: t.completed_at as string,
    areas: projectAreaMap[t.project_id ?? ''] ?? [],
  }))

  return (
    <InsightsClient
      tasks={tasks}
      totalAllTime={totalAllTime ?? 0}
      allAreas={allAreasResult.data ?? []}
    />
  )
}
