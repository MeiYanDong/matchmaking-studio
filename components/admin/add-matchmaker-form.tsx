'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { LoaderCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function AddMatchmakerForm() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/matchmakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName: name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '创建失败')
      }
      const data = await res.json()
      toast.success(`红娘 ${name} 创建成功`)
      setTempPassword(data.tempPassword ?? '')
      setEmail('')
      setName('')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-rose-500 hover:bg-rose-600 gap-2">
        <Plus className="w-4 h-4" />新增红娘
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增红娘账号</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="红娘姓名" required />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="登录邮箱" required />
            </div>
            {tempPassword && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                初始密码：<span className="font-semibold">{tempPassword}</span>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setTempPassword('') }}>取消</Button>
              <Button type="submit" disabled={loading} className="bg-rose-500 hover:bg-rose-600">
                {loading && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? '创建中...' : '创建账号'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
