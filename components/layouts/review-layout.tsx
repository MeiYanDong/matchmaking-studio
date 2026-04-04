import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { PageHeader } from "@/components/app-primitives"

type ReviewLayoutProps = {
  backHref: string
  backLabel: string
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
  content: ReactNode
}

export function ReviewLayout({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  actions,
  content,
}: ReviewLayoutProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-5 sm:px-5 xl:px-0">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <section className="surface-hero rounded-[2rem] border border-border/80 px-6 py-7 sm:px-8">
        <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      </section>
      <section className="rounded-[1.9rem] border border-border/80 bg-[color:var(--surface-soft-strong)] p-5 shadow-[var(--shadow-soft)] md:p-6">
        {content}
      </section>
    </div>
  )
}
