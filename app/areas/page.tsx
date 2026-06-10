import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AreasClient from './AreasClient'

export default async function AreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: areas } = await supabase.from('areas').select('*').eq('user_id', user.id).order('name')

  // For each area, get project and task counts
  const areasWithCounts = await Promise.all((areas ?? []).map(async (a) => {
    const { count: projectCount } = await supabase
      .from('project_areas').select('*', { count: 'exact', head: true }).eq('area_id', a.id)
    const { count: taskCount } = await supabase
      .from('task_areas').select('*', { count: 'exact', head: true }).eq('area_id', a.id)
    return { ...a, project_count: projectCount ?? 0, task_count: taskCount ?? 0 }
  }))

  return <AreasClient areas={areasWithCounts} userId={user.id} />
}
