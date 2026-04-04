import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"

type WorkspaceDetailTemplateProps = {
  backHref: string
  backLabel: string
  hero: ReactNode
  main: ReactNode
  aside?: ReactNode
  className?: string
}

export function WorkspaceDetailTemplate({
  backHref,
  backLabel,
  hero,
  main,
  aside,
  className,
}: WorkspaceDetailTemplateProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {hero}

      <div className={cn("grid gap-6", aside ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1")}>
        <div className="min-w-0">{main}</div>
        {aside ? <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">{aside}</aside> : null}
      </div>
    </div>
  )
}
