'use client'

import { type DragEvent as ReactDragEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Mic, UploadCloud } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Step = 'idle' | 'uploading' | 'transcribing' | 'done' | 'error'

type UploadPayload = {
  ok: true
  conversation: {
    id: string
    profileId: string
    status: string
  }
  audio: {
    bucket: string
    region: string
    key: string
    mimeType: string
    sizeBytes: number
    etag: string
    signedUrl: string
  }
}

type TranscribePayload = {
  ok: true
  conversation: {
    id: string
    status: string
    transcript: string
    audioKey: string
    signedUrl: string
  }
}

type ErrorPayload = {
  error?: string
}

const STEP_LABELS: Record<Step, string> = {
  idle: '选择一段音频开始测试',
  uploading: '正在上传到 COS',
  transcribing: 'Groq 正在转录',
  done: '转录完成',
  error: '处理失败',
}

export function AudioTranscribeLab({
  profileId,
  profileName,
  backHref = '/agent-poc/clients',
}: {
  profileId: string
  profileName: string
  backHref?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')
  const [uploadResult, setUploadResult] = useState<UploadPayload | null>(null)
  const [transcribeResult, setTranscribeResult] = useState<TranscribePayload | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragDepth, setDragDepth] = useState(0)

  useEffect(() => {
    function preventWindowFileDrop(event: globalThis.DragEvent) {
      event.preventDefault()
    }

    window.addEventListener('dragover', preventWindowFileDrop)
    window.addEventListener('drop', preventWindowFileDrop)

    return () => {
      window.removeEventListener('dragover', preventWindowFileDrop)
      window.removeEventListener('drop', preventWindowFileDrop)
    }
  }, [])

  function handleSelectedFile(nextFile: File | null) {
    setFile(nextFile)
    if (nextFile) {
      setError('')
      setStep('idle')
    }
  }

  function handleDragEnter(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragDepth((current) => current + 1)
    setIsDragging(true)
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragDepth((current) => {
      const nextDepth = Math.max(0, current - 1)
      if (nextDepth === 0) {
        setIsDragging(false)
      }
      return nextDepth
    })
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragDepth(0)
    setIsDragging(false)
    handleSelectedFile(event.dataTransfer.files?.[0] || null)
  }

  async function handleRun() {
    if (!file) {
      setError('请先选择一段音频')
      setStep('error')
      return
    }

    setError('')
    setUploadResult(null)
    setTranscribeResult(null)
    setStep('uploading')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('profileId', profileId)

      const uploadResponse = await fetch('/api/agent-poc/audio/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadPayload = (await uploadResponse.json()) as UploadPayload | ErrorPayload
      if (!uploadResponse.ok || !('ok' in uploadPayload)) {
        const errorPayload = uploadPayload as ErrorPayload
        throw new Error(errorPayload.error || '上传到 COS 失败')
      }

      setUploadResult(uploadPayload)
      setStep('transcribing')

      const transcribeResponse = await fetch('/api/agent-poc/audio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: uploadPayload.conversation.id }),
      })
      const transcribePayload = (await transcribeResponse.json()) as TranscribePayload | ErrorPayload
      if (!transcribeResponse.ok || !('ok' in transcribePayload)) {
        const errorPayload = transcribePayload as ErrorPayload
        throw new Error(errorPayload.error || 'Groq 转录失败')
      }

      setTranscribeResult(transcribePayload)
      setStep('done')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '处理失败')
      setStep('error')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="rounded-[28px] border border-[#e7ddd2] bg-[#fffaf4] p-8 shadow-[0_24px_80px_rgba(55,31,18,0.08)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={backHref}
              className={cn(
                buttonVariants({
                  variant: 'outline',
                  className: 'rounded-full border-[#eadac8] bg-white text-[#6f5748] hover:bg-[#fbf3ea]',
                })
              )}
            >
              返回客户列表
            </Link>
            <div className="text-right text-sm text-[#7b6557]">
              <div className="font-medium text-[#241711]">{profileName}</div>
              <div>profileId: {profileId}</div>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#eadac8] bg-white px-4 py-1 text-sm text-[#6f5748]">
            <Mic className="h-4 w-4" />
            Agent POC · Audio Transcribe
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#21150f]">本地音频上传与转录闭环</h1>
          <p className="max-w-3xl text-sm leading-7 text-[#6a574a]">
            这页只验证最小能力：本地页面选择音频，服务端上传到腾讯云 COS，再把签名 URL 丢给 Groq Whisper，
            最后把 transcript 写进本地 SQLite 并直接显示在页面上。
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-[24px] border border-[#eadfce] bg-white p-6 shadow-[0_16px_48px_rgba(49,30,18,0.06)]">
          <div className="flex items-center gap-3 text-[#241711]">
            <UploadCloud className="h-5 w-5" />
            <h2 className="text-lg font-semibold">上传音频</h2>
          </div>

          <div className="mt-5 space-y-4">
            <div
              className={`relative overflow-hidden rounded-[20px] border border-dashed transition ${
                isDragging
                  ? 'border-[#8a6447] bg-[#f5e9db] text-[#4f372b] shadow-[0_18px_40px_rgba(86,53,31,0.10)]'
                  : 'border-[#d7c5b2] bg-[#fdf8f2] text-[#6c5647]'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".mp3,.m4a,.wav,.ogg,audio/*"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                onChange={(event) => handleSelectedFile(event.target.files?.[0] || null)}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
              <div className="pointer-events-none flex flex-col items-center justify-center gap-3 px-5 py-10 text-center">
                <UploadCloud className="h-8 w-8 text-[#8d6d56]" />
                <span className="text-sm">
                  {isDragging ? '松开即可上传这段音频' : '点击选择，或直接拖拽 MP3 / M4A / WAV / OGG 音频到这里'}
                </span>
                <span className="text-xs text-[#9b8372]">当前只做上传与转录，不做结构化提取</span>
              </div>
            </div>

            <div className="rounded-[18px] bg-[#f6efe7] px-4 py-3 text-sm text-[#5f4a3d]">
              <div>当前状态：{STEP_LABELS[step]}</div>
              <div className="mt-2 truncate text-xs text-[#8c7464]">
                选中文件：{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB` : '尚未选择'}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleRun}
              disabled={!file || step === 'uploading' || step === 'transcribing'}
              className="w-full rounded-[18px] bg-[#24150f] text-white hover:bg-[#3a2418]"
            >
              {step === 'uploading' || step === 'transcribing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中
                </>
              ) : (
                '上传并转录'
              )}
            </Button>

            {error ? (
              <div className="rounded-[18px] border border-[#f0c9c2] bg-[#fff5f4] px-4 py-3 text-sm text-[#a64538]">
                {error}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#eadfce] bg-white p-6 shadow-[0_16px_48px_rgba(49,30,18,0.06)]">
          <h2 className="text-lg font-semibold text-[#241711]">结果</h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-[18px] bg-[#f8f2ea] p-4 text-sm text-[#5c493d]">
              <div className="font-medium text-[#2b1d16]">上传结果</div>
              <div className="mt-2 break-all text-xs leading-6 text-[#816b5d]">
                {uploadResult ? (
                  <>
                    <div>conversationId: {uploadResult.conversation.id}</div>
                    <div>bucket: {uploadResult.audio.bucket}</div>
                    <div>region: {uploadResult.audio.region}</div>
                    <div>key: {uploadResult.audio.key}</div>
                  </>
                ) : (
                  '上传成功后，这里会显示 COS 对象信息。'
                )}
              </div>
            </div>

            <div className="rounded-[18px] bg-[#f8f2ea] p-4 text-sm text-[#5c493d]">
              <div className="font-medium text-[#2b1d16]">转录全文</div>
              <div className="mt-2 max-h-[420px] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-[#3e3028]">
                {transcribeResult?.conversation.transcript || '转录完成后，文字稿会直接显示在这里。'}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
