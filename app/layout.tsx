import type { Metadata } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const rootStyle = {
  '--font-sans': '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif',
  '--font-geist-mono': '"SFMono-Regular", "SF Mono", Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", monospace',
} as CSSProperties

export const metadata: Metadata = {
  title: '婚恋匹配平台',
  description: '专业婚恋匹配管理系统',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" style={rootStyle}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
