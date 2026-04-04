"use client"

import { useEffect, useState } from "react"
import { MoonStar, SunMedium } from "lucide-react"

import { useDesignTheme } from "@/design-system/theme/use-theme"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, toggleTheme } = useDesignTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const resolvedTheme = mounted ? theme : "light"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={resolvedTheme === "light" ? "切换到深色模式" : "切换到浅色模式"}
      className="shrink-0"
    >
      {resolvedTheme === "light" ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
    </Button>
  )
}
