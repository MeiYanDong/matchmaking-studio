'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { Heart, LoaderCircle } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="请输入邮箱" {...field} />
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
                      <Input type="password" placeholder="请输入密码" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600" disabled={loading}>
                {loading && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
