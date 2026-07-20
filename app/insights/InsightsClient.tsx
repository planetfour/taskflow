'use client'
import { useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Area, Task } from '@/lib/types'
import { priorityColor } from '@/lib/utils'
import TaskEditModal from '@/components/TaskEditModal'
import { BarChart2, Moon, ChevronDown, ChevronRight } from 'lucide-react'

const HOLD_COLOR = '#eab308'

interface CompletedTask {
  id: string
  completed_at: string
  areas: Area[]
}

interface AreaRow {
  area: Area | null
  count: number
}

interface Props {
  tasks: CompletedTask[]
  totalAllTime: number
  allAreas: Area[]
  dormantTasks: Task[]
  userId: string
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateStr(iso: string): string {
  return localDateStr(new Date(iso))
}

function computeStreak(tasks: CompletedTask[]): number {
  const dateSet = new Set(tasks.map(t => dateStr(t.completed_at)))
  const today = localDateStr(new Date())
  const yesterday = localDateStr(new Date(Date.now() - 86400000))
  if (!dateSet.has(today) && !dateSet.has(yesterday)) return 0
  const start = dateSet.has(today) ? today : yesterday
  let streak = 0
  const d = new Date(start + 'T00:00:00')
  while (true) {
    const s = localDateStr(d)
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
    return localDateStr(d)
  })
}

function dayLabel(d: string, todayStr: string): string {
  if (d === todayStr) return 'Today'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

function xAxisLabel(d: string, todayStr: string): string {
  if (d === todayStr) return 'Today'
  const date = new Date(d + 'T00:00:00')
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const md = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
  return `${weekday} ${md}`
}

// picks a "nice" rounded max/step (1/2/5×10^n) so gridlines land on whole numbers
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const rawStep = max / count
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  const step = Math.max(1, niceNorm * mag)
  const niceMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= niceMax + 1e-9; v += step) ticks.push(Math.round(v))
  return ticks
}

function buildDailySeries(tasks: CompletedTask[], rangeDays: number) {
  const lookback = lastNDays(rangeDays + 6)
  const counts: Record<string, number> = {}
  lookback.forEach(d => { counts[d] = 0 })
  tasks.forEach(t => {
    const d = dateStr(t.completed_at)
    if (d in counts) counts[d]++
  })
  const days = lookback.slice(6)
  const dailyCounts = days.map(d => counts[d])
  const movingAvg = days.map((_, i) => {
    const idx = i + 6
    const window = lookback.slice(idx - 6, idx + 1)
    return window.reduce((s, d) => s + counts[d], 0) / 7
  })
  return { days, dailyCounts, movingAvg }
}

function buildAreaBreakdown(subsetTasks: CompletedTask[], allAreas: Area[]): AreaRow[] {
  const areaCountMap: Record<string, number> = {}
  let noAreaCount = 0
  subsetTasks.forEach(t => {
    if (t.areas.length === 0) { noAreaCount++; return }
    t.areas.forEach(a => {
      areaCountMap[a.id] = (areaCountMap[a.id] ?? 0) + 1
    })
  })
  const rows: AreaRow[] = allAreas
    .filter(a => areaCountMap[a.id] > 0)
    .map(a => ({ area: a, count: areaCountMap[a.id] }))
    .sort((a, b) => b.count - a.count)
  if (noAreaCount > 0) rows.push({ area: null, count: noAreaCount })
  return rows
}

function CollapsibleCard({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
          </span>
          {badge}
        </div>
        {open ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
      </button>
      {open && <div style={{ padding: '0 18px 16px' }}>{children}</div>}
    </div>
  )
}

function LineChartLegend() {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
        Completed
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width={16} height={8}><line x1={0} y1={4} x2={16} y2={4} stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="1 4" strokeLinecap="round" /></svg>
        7-day avg
      </span>
    </div>
  )
}

