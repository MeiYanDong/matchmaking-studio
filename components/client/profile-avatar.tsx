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
  className = 'h-16 w-16 overflow-hidden rounded-full border border-border/80 bg-white shadow-[0_14px_28px_-20px_rgba(15,23,42,0.16)]',
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
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-[#f8fbff] via-white to-[#f3f6fb]`}>
      <div className="flex flex-col items-center gap-1 text-center">
        <User className={iconClassName} />
        {fallbackLabel ? <span className="px-2 text-[10px] text-muted-foreground">{fallbackLabel}</span> : null}
      </div>
    </div>
  )
}
