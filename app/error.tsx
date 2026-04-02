'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-rose-50 px-4">
      <div className="max-w-md w-full rounded-3xl border bg-white p-8 shadow-lg text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">页面暂时出了点问题</h1>
          <p className="text-sm text-gray-500 mt-2">
            我们已经捕获到这次异常。你可以先重试当前操作，如果仍然失败，再回到上一页继续处理。
          </p>
        </div>
        <Button onClick={reset} className="bg-rose-500 hover:bg-rose-600">
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    </div>
  )
}