function DailyLineChart({ days, dailyCounts, movingAvg, todayStr }: {
  days: string[]; dailyCounts: number[]; movingAvg: number[]; todayStr: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const n = days.length
  const ticks = niceTicks(Math.max(...dailyCounts, ...movingAvg, 1))
  const yMax = ticks[ticks.length - 1]

  const W = 320, H = 150, padLeft = 26, padRight = 10, topY = 10, xAxisH = 20
  const baseY = H - xAxisH
  const plotH = baseY - topY
  const xAt = (i: number) => padLeft + i * (W - padLeft - padRight) / (n - 1)
  const yAt = (v: number) => baseY - (v / yMax) * plotH

  const linePath = dailyCounts.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(v)}`).join(' ')
  const avgPath = movingAvg.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(v)}`).join(' ')
  const labelEvery = n > 10 ? Math.ceil(n / 6) : 1

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={padLeft} y1={yAt(t)} x2={W - padRight} y2={yAt(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={padLeft - 4} y={yAt(t) + 3} fontSize={8} textAnchor="end" fill="var(--text-dim)">{t}</text>
          </g>
        ))}
        {days.map((d, i) => (
          i % labelEvery === 0 && (
            <line key={`vgrid-${d}`} x1={xAt(i)} y1={topY} x2={xAt(i)} y2={baseY} stroke="var(--border)" strokeWidth={1} />
          )
        ))}
        <path d={avgPath} fill="none" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="1 5" strokeLinecap="round" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {dailyCounts.map((v, i) => (
          <g key={days[i]}>
            <circle cx={xAt(i)} cy={yAt(v)} r={3} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5} />
            <circle
              cx={xAt(i)} cy={yAt(v)} r={9} fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onTouchStart={() => setHover(i)}
              style={{ cursor: 'pointer' }}
            >
              <title>{`${dayLabel(days[i], todayStr)}: ${v}`}</title>
            </circle>
          </g>
        ))}
        {days.map((d, i) => (
          i % labelEvery === 0 && (
            <text key={d} x={xAt(i)} y={H - 4} fontSize={8} textAnchor="middle" fill={d === todayStr ? 'var(--accent)' : 'var(--text-muted)'}>
              {xAxisLabel(d, todayStr)}
            </text>
          )
        ))}
      </svg>
      {hover !== null && (
        <div style={{
          position: 'absolute',
          left: `${(xAt(hover) / W) * 100}%`,
          top: `${(yAt(dailyCounts[hover]) / H) * 100}%`,
          transform: 'translate(-50%, -135%)',
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6,
          padding: '3px 7px', fontSize: 10, fontWeight: 700, color: 'var(--text)',
          whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}>
          {dayLabel(days[hover], todayStr)}: {dailyCounts[hover]}
        </div>
      )}
    </div>
  )
}

function AreaPieChart({ areaRows }: { areaRows: AreaRow[] }) {
  const total = areaRows.reduce((s, r) => s + r.count, 0)
  const cumPcts = areaRows.reduce<number[]>((acc, { count }) => (
    [...acc, (acc[acc.length - 1] ?? 0) + (count / total) * 100]
  ), [])
  const stops = areaRows.map(({ area }, i) => {
    const color = area ? area.color : '#888888'
    const start = i === 0 ? 0 : cumPcts[i - 1]
    return `${color} ${start}% ${cumPcts[i]}%`
  })
  const gradient = `conic-gradient(${stops.join(', ')})`

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 130, height: 130, borderRadius: '50%', background: gradient, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', inset: 26, borderRadius: '50%', background: 'var(--surface)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{total}</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>tasks</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {areaRows.map(({ area, count }) => {
          const color = area ? area.color : '#888888'
          const name = area ? area.name : 'No area'
          const pct = Math.round((count / total) * 100)
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
  )
}

export default function InsightsClient({ tasks, totalAllTime, allAreas, dormantTasks, userId }: Props) {
  const [dormantOpen, setDormantOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const router = useRouter()

  const nowMs = Date.now()
  const today = localDateStr(new Date(nowMs))
  const sevenDaysAgo = localDateStr(new Date(nowMs - 7 * 86400000))
  const thirtyDaysAgo = localDateStr(new Date(nowMs - 30 * 86400000))

  const todayCount = tasks.filter(t => dateStr(t.completed_at) === today).length
  const weekTasks = tasks.filter(t => dateStr(t.completed_at) > sevenDaysAgo)
  const monthTasks = tasks.filter(t => dateStr(t.completed_at) > thirtyDaysAgo)
  const weekCount = weekTasks.length
  const streak = computeStreak(tasks)

  const series7 = buildDailySeries(tasks, 7)
  const series30 = buildDailySeries(tasks, 30)
  const areaRows7 = buildAreaBreakdown(weekTasks, allAreas)
  const areaRows30 = buildAreaBreakdown(monthTasks, allAreas)

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

        <CollapsibleCard title="Last 7 days">
          <LineChartLegend />
          <DailyLineChart days={series7.days} dailyCounts={series7.dailyCounts} movingAvg={series7.movingAvg} todayStr={today} />
        </CollapsibleCard>

        {areaRows7.length > 0 && (
          <CollapsibleCard title="By area · last 7 days">
            <AreaPieChart areaRows={areaRows7} />
          </CollapsibleCard>
        )}

        <CollapsibleCard title="Last 30 days">
          <LineChartLegend />
          <DailyLineChart days={series30.days} dailyCounts={series30.dailyCounts} movingAvg={series30.movingAvg} todayStr={today} />
        </CollapsibleCard>

        {areaRows30.length > 0 && (
          <CollapsibleCard title="By area · last 30 days">
            <AreaPieChart areaRows={areaRows30} />
          </CollapsibleCard>
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
                    <button
                      key={t.id}
                      onClick={() => setEditingTask(t)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                        background: 'none', border: 'none', borderTop: '1px solid var(--border)',
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                      }}
                    >
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
                    </button>
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

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          userId={userId}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null)
            startTransition(() => router.refresh())
          }}
        />
      )}
    </div>
  )
}
