"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { ExternalLink } from "lucide-react"

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "";
};

// Ad placement types
type AdPlacement = "home-banner" | "home-sidebar" | "video-top" | "video-sidebar" | "video-random"

// Ad interface matching backend response
interface Ad {
  id: string
  title: string
  imageUrl: string
  targetUrl: string
  placement: AdPlacement
  enabled: boolean
  clicks: number
  impressions: number
  createdAt: string
  updatedAt: string
}

interface AdSectionProps {
  placement: AdPlacement
  className?: string
  maxAds?: number
}

export function AdSection({ placement, className = "", maxAds = 3 }: AdSectionProps) {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const impressionTracked = useRef<Set<string>>(new Set())

  // Fetch ads from backend
  const fetchAds = useCallback(async () => {
    const API_BASE = getApiBase();
    if (!API_BASE) return; // Skip if not on client side

    console.log('[AdSection] Fetching from:', `${API_BASE}/api/ads?placement=${placement}&enabled=true`);

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE}/api/ads?placement=${placement}&enabled=true`, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ads: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.data?.ads) {
        // Limit ads to maxAds
        const filteredAds = data.data.ads.slice(0, maxAds)
        setAds(filteredAds)
      } else {
        setAds([])
      }
    } catch (err) {
      console.error("[AdSection] Error fetching ads:", err)
      console.error("[AdSection] API_BASE was:", API_BASE)
      setError(err instanceof Error ? err.message : "Failed to load ads")
      setAds([])
    } finally {
      setLoading(false)
    }
  }, [placement, maxAds])

  // Track impression when ad becomes visible
  const trackImpression = useCallback(async (adId: string) => {
    // Only track once per ad per session
    if (impressionTracked.current.has(adId)) return
    impressionTracked.current.add(adId)

    const API_BASE = getApiBase();
    if (!API_BASE) return;

    try {
      await fetch(`${API_BASE}/api/ads/${adId}/impression`, {
        method: "POST",
      })
    } catch (err) {
      console.error("Failed to track impression:", err)
    }
  }, [])

  // Track click when user clicks on ad
  const trackClick = useCallback(async (adId: string) => {
    const API_BASE = getApiBase();
    if (!API_BASE) return;

    try {
      await fetch(`${API_BASE}/api/ads/${adId}/click`, {
        method: "POST",
      })
    } catch (err) {
      console.error("Failed to track click:", err)
    }
  }, [])

  // Handle ad click
  const handleAdClick = useCallback(async (ad: Ad, e: React.MouseEvent) => {
    e.preventDefault()

    // Track click
    await trackClick(ad.id)

    // Open target URL in new tab
    window.open(ad.targetUrl, "_blank", "noopener,noreferrer")
  }, [trackClick])

  // Fetch ads on mount
  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  // Track impressions when ads are loaded
  useEffect(() => {
    ads.forEach((ad) => {
      trackImpression(ad.id)
    })
  }, [ads, trackImpression])

  // Get proper image URL
  const getImageUrl = (imageUrl: string): string => {
    if (!imageUrl) return "/placeholder.svg"

    // Fix old localhost URLs to relative paths
    if (imageUrl.includes('/share/') && (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1'))) {
      const match = imageUrl.match(/\/share\/[^/]+\/raw/)
      if (match) return match[0]
    }

    if (imageUrl.startsWith("http")) return imageUrl
    // Handle share links (relative to frontend)
    if (imageUrl.startsWith("/share/")) {
      return imageUrl // Relative URL, browser will resolve to current origin
    }
    const API_BASE = getApiBase();
    if (!API_BASE) return "/placeholder.svg";
    // Handle relative paths from backend
    if (imageUrl.startsWith("/storage")) {
      return `${API_BASE}${imageUrl}`
    }
    return `${API_BASE}${imageUrl}`
  }

  // Don't render anything while loading or if no ads
  if (loading) {
    return null
  }

  if (error || ads.length === 0) {
    return null
  }

  // Render based on placement type
  const renderAd = (ad: Ad, index: number) => {
    const imageUrl = getImageUrl(ad.imageUrl)

    return (
      <div
        key={ad.id}
        onClick={(e) => handleAdClick(ad, e)}
        className="relative group cursor-pointer rounded-lg overflow-hidden transition-all hover:opacity-90 hover:scale-[1.01] border border-border/50 bg-card shadow-sm"
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleAdClick(ad, e as unknown as React.MouseEvent)
          }
        }}
      >
        {/* Ad Image */}
        <div className="relative overflow-hidden" style={{ height: '90px' }}>
          <img
            src={imageUrl}
            alt={ad.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = "/placeholder.svg"
            }}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Ad Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between gap-2">
            <p className="text-white text-sm font-medium line-clamp-1">{ad.title}</p>
            <ExternalLink className="w-4 h-4 text-white/70 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-white/60 text-xs mt-0.5">Sponsored</p>
        </div>
      </div>
    )
  }

  // Banner placement (horizontal, full width)
  if (placement === "home-banner" || placement === "video-top") {
    return (
      <div className={`w-full ${className}`} style={{ maxWidth: '768px', margin: '0 auto' }}>
        <div className="space-y-4">
          {ads.map((ad, index) => renderAd(ad, index))}
        </div>
      </div>
    )
  }

  // Sidebar placement (vertical stack)
  return (
    <div className={`space-y-4 ${className}`}>
      {ads.map((ad, index) => renderAd(ad, index))}
    </div>
  )
}

// Export placement type for external use
export type { AdPlacement, Ad }
