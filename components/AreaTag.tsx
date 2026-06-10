import { Area } from '@/lib/types'

export default function AreaTag({ area }: { area: Area }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      color: area.color,
      background: `${area.color}22`,
      border: `1px solid ${area.color}44`,
      padding: '2px 7px', borderRadius: 5,
    }}>
      {area.name}
    </span>
  )
}
