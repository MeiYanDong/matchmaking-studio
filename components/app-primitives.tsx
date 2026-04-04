import type { ReactNode } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
            {eyebrow}
          </div>
        ) : null}
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-medium tracking-[-0.05em] text-balance text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            {description}
          </p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint: string
  tone?: "default" | "success" | "warning" | "danger"
}) {
  const toneClass =
    tone === "success"
      ? "theme-status-success"
      : tone === "warning"
        ? "theme-status-warning"
        : tone === "danger"
          ? "theme-status-danger"
          : "bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,245,251,0.9))] text-foreground"

  return (
    <Card className={cn("overflow-hidden border-transparent", tone === "default" && "border-border/80")}>
      <CardContent className={cn("rounded-[inherit] px-5 py-5", toneClass)}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{value}</div>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function StatusBadge({
  ok,
  label,
  hint,
}: {
  ok: boolean
  label: string
  hint: string
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/80 bg-[color:var(--surface-soft)] p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            ok
              ? "bg-[color:var(--success-soft)] text-[color:var(--success-foreground)]"
              : "bg-[color:var(--danger-soft)] text-[color:var(--danger-foreground)]"
          )}
        >
          {ok ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        </span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{label}</div>
            <Badge variant={ok ? "secondary" : "destructive"}>{ok ? "正常" : "关注"}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">{hint}</div>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-[1.7rem] border border-dashed border-border surface-empty px-6 py-8 text-center",
        compact ? "py-6" : "py-10"
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full surface-contrast text-primary shadow-sm">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function QuickLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-[1.35rem] border border-border/80 bg-[color:var(--surface-soft)] px-4 py-4 transition hover:-translate-y-0.5 hover:bg-[color:var(--surface-soft-strong)]"
    >
      <div>
        <div className="font-medium">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
    </Link>
  )
}
