import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; password?: string }>
}) {
  const params = await searchParams

  return (
    <LoginForm
      initialEmail={params.email ?? ''}
      initialPassword={params.password ?? ''}
    />
  )
}
