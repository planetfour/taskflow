import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Area, RecurrenceType } from '@/lib/types'
import { toLocalDate } from '@/lib/utils'
import StreaksClient, { StreakSeries } from './StreaksClient'

export const dynamic = 'force-dynamic'

interface RecurringTaskRow {
  id: string
  title: string
  status: string
  deadline: string | null
  completed_at: string | null
  created_at: string
  project_id: string | null
  recurrence_type: RecurrenceType
  recurrence_interval: number | null
  projects: { name: string; color: string; project_areas: { areas: Area }[] } | null
}

export default async function StreaksPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) redirect('/login')

  const { data } = await supabase.from('tasks')
    .select('id, title, status, deadline, completed_at, created_at, project_id, recurrence_type, recurrence_interval, projects(name, color, project_areas(areas(*)))')
    .eq('user_id', user.id)
    .not('recurrence_type', 'is', null)
    .order('created_at', { ascending: true })

  const rows = (data ?? []) as unknown as RecurringTaskRow[]
  const todayStr = toLocalDate(new Date())

  // Recurring instances have no shared series id — completing one just inserts a fresh
  // row for the next occurrence — so reconstruct each series by title + project + cadence.
  const groups = new Map<string, RecurringTaskRow[]>()
  rows.forEach(r => {
    const key = `${r.project_id ?? 'none'}::${r.title.trim().toLowerCase()}::${r.recurrence_type}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  })

  const series: StreakSeries[] = []

  groups.forEach(sorted => {
    const hits: boolean[] = []
    let totalCompletions = 0
    let lastCompletedAt: string | null = null

    sorted.forEach(t => {
      const isDone = t.status === 'done'
      if (isDone) {
        totalCompletions++
        if (t.completed_at && (!lastCompletedAt || t.completed_at > lastCompletedAt)) lastCompletedAt = t.completed_at
        const completedDate = t.completed_at ? toLocalDate(new Date(t.completed_at)) : todayStr
        hits.push(!t.deadline || completedDate <= t.deadline)
      } else if (t.deadline && t.deadline < todayStr) {
        hits.push(false)
      }
      // else: pending / not yet due — excluded, doesn't help or hurt the streak
    })

    if (hits.length === 0) return

    let best = 0, run = 0
    hits.forEach(h => { run = h ? run + 1 : 0; best = Math.max(best, run) })
    let current = 0
    for (let i = hits.length - 1; i >= 0; i--) { if (hits[i]) current++; else break }

    if (best < 2) return // not a "streak" yet

    const last = sorted[sorted.length - 1]
    const openTask = last.status !== 'done' ? last : null

    series.push({
      key: `${last.project_id ?? 'none'}::${last.title.trim().toLowerCase()}::${last.recurrence_type}`,
      title: last.title,
      projectId: last.project_id,
      projectName: last.projects?.name ?? null,
      projectColor: last.projects?.color ?? null,
      areas: last.projects?.project_areas.map(pa => pa.areas).filter(Boolean) ?? [],
      recurrenceType: last.recurrence_type,
      recurrenceInterval: last.recurrence_interval,
      currentStreak: current,
      bestStreak: best,
      totalCompletions,
      lastCompletedAt,
      nextDue: openTask?.deadline ?? null,
      brokenStreak: current === 0 && best >= 2,
    })
  })

  const { data: allAreas } = await supabase.from('areas').select('*').eq('user_id', user.id).order('name')

  const groupMap = new Map<string, { area: Area | null; series: StreakSeries[] }>()
  ;(allAreas ?? []).forEach(a => groupMap.set(a.id, { area: a, series: [] }))
  groupMap.set('__none__', { area: null, series: [] })

  series.forEach(s => {
    if (s.areas.length === 0) {
      groupMap.get('__none__')!.series.push(s)
    } else {
      s.areas.forEach(a => {
        if (!groupMap.has(a.id)) groupMap.set(a.id, { area: a, series: [] })
        groupMap.get(a.id)!.series.push(s)
      })
    }
  })

  const sortSeries = (a: StreakSeries, b: StreakSeries) =>
    b.currentStreak - a.currentStreak || b.bestStreak - a.bestStreak || a.title.localeCompare(b.title)

  const groupsOut = Array.from(groupMap.values())
    .filter(g => g.series.length > 0)
    .map(g => ({ area: g.area, series: [...g.series].sort(sortSeries) }))
    .sort((a, b) => {
      if (!a.area && !b.area) return 0
      if (!a.area) return 1
      if (!b.area) return -1
      return a.area.name.localeCompare(b.area.name)
    })

  return <StreaksClient groups={groupsOut} />
}
