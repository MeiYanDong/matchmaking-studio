import { PageHeader, SectionCard } from '@/components/app-primitives'
import { NewClientForm } from '@/components/client/new-client-form'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowLeft, AudioLines, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="surface-hero rounded-[2rem] border border-border/80 px-6 py-7 sm:px-8">
        <PageHeader
          eyebrow="Draft Client"
          title="新增客户"
          description="先创建最少上下文的草稿客户，再上传第一段录音，让 AI 自动补齐大部分字段。这里不追求一次填满，而是先把客户锚点和录音归属建立起来。"
          actions={
            <Link
              href="/matchmaker/clients"
              className={cn(buttonVariants({ variant: 'outline' }), 'rounded-full')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回客户列表
            </Link>
          }
        />
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            草稿建档
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            录音优先补齐
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            不改变当前工作流
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <SectionCard
          title="基础信息"
          description="先填写识别和归属所需的最小信息。姓名、联系方式、备注都可以在后续继续完善。"
          className="border-border/80"
        >
          <NewClientForm />
        </SectionCard>

        <div className="space-y-4">
          <Card className="border-border/80">
            <CardContent className="space-y-4 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="surface-contrast flex h-10 w-10 items-center justify-center rounded-2xl text-primary shadow-sm">
                  <AudioLines className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">创建后下一步</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    系统会直接带你进入上传录音页。第一段录音优先帮助 AI 自动补齐年龄、城市、学历、职业、婚恋意图等关键信息。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="space-y-4 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="surface-contrast flex h-10 w-10 items-center justify-center rounded-2xl text-primary shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">建议先填什么</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    只需要确保客户归属清楚即可。姓名可暂不完整，联系方式和备注更适合记录红娘当前掌握的线索与来源。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-soft border-border/70">
            <CardContent className="space-y-3 px-5 py-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                当前页面原则
              </div>
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                <li>先建立客户，再让录音和后续建档有明确归属。</li>
                <li>不要求一次填全，先建立最小可持续更新的客户锚点。</li>
                <li>创建成功后继续走上传录音，不改变当前工作流。</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
