import { Bell, Heart, LayoutDashboard, Shuffle, UserCog, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type AppRole = 'matchmaker' | 'admin'

export interface NavItemConfig {
  href: string
  label: string
  icon: LucideIcon
}

const MATCHMAKER_NAV: NavItemConfig[] = [
  { href: '/matchmaker/clients', label: '我的客户', icon: Users },
  { href: '/matchmaker/matches', label: '匹配工作台', icon: Heart },
  { href: '/matchmaker/reminders', label: '提醒中心', icon: Bell },
]

const ADMIN_NAV: NavItemConfig[] = [
  { href: '/admin/dashboard', label: '总览看板', icon: LayoutDashboard },
  { href: '/admin/clients', label: '用户管理', icon: Users },
  { href: '/admin/matchmakers', label: '红娘管理', icon: UserCog },
  { href: '/admin/matches', label: '匹配管理', icon: Shuffle },
]

export function getNavItems(role: AppRole) {
  return role === 'admin' ? ADMIN_NAV : MATCHMAKER_NAV
}
