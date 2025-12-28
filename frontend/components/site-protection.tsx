"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, Shield, X } from "lucide-react"

// Use Next.js API route for VPN check to ensure proper header forwarding

interface Warning {
  type: "adblock" | "wappalyzer" | "vpn"
  title: string
  message: string
}

export function SiteProtection() {
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set())

  // Block right-click on entire site
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Block common keyboard shortcuts for saving/downloading
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+S, Ctrl+Shift+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        return false
      }
      // Block Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
        e.preventDefault()
        return false
      }
      // Block F12 (dev tools) - optional, can be annoying for developers
      // if (e.key === "F12") {
      //   e.preventDefault()
      //   return false
      // }
    }

    // Block drag events on media
    const handleDragStart = (e: DragEvent) => {
      if (e.target instanceof HTMLImageElement || e.target instanceof HTMLVideoElement) {
        e.preventDefault()
        return false
      }
    }

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("dragstart", handleDragStart)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("dragstart", handleDragStart)
    }
  }, [])

  // Detect ad blocker
  const detectAdBlocker = useCallback(async (): Promise<boolean> => {
    try {
      // Method 1: Try to load a bait ad element
      const bait = document.createElement("div")
      bait.className = "adsbox ad-banner ad-placement textads banner-ads"
      bait.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;"
      bait.innerHTML = "&nbsp;"
      document.body.appendChild(bait)

      await new Promise(resolve => setTimeout(resolve, 100))

      const isBlocked = bait.offsetHeight === 0 ||
                        bait.offsetParent === null ||
                        window.getComputedStyle(bait).display === "none" ||
                        window.getComputedStyle(bait).visibility === "hidden"

      document.body.removeChild(bait)

      if (isBlocked) return true

      // Method 2: Try to fetch a fake ad script
      try {
        const response = await fetch("/ads.js", { method: "HEAD", cache: "no-store" })
        // If blocked by ad blocker, this will fail
      } catch {
        return true
      }

      // Method 3: Check if common ad-related globals are blocked
      const testAd = document.createElement("ins")
      testAd.className = "adsbygoogle"
      testAd.style.display = "block"
      testAd.style.position = "absolute"
      testAd.style.left = "-9999px"
      document.body.appendChild(testAd)

      await new Promise(resolve => setTimeout(resolve, 100))

      const isInsBlocked = testAd.offsetHeight === 0
      document.body.removeChild(testAd)

      return isInsBlocked
    } catch {
      return false
    }
  }, [])

  // Detect Wappalyzer extension
  const detectWappalyzer = useCallback(async (): Promise<boolean> => {
    try {
      // Wappalyzer injects specific elements or modifies the DOM
      // Check for known Wappalyzer signatures

      // Method 1: Check for Wappalyzer's injected elements
      const wappalyzerElements = document.querySelectorAll("[data-wappalyzer]")
      if (wappalyzerElements.length > 0) return true

      // Method 2: Check if window has Wappalyzer-related properties
      if ("wappalyzer" in window || "__wappalyzer" in window) return true

      // Method 3: Try to detect via chrome extension communication
      // This is a heuristic - Wappalyzer makes specific requests
      const hasWappalyzerClass = document.documentElement.classList.contains("wappalyzer")
      if (hasWappalyzerClass) return true

      // Method 4: Check for extension-injected script tags
      const scripts = document.querySelectorAll('script[src*="wappalyzer"]')
      if (scripts.length > 0) return true

      // Method 5: Check localStorage/sessionStorage for Wappalyzer data
      try {
        const localStorageKeys = Object.keys(localStorage)
        const hasWappalyzerStorage = localStorageKeys.some(key =>
          key.toLowerCase().includes("wappalyzer")
        )
        if (hasWappalyzerStorage) return true
      } catch {
        // localStorage might be blocked
      }

      return false
    } catch {
      return false
    }
  }, [])

  // Detect VPN usage
  const detectVPN = useCallback(async (): Promise<boolean> => {
    try {
      // Method 1: Use WebRTC to detect local IP vs public IP discrepancy
      // This can indicate VPN usage

      // Method 2: Check with a VPN detection API (backend should handle this)
      const response = await fetch("/api/check-vpn", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.data?.isVPN === true || data.data?.isProxy === true
      }

      // Method 3: Time-based detection (VPNs often add latency)
      // This is unreliable but can be a hint
      const start = performance.now()
      await fetch("https://www.google.com/favicon.ico", { mode: "no-cors", cache: "no-store" })
      const latency = performance.now() - start

      // Very high latency might indicate VPN (but not reliable)
      // We won't use this as a primary detection method

      return false
    } catch {
      // If the check fails, don't assume VPN
      return false
    }
  }, [])

  // Run detections
  useEffect(() => {
    const runDetections = async () => {
      const newWarnings: Warning[] = []

      // Check for ad blocker
      const hasAdBlocker = await detectAdBlocker()
      if (hasAdBlocker) {
        newWarnings.push({
          type: "adblock",
          title: "Ad Blocker Detected",
          message: "Please disable your ad blocker to support this site. Ads help us keep the content free.",
        })
      }

      // Check for Wappalyzer
      const hasWappalyzer = await detectWappalyzer()
      if (hasWappalyzer) {
        newWarnings.push({
          type: "wappalyzer",
          title: "Technology Analyzer Detected",
          message: "We noticed you're using a technology detection extension. This site's technologies are proprietary.",
        })
      }

      // Check for VPN
      const hasVPN = await detectVPN()
      if (hasVPN) {
        newWarnings.push({
          type: "vpn",
          title: "VPN/Proxy Detected",
          message: "You appear to be using a VPN or proxy. Some features may be restricted.",
        })
      }

      setWarnings(newWarnings)
    }

    // Run after a short delay to let the page load
    const timeout = setTimeout(runDetections, 2000)

    // Re-check periodically (every 30 seconds)
    const interval = setInterval(runDetections, 30000)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [detectAdBlocker, detectWappalyzer, detectVPN])

  // Dismiss a warning
  const dismissWarning = (type: string) => {
    setDismissedWarnings(prev => new Set([...prev, type]))
  }

  // Filter out dismissed warnings
  const activeWarnings = warnings.filter(w => !dismissedWarnings.has(w.type))

  if (activeWarnings.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {activeWarnings.map((warning) => (
        <div
          key={warning.type}
          className={`rounded-lg p-4 shadow-lg border backdrop-blur-sm animate-in slide-in-from-right-5 ${
            warning.type === "adblock"
              ? "bg-yellow-500/90 border-yellow-600 text-yellow-950"
              : warning.type === "vpn"
              ? "bg-orange-500/90 border-orange-600 text-orange-950"
              : "bg-blue-500/90 border-blue-600 text-blue-950"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {warning.type === "adblock" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm">{warning.title}</h4>
              <p className="text-xs mt-1 opacity-90">{warning.message}</p>
            </div>
            <button
              onClick={() => dismissWarning(warning.type)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
