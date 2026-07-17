'use client'
import { useState } from 'react'
import { Area, Priority, TaskStatus } from '@/lib/types'
import { priorityColor } from '@/lib/utils'
import { BarChart2, Moon, ChevronDown, ChevronRight } from 'lucide-react'

const HOLD_COLOR = '#eab308'

interface CompletedTask {
  id: string
  completed_at: string
  areas: Area[]
}

interface DormantTask {
  id: string
  title: string
  created_at: string
  status: TaskStatus
  priority: Priority
}

interface Props {
  tasks: CompletedTask[]
  totalAllTime: number
  allAreas: Area[]
  dormantTasks: DormantTask[]
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

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date().toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export default function InsightsClient({ tasks, totalAllTime, allAreas, dormantTasks }: Props) {
  const [dormantOpen, setDormantOpen] = useState(false)

  const nowMs = Date.now()
  const today = dateStr(new Date(nowMs).toISOString())
  const sevenDaysAgo = dateStr(new Date(nowMs - 7 * 86400000).toISOString())

  const todayCount = tasks.filter(t => dateStr(t.completed_at) === today).length
  const weekTasks = tasks.filter(t => dateStr(t.completed_at) > sevenDaysAgo)
  const weekCount = weekTasks.length
  const streak = computeStreak(tasks)

  // daily breakdown (last 7 days), plus 6 days of lookback so day 1's
  // trailing 7-day average has real data behind it instead of zero-padding
  const days13 = lastNDays(13)
  const counts13: Record<string, number> = {}
  days13.forEach(d => { counts13[d] = 0 })
  tasks.forEach(t => {
    const d = dateStr(t.completed_at)
    if (d in counts13) counts13[d]++
  })
  const days = days13.slice(6)
  const dailyCounts = days.map(d => counts13[d])
  const movingAvg = days.map((_, i) => {
    const idx = i + 6
    const window = days13.slice(idx - 6, idx + 1)
    return window.reduce((s, d) => s + counts13[d], 0) / 7
  })
  const maxDaily = Math.max(...dailyCounts, ...movingAvg, 1)

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
  const pieTotal = areaRows.reduce((s, r) => s + r.count, 0)

  const pieCumPcts = areaRows.reduce<number[]>((acc, { count }) => (
    [...acc, (acc[acc.length - 1] ?? 0) + (count / pieTotal) * 100]
  ), [])
  const pieStops = areaRows.map(({ area }, i) => {
    const color = area ? area.color : '#888888'
    const start = i === 0 ? 0 : pieCumPcts[i - 1]
    return `${color} ${start}% ${pieCumPcts[i]}%`
  })
  const pieGradient = `conic-gradient(${pieStops.join(', ')})`

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

  // line chart geometry
  const W = 300, H = 130, padX = 20, topY = 14, plotH = 74
  const baseY = topY + plotH
  const xAt = (i: number) => padX + i * (W - 2 * padX) / (days.length - 1)
  const yAt = (v: number) => baseY - (v / maxDaily) * plotH
  const linePath = dailyCounts.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(v)}`).join(' ')
  const avgPath = movingAvg.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(v)}`).join(' ')

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

        {/* Daily line chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Last 7 days
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                Completed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width={16} height={8}><line x1={0} y1={4} x2={16} y2={4} stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="1 4" strokeLinecap="round" /></svg>
                7-day avg
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
            <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="var(--border)" strokeWidth={1} />
            <path d={avgPath} fill="none" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="1 5" strokeLinecap="round" />
            <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} />
            {dailyCounts.map((v, i) => (
              <circle key={days[i]} cx={xAt(i)} cy={yAt(v)} r={3} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5}>
                <title>{`${dayLabel(days[i])}: ${v}`}</title>
              </circle>
            ))}
            {days.map((d, i) => (
              <text key={d} x={xAt(i)} y={H - 4} fontSize={9} textAnchor="middle" fill={d === today ? 'var(--accent)' : 'var(--text-muted)'}>
                {dayLabel(d)}
              </text>
            ))}
          </svg>
        </div>

        {/* Area breakdown — pie chart */}
        {areaRows.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              By area · last 7 days
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 130, height: 130, borderRadius: '50%', background: pieGradient, flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', inset: 26, borderRadius: '50%', background: 'var(--surface)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{pieTotal}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>tasks</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {areaRows.map(({ area, count }) => {
                  const color = area ? area.color : '#888888'
                  const name = area ? area.name : 'No area'
                  const pct = Math.round((count / pieTotal) * 100)
                  return (
                    <div key={area ? area.id : '__none__'} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                        {count} · {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dormant tasks */}
        {dormantTasks.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <button
              onClick={() => setDormantOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Moon size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Dormant tasks
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', background: 'var(--surface2)', borderRadius: 20, padding: '1px 8px' }}>
                  {dormantTasks.length}
                </span>
              </div>
              {dormantOpen ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
            </button>
            {dormantOpen && (
              <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column' }}>
                {dormantTasks.map(t => {
                  const ageDays = Math.floor((nowMs - new Date(t.created_at).getTime()) / 86400000)
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor(t.priority), flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </span>
                      {t.status === 'holding' && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: HOLD_COLOR, background: `${HOLD_COLOR}22`, borderRadius: 20, padding: '1px 6px', flexShrink: 0 }}>
                          HOLDING
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', flexShrink: 0 }}>
                        {ageDays}d
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
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
