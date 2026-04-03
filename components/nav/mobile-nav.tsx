'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getNavItems, type AppRole } from '@/components/nav/nav-config'

type MobileNavProps = {
  role: AppRole
  unreadCount?: number
}

export function MobileNav({ role, unreadCount = 0 }: MobileNavProps) {
  const pathname = usePathname()
  const navItems = getNavItems(role)

  return (
    <div className="border-b border-black/5 bg-[linear-gradient(180deg,rgba(252,248,241,0.98),rgba(250,244,236,0.94))] px-4 pb-4 lg:hidden">
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
                  ? 'border-[#8f3c32] bg-[#8f3c32] text-white shadow-[0_18px_40px_-26px_rgba(143,60,50,0.7)]'
                  : 'border-[#ddcbbb] bg-white/85 text-[#5d493d]'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {isReminder && unreadCount > 0 ? (
                <Badge className={cn(
                  'min-h-5 min-w-5 rounded-full border px-1.5 py-0.5 text-[10px]',
                  isActive
                    ? 'border-white/20 bg-white/15 text-white'
                    : 'border-[#e3d0bf] bg-[#fff3e9] text-[#8f3c32]'
                )}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              ) : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
