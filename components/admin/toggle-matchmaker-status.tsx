'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ToggleMatchmakerStatusProps {
  userId: string
  disabled: boolean
}

export function ToggleMatchmakerStatus({ userId, disabled }: ToggleMatchmakerStatusProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleToggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/matchmakers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, disabled: !disabled }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')

      toast.success(!disabled ? '红娘账号已禁用' : '红娘账号已启用')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={disabled ? 'default' : 'outline'}
      onClick={handleToggle}
      disabled={loading}
      className={disabled ? 'bg-green-600 hover:bg-green-700' : ''}
    >
      {loading ? '处理中...' : disabled ? '启用' : '禁用'}
    </Button>
  )
}
