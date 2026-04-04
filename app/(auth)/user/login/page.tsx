import { LoginForm } from '@/components/auth/login-form'

export default async function UserLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; password?: string }>
}) {
  const params = await searchParams

  return (
    <LoginForm
      title="用户登录"
      description="登录后查看自己的资料卡，并用自然语言筛选推荐对象"
      initialEmail={params.email ?? ''}
      initialPassword={params.password ?? ''}
    />
  )
}
