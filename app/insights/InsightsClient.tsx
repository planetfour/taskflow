'use client'
import { Area } from '@/lib/types'
import { BarChart2 } from 'lucide-react'

interface CompletedTask {
  id: string
  completed_at: string
  areas: Area[]
}

interface Props {
  tasks: CompletedTask[]
  totalAllTime: number
  allAreas: Area[]
}

function dateStr(iso: string): string {
  return iso.split('T')[0]
}

function computeStreak(tasks: CompletedTask[]): number {
  const dateSet = new Set(tasks.map(t => dateStr(t.completed_at)))
  const today = dateStr(new Date().toISOString())
  const yesterday = dateStr(new Date(Date.now() - 86400000).toISOString())
  if (!dateSet.has(today) && !dateSet.has(yesterday)) return 0
  const start = dateSet.has(today) ? today : yesterday
  let streak = 0
  const d = new Date(start + 'T00:00:00')
  while (true) {
    const s = d.toISOString().split('T')[0]
    if (!dateSet.has(s)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date().toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export default function InsightsClient({ tasks, totalAllTime, allAreas }: Props) {
  const today = dateStr(new Date().toISOString())
  const sevenDaysAgo = dateStr(new Date(Date.now() - 7 * 86400000).toISOString())

  const todayCount = tasks.filter(t => dateStr(t.completed_at) === today).length
  const weekTasks = tasks.filter(t => dateStr(t.completed_at) > sevenDaysAgo)
  const weekCount = weekTasks.length
  const streak = computeStreak(tasks)
  const days = last7Days()

  // daily breakdown (last 7 days)
  const dailyCounts: Record<string, number> = {}
  days.forEach(d => { dailyCounts[d] = 0 })
  tasks.forEach(t => {
    const d = dateStr(t.completed_at)
    if (d in dailyCounts) dailyCounts[d]++
  })
  const maxDaily = Math.max(...Object.values(dailyCounts), 1)

  // area breakdown (last 7 days)
  const areaCountMap: Record<string, number> = {}
  let noAreaCount = 0
  weekTasks.forEach(t => {
    if (t.areas.length === 0) { noAreaCount++; return }
    t.areas.forEach(a => {
      areaCountMap[a.id] = (areaCountMap[a.id] ?? 0) + 1
    })
  })
  const areaRows = allAreas
    .filter(a => areaCountMap[a.id] > 0)
    .map(a => ({ area: a, count: areaCountMap[a.id] }))
    .sort((a, b) => b.count - a.count)
  if (noAreaCount > 0) areaRows.push({ area: null as unknown as Area, count: noAreaCount })
  const maxArea = Math.max(...areaRows.map(r => r.count), 1)

  const statCard = (label: string, value: number | string, sub?: string) => (
    <div style={{
      flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BarChart2 size={16} color="var(--accent)" />
        </div>
        <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>Stats</h1>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 10 }}>
          {statCard('Today', todayCount)}
          {statCard('This week', weekCount, 'last 7 days')}
          {statCard('All time', totalAllTime)}
        </div>

        {/* Streak */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ fontSize: 32 }}>{streak > 0 ? '🔥' : '💤'}</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
              {streak} {streak === 1 ? 'day' : 'days'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              {streak > 0 ? 'current streak' : 'no active streak'}
            </div>
          </div>
        </div>

        {/* Daily bar chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Last 7 days
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {days.map(d => {
              const count = dailyCounts[d]
              const pct = (count / maxDaily) * 100
              const isToday = d === today
              return (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent)' : 'var(--text-muted)', width: 36, textAlign: 'right', flexShrink: 0 }}>
                    {dayLabel(d)}
                  </span>
                  <div style={{ flex: 1, height: 10, background: 'var(--surface2)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 5,
                      width: `${pct}%`,
                      background: isToday ? 'var(--accent)' : 'var(--accent)88',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: count > 0 ? 'var(--text)' : 'var(--text-dim)', width: 20, textAlign: 'right', flexShrink: 0 }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Area breakdown */}
        {areaRows.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              By area · last 7 days
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {areaRows.map(({ area, count }) => {
                const color = area ? area.color : '#888888'
                const name = area ? area.name : 'No area'
                const pct = (count / maxArea) * 100
                return (
                  <div key={area ? area.id : '__none__'} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color, width: 72, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>
                    <div style={{ flex: 1, height: 10, background: 'var(--surface2)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 5,
                        width: `${pct}%`,
                        background: color,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', width: 20, textAlign: 'right', flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <BarChart2 size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No completed tasks yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
