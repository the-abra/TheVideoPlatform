"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { MaintenanceBanner } from "@/components/maintenance-banner"
import { getSiteSettings } from "@/lib/storage"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSettings(getSiteSettings())
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <>
      {settings?.maintenanceMode && <MaintenanceBanner />}
      {children}
    </>
  )
}
