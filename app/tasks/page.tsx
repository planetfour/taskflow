import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Task } from '@/lib/types'
import AllTasksClient from './AllTasksClient'

export default async function AllTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tasks } = await supabase.from('tasks')
    .select('*, projects(name, color)')
    .eq('user_id', user.id)
    .is('parent_task_id', null)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  return <AllTasksClient tasks={(tasks ?? []) as (Task & { projects: { name: string; color: string } })[]} userId={user.id} />
}
