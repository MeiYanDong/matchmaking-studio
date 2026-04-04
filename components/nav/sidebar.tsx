'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/actions/auth'
import {
  BookOpenText,
  LogOut,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Heart } from 'lucide-react'
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
    <aside className="hidden min-h-screen w-[292px] shrink-0 flex-col border-r border-white/8 bg-[linear-gradient(180deg,#221815,#2c1c17_46%,#1d1512)] text-[#f5ece3] shadow-[0_32px_80px_-48px_rgba(15,23,42,0.8)] lg:flex">
      <div className="border-b border-white/8 px-6 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(162,73,61,0.94),rgba(113,49,41,0.92))] shadow-[0_18px_32px_-18px_rgba(120,53,43,0.85)]">
            <Heart className="h-4 w-4 fill-current text-[#fbf4eb]" />
          </div>
          <div>
            <div className="font-heading text-lg text-[#f8efe6]">Matchmaking Studio</div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#bfa38f]">Private Matchmaking Office</p>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-white/8 bg-white/6 p-4">
          <p className="text-sm font-medium text-[#f5ece3]">{displayName}</p>
          <p className="mt-1 text-xs text-[#bfa38f]">{role === 'admin' ? '管理员视角 · 治理与漏斗' : '红娘视角 · 客户推进与补问'}</p>
        </div>
      </div>

      <div className="px-6 pt-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f7462]">
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
                'group flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/10 text-[#fff4ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_-26px_rgba(0,0,0,0.6)]'
                  : 'text-[#d9c7ba] hover:bg-white/6 hover:text-[#fff4ea]'
              )}
            >
              <span className={cn(
                'flex h-9 w-9 items-center justify-center rounded-[14px] border transition-colors',
                isActive
                  ? 'border-white/10 bg-white/10'
                  : 'border-white/6 bg-black/10 group-hover:border-white/10 group-hover:bg-white/5'
              )}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {isReminder && unreadCount > 0 && (
                <Badge className="min-h-5 min-w-5 rounded-full border border-white/10 bg-[#a2493d] px-1.5 py-0.5 text-xs text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
              {isActive && <span className="h-2 w-2 rounded-full bg-[#f6d3b7]" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/8 px-4 py-4">
        <Link
          href={guideHref}
          className={cn(
            'group mb-3 flex items-start gap-3 rounded-[20px] border px-4 py-3 transition-all',
            guideActive
              ? 'border-white/12 bg-white/10 text-[#fff4ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_40px_-26px_rgba(0,0,0,0.6)]'
              : 'border-white/8 bg-white/6 text-[#ddccbf] hover:border-white/12 hover:bg-white/8 hover:text-[#fff4ea]'
          )}
        >
          <span className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border transition-colors',
            guideActive
              ? 'border-white/10 bg-white/10'
              : 'border-white/6 bg-black/10 group-hover:border-white/10 group-hover:bg-white/5'
          )}>
            <BookOpenText className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">产品说明</span>
            <span className="mt-1 block text-xs leading-5 text-[#bfa38f]">
              用非技术语言解释系统在做什么、为什么这样设计，以及当前版本重点是什么。
            </span>
          </span>
        </Link>

        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 rounded-[18px] px-4 text-[#d9c7ba] hover:bg-white/6 hover:text-[#fff4ea]"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </form>
      </div>
    </aside>
  )
}
