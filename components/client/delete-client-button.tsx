'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { deleteClientProfile } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DeleteClientButtonProps {
  profileId: string
  profileName: string
}

export function DeleteClientButton({ profileId, profileName }: DeleteClientButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)

    try {
      const result = await deleteClientProfile(profileId)
      setOpen(false)

      if (result.cleanupWarnings.length > 0) {
        toast.warning(`已删除“${result.deletedName}”，但有部分附件未能立即清理。`)
      } else {
        toast.success(`已删除客户“${result.deletedName}”`)
      }

      router.push('/matchmaker/clients')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败，请稍后重试。')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={(
          <Button
            variant="destructive"
            className="h-11 rounded-[18px] px-4"
            disabled={deleting}
          />
        )}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        删除客户
      </AlertDialogTrigger>
      <AlertDialogContent className="border border-border/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(246,249,253,0.98))] text-foreground shadow-[0_32px_80px_-40px_rgba(15,23,42,0.24)]">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <TriangleAlert className="h-5 w-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>确认删除“{profileName}”？</AlertDialogTitle>
          <AlertDialogDescription className="leading-7 text-muted-foreground">
            这会一起删除该客户的录音、匹配、提醒、补问任务和字段历史。删除后无法恢复，请确认这名客户确实不再需要保留。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-border/80 bg-muted/30">
          <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            variant="destructive"
          >
            {deleting ? '删除中...' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
