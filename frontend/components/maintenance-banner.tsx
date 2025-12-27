"use client"

import { AlertCircle } from "lucide-react"

export function MaintenanceBanner() {
  return (
    <div className="bg-accent/20 border-b border-accent/30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
        <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
        <p className="text-foreground">
          <span className="font-bold">Maintenance Mode:</span> Site is currently in maintenance. Some features may be
          limited.
        </p>
      </div>
    </div>
  )
}
