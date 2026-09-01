'use client'
import { useEffect, useState } from 'react'
import { Task } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import PriorityBadge from '@/components/PriorityBadge'
import { CalendarClock, X, GripVertical } from 'lucide-react'

export type PlannerTask = Task & { projects: { id: string; name: string; color: string } | null }

interface Props {
  taskById: Record<string, PlannerTask>
  slotsByDate: Record<string, Record<string, number>> // date -> taskId -> startMinutes
  today: string
  tomorrow: string
  userId: string
}

const START_MINUTES = 9 * 60
const END_MINUTES = 24 * 60
const STEP = 30
const SLOTS: number[] = []
for (let m = START_MINUTES; m < END_MINUTES; m += STEP) SLOTS.push(m)

function formatSlotTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60)
  const period = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12} ${period}`
}

function taskAccentColor(t: PlannerTask): string {
  return (t.areas ?? [])[0]?.color ?? t.projects?.color ?? '#888888'
}

interface DragState { taskId: string; fromDate: string | null; x: number; y: number }

export default function PlannerClient({ taskById, slotsByDate: initialSlotsByDate, today, tomorrow, userId }: Props) {
  const [day, setDay] = useState<'today' | 'tomorrow'>('today')
  const [slotsByDate, setSlotsByDate] = useState(initialSlotsByDate)
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null)
  const [hoverPool, setHoverPool] = useState(false)
  const supabase = createClient()

  const date = day === 'today' ? today : tomorrow
  const slots = slotsByDate[date] ?? {}
  const scheduledIds = new Set(Object.keys(slots))

  const allTasks = Object.values(taskById)
  const poolTasks = allTasks
    .filter(t => !scheduledIds.has(t.id))
    .filter(t => t.deadline === null || t.deadline <= date)
    .sort((a, b) => {
      const pri = { urgent: 0, high: 1, medium: 2, low: 3 }
      return pri[a.priority] - pri[b.priority]
    })

  const byMinutes: Record<number, string[]> = {}
  for (const [taskId, minutes] of Object.entries(slots)) {
    if (!byMinutes[minutes]) byMinutes[minutes] = []
    byMinutes[minutes].push(taskId)
  }

  async function placeTask(taskId: string, minutes: number) {
    setSlotsByDate(prev => ({ ...prev, [date]: { ...(prev[date] ?? {}), [taskId]: minutes } }))
    await supabase.from('planner_slots').upsert(
      { user_id: userId, task_id: taskId, date, start_minutes: minutes },
      { onConflict: 'user_id,date,task_id' }
    )
  }

  async function removeTask(taskId: string) {
    setSlotsByDate(prev => {
      const next = { ...(prev[date] ?? {}) }
      delete next[taskId]
      return { ...prev, [date]: next }
    })
    await supabase.from('planner_slots').delete().eq('user_id', userId).eq('date', date).eq('task_id', taskId)
  }

  function startDrag(e: React.PointerEvent, taskId: string, fromDate: string | null) {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDragging({ taskId, fromDate, x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    if (!dragging) return

    function onMove(e: PointerEvent) {
      setDragging(d => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const slotEl = el?.closest('[data-slot-minutes]') as HTMLElement | null
      const poolEl = el?.closest('[data-pool-drop]') as HTMLElement | null
      setHoverMinutes(slotEl ? Number(slotEl.dataset.slotMinutes) : null)
      setHoverPool(!!poolEl)
    }

    function onUp(e: PointerEvent) {
      const d = dragging
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const slotEl = el?.closest('[data-slot-minutes]') as HTMLElement | null
      const poolEl = el?.closest('[data-pool-drop]') as HTMLElement | null
      if (d) {
        if (slotEl) {
          placeTask(d.taskId, Number(slotEl.dataset.slotMinutes))
        } else if (poolEl && d.fromDate) {
          removeTask(d.taskId)
        }
      }
      setDragging(null)
      setHoverMinutes(null)
      setHoverPool(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  const dayLabel = (d: 'today' | 'tomorrow') => {
    const dateStr = d === 'today' ? today : tomorrow
    const formatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    return `${d === 'today' ? 'Today' : 'Tomorrow'} · ${formatted}`
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarClock size={16} color="var(--accent)" />
        </div>
        <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>Planner</h1>
      </div>

      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
        {(['today', 'tomorrow'] as const).map(d => (
          <button key={d} onClick={() => setDay(d)} style={{
            flex: 1, padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: day === d ? 'var(--accent)' : 'var(--surface)',
            color: day === d ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${day === d ? 'var(--accent)' : 'var(--border)'}`,
          }}>{dayLabel(d)}</button>
        ))}
      </div>

      {/* Chalkboard schedule */}
      <div style={{ margin: '0 16px 20px' }}>
        <div style={{
          background: 'linear-gradient(180deg, #1c2b1f, #16221a)',
          border: '9px solid #43301f',
          borderRadius: 12,
          boxShadow: 'inset 0 0 36px rgba(0,0,0,0.4), 0 4px 14px rgba(0,0,0,0.3)',
          padding: '10px 8px',
        }}>
          {SLOTS.map(minutes => {
            const onHour = minutes % 60 === 0
            const taskIds = byMinutes[minutes] ?? []
            const isHover = dragging && hoverMinutes === minutes
            return (
              <div
                key={minutes}
                data-slot-minutes={minutes}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  minHeight: onHour ? 40 : 30,
                  borderBottom: onHour ? '1px solid rgba(255,255,255,0.18)' : '1px dashed rgba(255,255,255,0.1)',
                  background: isHover ? 'rgba(255,255,255,0.09)' : 'transparent',
                  borderRadius: isHover ? 6 : 0,
                  padding: '3px 4px',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{
                  width: 44, flexShrink: 0, fontSize: onHour ? 11 : 9,
                  fontStyle: 'italic', fontWeight: onHour ? 700 : 400,
                  color: onHour ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
                  paddingTop: 4,
                }}>
                  {onHour ? formatSlotTime(minutes) : ''}
                </div>
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 2, paddingBottom: 2 }}>
                  {taskIds.map(taskId => {
                    const t = taskById[taskId]
                    if (!t) return null
                    const color = taskAccentColor(t)
                    const done = t.status === 'done'
                    return (
                      <div key={taskId} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(255,255,255,0.08)',
                        border: `1px dashed ${color}99`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 6, padding: '3px 6px 3px 7px',
                        opacity: done ? 0.5 : 1,
                        touchAction: 'none', cursor: 'grab',
                      }}
                        onPointerDown={e => startDrag(e, taskId, date)}
                      >
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: '#f5f0e6',
                          textDecoration: done ? 'line-through' : 'none',
                        }}>{t.title}</span>
                        <button
                          onPointerDown={e => e.stopPropagation()}
                          onClick={() => removeTask(taskId)}
                          style={{ background: 'none', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 1 }}
                        ><X size={11} /></button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unscheduled task pool */}
      <div
        data-pool-drop
        style={{
          padding: '0 16px',
          outline: dragging && hoverPool ? '2px dashed var(--accent)' : 'none',
          outlineOffset: 4,
          borderRadius: 12,
        }}
      >
        <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Ready to schedule ({poolTasks.length})
        </p>

        {poolTasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 13 }}>Nothing left to schedule for this day</p>
          </div>
        )}

        {poolTasks.map(t => {
          const color = taskAccentColor(t)
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '10px 12px', marginBottom: 6,
              borderLeft: `3px solid ${color}`,
              touchAction: 'none', cursor: 'grab',
            }}
              onPointerDown={e => startDrag(e, t.id, null)}
            >
              <GripVertical size={14} color="var(--text-dim)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{t.title}</p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <PriorityBadge priority={t.priority} />
                  {t.projects && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{t.projects.name}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {dragging && (
        <div style={{
          position: 'fixed', left: dragging.x, top: dragging.y, transform: 'translate(-50%, -130%)',
          pointerEvents: 'none', zIndex: 200,
          background: 'var(--accent)', color: '#fff', padding: '6px 12px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
        }}>
          {taskById[dragging.taskId]?.title}
        </div>
      )}
    </div>
  )
}
