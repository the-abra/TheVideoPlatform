"use client"

import type React from "react"
import { Search, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { storage } from "@/lib/storage"

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const [siteName, setSiteName] = useState("MEDIAHUB")
  const router = useRouter()

  useEffect(() => {
    // Fetch site settings from API instead of localStorage
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setSiteName(data.data.settings.siteName)
        } else {
          // Fallback to localStorage if API fails
          const settings = storage.getSiteSettings()
          setSiteName(settings.siteName)
        }
      } catch (error) {
        // Fallback to localStorage if API fails
        const settings = storage.getSiteSettings()
        setSiteName(settings.siteName)
      }
    }

    fetchSettings()
  }, [])

  const handleFastExit = () => {
    window.location.href = "about:blank"
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey) {
      router.push("/admin")
    } else {
      router.push("/")
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-2 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="text-xl font-bold text-white tracking-tight">
            {siteName.includes("HUB") ? (
              <>
                {siteName.replace("HUB", "")}
                <span className="text-accent">HUB</span>
              </>
            ) : (
              <span className="text-accent">{siteName}</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex items-center">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary text-foreground placeholder-muted-foreground px-4 py-2 pr-10 rounded-full border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all text-sm"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
              <Search className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
            </button>
          </div>
        </form>

        {/* Right icons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="md:hidden p-2 hover:bg-secondary rounded-full transition-colors">
            <Search className="w-5 h-5 text-foreground" />
          </button>

          <button
            onClick={handleFastExit}
            className="p-2 hover:bg-secondary rounded-full transition-colors group"
            title="Fast exit to safe page"
          >
            <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>
      </div>

      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary text-foreground placeholder-muted-foreground px-4 py-2 pr-10 rounded-full border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all text-sm"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>
        </form>
      </div>
    </header>
  )
}
