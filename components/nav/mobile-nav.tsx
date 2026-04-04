'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getNavItems, type AppRole } from '@/components/nav/nav-config'
import { BookOpenText } from 'lucide-react'

type MobileNavProps = {
  role: AppRole
  unreadCount?: number
}

export function MobileNav({ role, unreadCount = 0 }: MobileNavProps) {
  const pathname = usePathname()
  const navItems = getNavItems(role)
  const guideHref = role === 'admin' ? '/admin/guide' : '/matchmaker/guide'
  const guideActive = pathname.startsWith(guideHref)

  return (
    <div className="border-b border-border/70 bg-background/74 px-4 pb-4 supports-backdrop-filter:backdrop-blur-2xl lg:hidden">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          const isReminder = item.href.includes('reminders')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-max items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all',
                isActive
                  ? 'border-primary/10 bg-primary text-white shadow-[var(--shadow-primary)]'
                  : 'border-border/80 bg-[color:var(--surface-soft-strong)] text-foreground/75'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {isReminder && unreadCount > 0 ? (
                <Badge className={cn(
                  'min-h-5 min-w-5 rounded-full border px-1.5 py-0.5 text-[10px]',
                  isActive
                    ? 'border-white/20 bg-white/15 text-white'
                    : 'border-primary/10 bg-primary/8 text-primary'
                )}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              ) : null}
            </Link>
          )
        })}
        <Link
          href={guideHref}
              className={cn(
              'flex min-w-max items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all',
              guideActive
                ? 'border-primary/10 bg-primary text-white shadow-[var(--shadow-primary)]'
                : 'border-border/80 bg-[color:var(--surface-soft-strong)] text-foreground/75'
            )}
          >
          <BookOpenText className="h-4 w-4" />
          <span>产品说明</span>
        </Link>
      </div>
    </div>
  )
}
