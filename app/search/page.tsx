import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SearchClient from './SearchClient'

export const dynamic = 'force-dynamic'

export default async function SearchPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')
  return <SearchClient userId={user.id} />
}
