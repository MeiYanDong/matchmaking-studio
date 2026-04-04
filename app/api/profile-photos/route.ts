import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractBucketObjectPath } from '@/lib/storage/object-path'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif']

function json(message: string, status: number) {
  return Response.json({ success: false, message }, { status })
}

function sanitizeFileName(fileName: string) {
  const [baseName = 'image', extension = 'jpg'] = fileName.split(/\.(?=[^.]+$)/)
  const safeBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'image'

  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 8) || 'jpg'

  return `${safeBaseName}.${safeExtension}`
}

function isSupportedImage(file: File) {
  if (file.type.startsWith('image/')) {
    return true
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  return !!extension && SUPPORTED_IMAGE_EXTENSIONS.includes(extension)
}

async function removeStoredPhotos(paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (uniquePaths.length === 0) return

  const serviceRoleClient = createServiceRoleClient()
  const { error } = await withSupabaseRetry(
    () => serviceRoleClient.storage.from('profile-photos').remove(uniquePaths),
    { label: 'profile photo cleanup' }
  )

  if (error) {
    console.warn('[profile-photos] failed to cleanup replaced photos', { uniquePaths, error })
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return json('未登录', 401)
  }

  const formData = await request.formData()
  const profileId = String(formData.get('profileId') ?? '').trim()
  const kind = String(formData.get('kind') ?? '').trim()
  const file = formData.get('file')

  if (!profileId) {
    return json('缺少客户 ID', 400)
  }

  if (kind !== 'avatar' && kind !== 'lifestyle') {
    return json('上传类型无效', 400)
  }

  if (!(file instanceof File)) {
    return json('未读取到图片文件', 400)
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return json('图片大小需要控制在 10MB 以内', 400)
  }

  if (!isSupportedImage(file)) {
    return json('仅支持 JPG、PNG、WEBP、HEIC、AVIF 等常见图片格式', 400)
  }

  const [{ data: roleData }, { data: profile, error: profileError }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'profile photo role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient
        .from('profiles')
        .select('id, name, matchmaker_id, avatar_url, lifestyle_photo_urls')
        .eq('id', profileId)
        .maybeSingle(),
      { label: 'profile photo profile query' }
    ),
  ])

  if (profileError) {
    return json(profileError.message, 500)
  }

  if (!profile) {
    return json('客户不存在', 404)
  }

  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) {
    return json('你只能给自己上传的客户添加照片', 403)
  }

  const safeFileName = sanitizeFileName(file.name)
  const objectPath = `${user.id}/${profileId}/${kind}/${Date.now()}-${safeFileName}`
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await withSupabaseRetry(
    () =>
      serviceRoleClient.storage.from('profile-photos').upload(objectPath, fileBuffer, {
        contentType: file.type || undefined,
        upsert: false,
      }),
    { label: 'profile photo upload' }
  )

  if (uploadError) {
    return json(uploadError.message, 500)
  }

  const {
    data: { publicUrl },
  } = serviceRoleClient.storage.from('profile-photos').getPublicUrl(objectPath)

  if (kind === 'avatar') {
    const previousAvatarPath = extractBucketObjectPath(profile.avatar_url, 'profile-photos')

    const { error: updateError } = await withSupabaseRetry(
      () => serviceRoleClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', profileId),
      { label: 'profile avatar update' }
    )

    if (updateError) {
      return json(updateError.message, 500)
    }

    if (previousAvatarPath) {
      await removeStoredPhotos([previousAvatarPath])
    }

    return Response.json({
      success: true,
      kind,
      photoUrl: publicUrl,
    })
  }

  const nextLifestylePhotos = [...new Set([...(profile.lifestyle_photo_urls ?? []), publicUrl])]

  const { error: updateError } = await withSupabaseRetry(
    () =>
      serviceRoleClient
        .from('profiles')
        .update({ lifestyle_photo_urls: nextLifestylePhotos })
        .eq('id', profileId),
    { label: 'profile lifestyle photos update' }
  )

  if (updateError) {
    return json(updateError.message, 500)
  }

  return Response.json({
    success: true,
    kind,
    photoUrl: publicUrl,
    lifestylePhotoUrls: nextLifestylePhotos,
  })
}
