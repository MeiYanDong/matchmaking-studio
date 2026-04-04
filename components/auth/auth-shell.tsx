"use client"

import Image from "next/image"
import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"

type AuthShellProps = {
  eyebrow?: string
  title: string
  description: string
  highlights: string[]
  panel: ReactNode
  footer?: ReactNode
}

export function AuthShell({
  eyebrow = "Matchmaking Studio",
  title,
  description,
  highlights,
  panel,
  footer,
}: AuthShellProps) {
  return (
    <div className="theme-auth-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1320px] overflow-hidden rounded-[2rem] border border-white/60 theme-auth-frame lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex flex-col justify-between border-b border-border/70 px-6 py-7 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
          <div>
            <div className="flex items-center gap-4">
              <div className="theme-brand-badge flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/70">
                <Image src="/brand/logo-mark.svg" alt="Matchmaking Studio" width={42} height={42} />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                  {eyebrow}
                </div>
                <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
                  AI-first Matchmaking Workspace
                </div>
              </div>
            </div>

            <div className="mt-12 max-w-xl">
              <Badge className="border-border/70 bg-[color:var(--surface-soft-strong)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                产品说明
              </Badge>
              <h1 className="mt-5 font-heading text-4xl leading-tight tracking-[-0.05em] text-foreground sm:text-5xl">
                {title}
              </h1>
              <p className="mt-5 text-base leading-8 text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            {highlights.map((item, index) => (
              <div
                key={item}
                className="flex gap-4 rounded-[1.4rem] border border-white/70 bg-[color:var(--surface-soft-strong)] px-4 py-4 shadow-[var(--shadow-soft)]"
              >
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {index + 1}
                </span>
                <p className="text-sm leading-7 text-foreground/80">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
          <div className="theme-auth-panel w-full rounded-[1.9rem] border border-white/70 p-5 shadow-[var(--shadow-strong)] sm:p-7">
            {panel}
          </div>
        </section>
      </div>
      {footer ? <div className="mx-auto mt-4 max-w-[1320px] px-2 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  )
}
