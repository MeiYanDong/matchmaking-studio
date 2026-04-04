import type { Metadata } from 'next'
import type { CSSProperties, ReactNode } from 'react'
import { DesignThemeProvider } from '@/design-system/theme/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const rootStyle = {
  '--font-sans': '"Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif',
  '--font-geist-mono': '"SFMono-Regular", "SF Mono", Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", monospace',
  '--font-heading': '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Baskerville", "Songti SC", "Source Han Serif SC", serif',
} as CSSProperties

export const metadata: Metadata = {
  title: 'Matchmaking Studio',
  description: 'AI-first private matchmaking workspace',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" style={rootStyle}>
      <body className="min-h-full flex flex-col">
        <DesignThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </DesignThemeProvider>
      </body>
    </html>
  )
}
