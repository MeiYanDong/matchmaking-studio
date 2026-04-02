'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/actions/auth'
import {
  Users, Heart, Bell, LayoutDashboard,
  LogOut, UserCog, Shuffle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const matchmakerNav: NavItem[] = [
  { href: '/matchmaker/clients', label: '我的客户', icon: <Users className="w-4 h-4" /> },
  { href: '/matchmaker/matches', label: '匹配工作台', icon: <Heart className="w-4 h-4" /> },
  { href: '/matchmaker/reminders', label: '提醒中心', icon: <Bell className="w-4 h-4" /> },
]

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: '总览看板', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/admin/clients', label: '用户管理', icon: <Users className="w-4 h-4" /> },
  { href: '/admin/matchmakers', label: '红娘管理', icon: <UserCog className="w-4 h-4" /> },
  { href: '/admin/matches', label: '匹配管理', icon: <Shuffle className="w-4 h-4" /> },
]

interface SidebarProps {
  role: 'matchmaker' | 'admin'
  displayName: string
  unreadCount?: number
}

export function Sidebar({ role, displayName, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const navItems = role === 'admin' ? adminNav : matchmakerNav

  return (
    <div className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
          <Heart className="w-4 h-4 text-white fill-white" />
        </div>
        <span className="font-bold text-gray-900">婚恋匹配平台</span>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900">{displayName}</p>
        <p className="text-xs text-gray-500">{role === 'admin' ? '管理员' : '红娘'}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const isReminder = item.href.includes('reminders')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isReminder && unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-600 hover:text-gray-900"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </Button>
        </form>
      </div>
    </div>
  )
}
