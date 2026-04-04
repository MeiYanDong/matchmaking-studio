import { User } from 'lucide-react'

interface ProfileAvatarProps {
  name: string
  avatarUrl?: string | null
  className?: string
  imageClassName?: string
  iconClassName?: string
  fallbackLabel?: string
}

export function ProfileAvatar({
  name,
  avatarUrl,
  className = 'h-16 w-16 overflow-hidden rounded-full border border-border/80 bg-[color:var(--surface-soft-strong)] shadow-[0_14px_28px_-20px_rgba(15,23,42,0.16)] dark:shadow-[0_20px_40px_-26px_rgba(0,0,0,0.56)]',
  imageClassName = 'h-full w-full object-cover',
  iconClassName = 'h-6 w-6 text-primary/70',
  fallbackLabel,
}: ProfileAvatarProps) {
  if (avatarUrl) {
    return (
      <div className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt={`${name} 头像`} className={imageClassName} />
      </div>
    )
  }

  return (
    <div className={`${className} flex items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(11,99,246,0.08),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,246,251,0.94))] dark:bg-[radial-gradient(circle_at_top_left,rgba(114,168,255,0.16),transparent_45%),linear-gradient(180deg,rgba(18,25,35,0.98),rgba(11,16,23,0.94))]`}>
      <div className="flex flex-col items-center gap-1 text-center">
        <User className={iconClassName} />
        {fallbackLabel ? <span className="px-2 text-[10px] text-muted-foreground dark:text-foreground/58">{fallbackLabel}</span> : null}
      </div>
    </div>
  )
}
