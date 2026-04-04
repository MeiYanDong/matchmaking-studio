import type { ReactNode } from "react"

import { EmptyState, PageHeader } from "@/components/app-primitives"
import { cn } from "@/lib/utils"

type CollectionPageTemplateProps = {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
  filters?: ReactNode
  heroFooter?: ReactNode
  children: ReactNode
  emptyState?: {
    title: string
    description: string
    action?: ReactNode
  } | null
  isEmpty?: boolean
  className?: string
}

export function CollectionPageTemplate({
  eyebrow,
  title,
  description,
  actions,
  filters,
  heroFooter,
  children,
  emptyState,
  isEmpty = false,
  className,
}: CollectionPageTemplateProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <section className="surface-hero rounded-[2rem] border border-border/80 px-6 py-7 sm:px-8">
        <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
        {filters ? <div className="mt-6 flex flex-wrap gap-2">{filters}</div> : null}
        {heroFooter ? <div className="mt-5">{heroFooter}</div> : null}
      </section>

      {isEmpty && emptyState ? (
        <EmptyState title={emptyState.title} description={emptyState.description} action={emptyState.action} />
      ) : (
        children
      )}
    </div>
  )
}
