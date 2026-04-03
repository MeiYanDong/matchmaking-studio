export function extractBucketObjectPath(source: string | null | undefined, bucketName: string) {
  const trimmed = source?.trim()
  if (!trimmed) return null

  const decoded = decodeURIComponent(trimmed)
  const normalized = decoded.replace(/^\/+/, '')
  const bucketPrefix = `${bucketName}/`

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized)
      const match = url.pathname.match(
        new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${bucketName}/(.+)$`)
      )

      return match?.[1] ?? null
    } catch {
      return null
    }
  }

  if (normalized.startsWith(bucketPrefix)) {
    return normalized.slice(bucketPrefix.length)
  }

  return normalized
}
