'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, CheckSquare, Tag, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tabs = [
    { href: '/', label: 'Projects', icon: LayoutGrid },
    { href: '/tasks', label: 'All Tasks', icon: CheckSquare },
    { href: '/areas', label: 'Areas', icon: Tag },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      zIndex: 50,
    }}>
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link key={href} href={href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '4px 20px', textDecoration: 'none',
            color: active ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'color 0.15s',
          }}>
            <Icon size={22} />
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
          </Link>
        )
      })}
      <button onClick={signOut} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 3, padding: '4px 20px', background: 'none',
        color: 'var(--text-muted)',
      }}>
        <LogOut size={22} />
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Out</span>
      </button>
    </nav>
  )
}
