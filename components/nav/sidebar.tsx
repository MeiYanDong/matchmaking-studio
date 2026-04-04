'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/actions/auth'
import {
  BookOpenText,
  LogOut,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getNavItems } from '@/components/nav/nav-config'

interface SidebarProps {
  role: 'matchmaker' | 'admin'
  displayName: string
  unreadCount?: number
}

export function Sidebar({ role, displayName, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const navItems = getNavItems(role)
  const guideHref = role === 'admin' ? '/admin/guide' : '/matchmaker/guide'
  const guideActive = pathname.startsWith(guideHref)

  return (
    <aside className="hidden min-h-screen w-[304px] shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar/80 text-sidebar-foreground shadow-[var(--shadow-soft)] supports-backdrop-filter:backdrop-blur-2xl lg:flex">
      <div className="border-b border-sidebar-border/80 px-6 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="theme-brand-badge flex h-12 w-12 items-center justify-center rounded-[1.1rem] border border-white/70">
            <Image src="/brand/logo-mark.svg" alt="Matchmaking Studio" width={28} height={28} />
          </div>
          <div>
            <div className="font-heading text-lg tracking-[-0.03em] text-foreground">Matchmaking Studio</div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              AI-first matchmaking workspace
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/70 bg-[color:var(--surface-soft-strong)] p-4 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {role === 'admin' ? '管理员视角 · 治理与漏斗' : '红娘视角 · 客户推进与补问'}
          </p>
        </div>
      </div>

      <div className="px-6 pt-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {role === 'admin' ? 'Admin Navigation' : 'Core Workflow'}
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isReminder = item.href.includes('reminders')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-[1.3rem] px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-[color:var(--surface-soft-strong)] text-foreground shadow-[var(--shadow-soft)] ring-1 ring-black/5'
                  : 'text-muted-foreground hover:bg-[color:var(--surface-soft)] hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-[1rem] border transition-colors',
                  isActive
                    ? 'border-primary/15 bg-primary/10 text-primary'
                    : 'border-transparent bg-secondary/70 text-muted-foreground group-hover:border-black/5 group-hover:bg-[color:var(--surface-soft-strong)]'
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {isReminder && unreadCount > 0 && (
                <Badge className="min-h-5 min-w-5 rounded-full border border-primary/10 bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              {isActive && <span className="h-2 w-2 rounded-full bg-primary/80" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border/80 px-4 py-4">
        <Link
          href={guideHref}
          className={cn(
            'group mb-3 flex items-start gap-3 rounded-[1.3rem] border px-4 py-3 transition-all',
            guideActive
              ? 'border-black/5 bg-[color:var(--surface-soft-strong)] text-foreground shadow-[var(--shadow-soft)]'
              : 'border-white/80 bg-[color:var(--surface-soft)] text-foreground/80 hover:border-black/5 hover:bg-[color:var(--surface-soft-strong)] hover:text-foreground'
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border transition-colors',
              guideActive
                ? 'border-primary/15 bg-primary/10 text-primary'
                : 'border-transparent bg-secondary/70 text-muted-foreground group-hover:border-black/5 group-hover:bg-[color:var(--surface-soft-strong)]'
            )}
          >
            <BookOpenText className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">产品说明</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              用非技术语言解释系统在做什么、为什么这样设计，以及当前版本重点是什么。
            </span>
          </span>
        </Link>

        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 rounded-[1.2rem] px-4 text-muted-foreground hover:bg-[color:var(--surface-soft)] hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </form>
      </div>
    </aside>
  )
}
