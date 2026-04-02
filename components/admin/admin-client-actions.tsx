'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { rerunMatchingForProfile } from '@/actions/matching'

interface AdminClientActionsProps {
  profileId: string
  currentMatchmakerId: string
  matchmakers: { id: string; name: string }[]
}

export function AdminClientActions({ profileId, currentMatchmakerId, matchmakers }: AdminClientActionsProps) {
  const [selected, setSelected] = useState(currentMatchmakerId)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [rematching, setRematching] = useState(false)
  const router = useRouter()

  async function handleReassign() {
    if (selected === currentMatchmakerId) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ matchmaker_id: selected }).eq('id', profileId)
    if (error) {
      toast.error('重新分配失败')
    } else {
      toast.success('已重新分配红娘')
      setOpen(false)
      router.refresh()
    }
    setSaving(false)
  }

  async function handleRematch() {
    setRematching(true)
    try {
      const result = await rerunMatchingForProfile(profileId)
      toast.success(`已重跑匹配，刷新 ${result.matched} 条记录`)
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setRematching(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selected} onValueChange={(value) => value && setSelected(value)}>
        <SelectTrigger className="h-7 text-xs w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {matchmakers.map(m => (
            <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected !== currentMatchmakerId && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger
            render={<Button size="sm" className="h-7 text-xs bg-rose-500 hover:bg-rose-600" disabled={saving} />}
          >
            确认
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认重新分配红娘？</AlertDialogTitle>
              <AlertDialogDescription>
                分配后，该客户后续的新录音、提醒和默认跟进责任都会归属到新的红娘名下。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleReassign}>确认分配</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleRematch} disabled={rematching}>
        {rematching ? '重跑中...' : '重跑匹配'}
      </Button>
    </div>
  )
}
