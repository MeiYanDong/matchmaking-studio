'use client'

import { useEffect } from 'react'

function isExtensionOriginError(input: unknown) {
  if (!input) {
    return false
  }

  const candidate =
    input instanceof Error
      ? `${input.name}: ${input.message}\n${input.stack ?? ''}`
      : typeof input === 'string'
        ? input
        : JSON.stringify(input)

  return (
    candidate.includes('Origin not allowed') &&
    (candidate.includes('chrome-extension://') ||
      candidate.includes('moz-extension://') ||
      candidate.includes('safari-web-extension://'))
  )
}

export function ExtensionErrorGuard() {
  useEffect(() => {
    function handleRejection(event: PromiseRejectionEvent) {
      if (!isExtensionOriginError(event.reason)) {
        return
      }

      event.preventDefault()
      event.stopImmediatePropagation()
    }

    function handleError(event: ErrorEvent) {
      const combined = `${event.message}\n${event.filename}\n${event.error?.stack ?? ''}`
      if (!isExtensionOriginError(combined)) {
        return
      }

      event.preventDefault()
      event.stopImmediatePropagation()
    }

    window.addEventListener('unhandledrejection', handleRejection, true)
    window.addEventListener('error', handleError, true)

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection, true)
      window.removeEventListener('error', handleError, true)
    }
  }, [])

  return null
}
