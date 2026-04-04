"use client"

import { createContext } from "react"

export type DesignThemeMode = "light" | "dark"

export type DesignThemeValue = {
  theme: DesignThemeMode
  setTheme: (theme: DesignThemeMode) => void
  toggleTheme: () => void
}

export const DesignThemeContext = createContext<DesignThemeValue | null>(null)
