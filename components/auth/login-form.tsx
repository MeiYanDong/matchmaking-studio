'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { AudioLines, DatabaseZap, HeartHandshake, LoaderCircle, ShieldCheck } from 'lucide-react'

interface LoginFormProps {
  title?: string
  description?: string
}

const loginSchema = z.object({
  email: z.string().email('请输入正确的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
})

export function LoginForm({
  title = 'Matchmaking Studio',
  description = '请登录您的账号',
}: LoginFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function handleLogin(values: z.infer<typeof loginSchema>) {
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword(values)

      if (error) throw error

      if (!data.user) {
        throw new Error('登录失败，请稍后重试')
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (roleData?.role === 'admin') {
        router.push('/admin/dashboard')
      } else if (roleData?.role === 'matchmaker') {
        router.push('/matchmaker/clients')
      } else {
        router.push('/user/me')
      }

      router.refresh()
    } catch (err) {
      toast.error('登录失败：' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="让录音先完成建档，让红娘把精力留给真正重要的判断。"
      description="这套系统面向红娘和婚恋服务机构，不要求客户自己操作，也不要求红娘先填大表单。上传录音后，系统会逐步完成转录、结构化提取、档案更新和后续补问建议。"
      highlights={[
        '录音先入库，再转成文字稿，避免重复回听和反复整理资料。',
        '系统自动把明确事实写入客户档案，红娘只处理冲突、异常和待确认项。',
        '客户信息会随着每次沟通持续更新，不再停留在一次性表单和零散聊天记录里。',
      ]}
      footer="当前版本最优先保证上传录音、转录、结构化提取和写入数据库这条核心工作流。"
      panel={
        <Card className="border-white/70 bg-[color:var(--surface-soft-strong)] shadow-none">
          <CardHeader className="space-y-4 px-0 pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-[color:var(--surface-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/80" />
                登录工作台
              </span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-[1.85rem] font-medium tracking-[-0.04em]">{title}</CardTitle>
              <CardDescription className="max-w-md text-sm leading-7">{description}</CardDescription>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-border/70 bg-[color:var(--surface-soft)] p-3">
                <AudioLines className="h-4 w-4 text-primary" />
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">录音上传</p>
                <p className="mt-2 text-sm text-foreground/80">先存档，再进入后续处理。</p>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-[color:var(--surface-soft)] p-3">
                <DatabaseZap className="h-4 w-4 text-primary" />
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">自动建档</p>
                <p className="mt-2 text-sm text-foreground/80">系统自动整理明确事实字段。</p>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-[color:var(--surface-soft)] p-3">
                <HeartHandshake className="h-4 w-4 text-primary" />
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">红娘推进</p>
                <p className="mt-2 text-sm text-foreground/80">把时间留给补问、判断和推进。</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="请输入邮箱地址" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="请输入密码" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? '登录中...' : '进入工作台'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      }
    />
  )
}
