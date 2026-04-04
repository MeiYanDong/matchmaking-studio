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
  className = 'h-16 w-16 rounded-full overflow-hidden border border-[#eadfce] bg-white shadow-sm',
  imageClassName = 'h-full w-full object-cover',
  iconClassName = 'h-6 w-6 text-[#b87e74]',
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
    <div className={`${className} flex items-center justify-center bg-gradient-to-br from-[#fff5f4] via-[#fffaf7] to-[#f7ede7]`}>
      <div className="flex flex-col items-center gap-1 text-center">
        <User className={iconClassName} />
        {fallbackLabel ? <span className="px-2 text-[10px] text-[#9a7c69]">{fallbackLabel}</span> : null}
      </div>
    </div>
  )
}
