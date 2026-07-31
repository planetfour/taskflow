'use client'
import { Area, RecurrenceType } from '@/lib/types'
import { formatCompletedAt, formatDeadline, recurrenceLabel } from '@/lib/utils'
import { Flame } from 'lucide-react'

export interface StreakSeries {
  key: string
  title: string
  projectId: string | null
  projectName: string | null
  projectColor: string | null
  areas: Area[]
  recurrenceType: RecurrenceType
  recurrenceInterval: number | null
  currentStreak: number
  bestStreak: number
  totalCompletions: number
  lastCompletedAt: string | null
  nextDue: string | null
  brokenStreak: boolean
}

interface Props {
  groups: { area: Area | null; series: StreakSeries[] }[]
}

function flavorText(s: StreakSeries): string {
  if (s.brokenStreak) return `Streak broken · best was ${s.bestStreak}`
  if (s.currentStreak >= 2 && s.currentStreak === s.bestStreak) return 'Personal best!'
  if (s.currentStreak >= s.bestStreak - 1 && s.currentStreak >= 3) return 'On a roll'
  return `Best: ${s.bestStreak}`
}

function StreakCard({ s }: { s: StreakSeries }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        background: s.currentStreak > 0 ? 'var(--accent-dim)' : 'var(--surface2)',
        border: `1px solid ${s.currentStreak > 0 ? 'var(--accent)' : 'var(--border)'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <Flame size={16} color={s.currentStreak > 0 ? 'var(--accent)' : 'var(--text-dim)'} fill={s.currentStreak > 0 ? 'var(--accent)' : 'none'} />
        <span style={{ fontSize: 14, fontWeight: 800, color: s.currentStreak > 0 ? 'var(--text)' : 'var(--text-dim)', lineHeight: 1.2 }}>
          {s.currentStreak}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {s.projectName && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.projectName}</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>· {recurrenceLabel(s.recurrenceType, s.recurrenceInterval)}</span>
        </div>
        <div style={{ fontSize: 11, color: s.brokenStreak ? '#ef4444' : 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
          {flavorText(s)}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {s.lastCompletedAt && (
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            Last done {formatCompletedAt(s.lastCompletedAt)}
          </div>
        )}
        {s.nextDue && (
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
            Next {formatDeadline(s.nextDue)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StreaksClient({ groups }: Props) {
  const hasAny = groups.some(g => g.series.length > 0)

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Flame size={16} color="var(--accent)" />
        </div>
        <h1 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.5px' }}>Streaks</h1>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {groups.map(({ area, series }) => (
          <div key={area ? area.id : '__none__'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, padding: '0 2px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: area ? area.color : '#888888', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {area ? area.name : 'No area'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', background: 'var(--surface2)', borderRadius: 20, padding: '1px 8px' }}>
                {series.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {series.map(s => <StreakCard key={s.key} s={s} />)}
            </div>
          </div>
        ))}

        {!hasAny && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Flame size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No streaks yet</p>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>
              Complete a recurring task on time twice in a row to start one.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
