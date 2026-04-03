import { Sidebar } from '@/components/nav/sidebar'
import { TopContextBar } from '@/components/nav/top-context-bar'
import { AssistRail } from '@/components/nav/assist-rail'
import { MobileNav } from '@/components/nav/mobile-nav'

type WorkspaceShellProps = {
  role: 'matchmaker' | 'admin'
  displayName: string
  unreadCount?: number
  children: React.ReactNode
}

export function WorkspaceShell({
  role,
  displayName,
  unreadCount = 0,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,rgba(203,168,141,0.12),transparent_26%),linear-gradient(180deg,#fcf8f1,#f5efe7_55%,#f8f3ec)] text-foreground">
      <Sidebar role={role} displayName={displayName} unreadCount={unreadCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopContextBar role={role} displayName={displayName} unreadCount={unreadCount} />
        <MobileNav role={role} unreadCount={unreadCount} />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[1560px] px-4 pb-10 pt-5 sm:px-5 xl:px-8">
              {children}
            </div>
          </main>
          <AssistRail role={role} displayName={displayName} unreadCount={unreadCount} />
        </div>
      </div>
    </div>
  )
}
