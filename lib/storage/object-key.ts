function stripExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0) {
    return {
      base: fileName,
      extension: '',
    }
  }

  return {
    base: fileName.slice(0, lastDot),
    extension: fileName.slice(lastDot + 1),
  }
}

export function sanitizeStorageFileName(fileName: string) {
  const { base, extension } = stripExtension(fileName.trim())

  const normalizedBase = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[._-]{2,}/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .toLowerCase()

  const normalizedExtension = extension
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase()

  const safeBase = !normalizedBase
    ? 'audio'
    : /^\d/.test(normalizedBase)
      ? `audio-${normalizedBase}`
      : normalizedBase
  return normalizedExtension ? `${safeBase}.${normalizedExtension}` : safeBase
}

export function buildAudioStorageObjectKey(params: {
  userId: string
  profileId: string
  originalFileName: string
  timestamp?: number
}) {
  const safeFileName = sanitizeStorageFileName(params.originalFileName)
  const timestamp = params.timestamp ?? Date.now()

  return `${params.userId}/${params.profileId}/${timestamp}-${safeFileName}`
}
