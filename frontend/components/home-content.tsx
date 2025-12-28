"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { CategoryStrip } from "@/components/category-strip"
import { MediaCard } from "@/components/media-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { MaintenanceBanner } from "@/components/maintenance-banner"
import { AdSection } from "@/components/ad-section"
import { storage } from "@/lib/storage"

const API_BASE = "http://localhost:5000"

export function HomeContent() {
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [customVideos, setCustomVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  const searchQuery = searchParams.get("search") || ""

  useEffect(() => {
    setIsLoading(true)

    // Fetch videos from backend API
    const fetchVideos = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/videos`)
        if (response.ok) {
          const data = await response.json()
          // Backend returns { success, data: { videos, pagination } }
          setCustomVideos(data.data?.videos || [])
        } else {
          console.error('Failed to fetch videos from backend')
          setCustomVideos([])
        }
      } catch (error) {
        console.error('Error fetching videos:', error)
        setCustomVideos([])
      } finally {
        const settings = storage.getSiteSettings()
        setMaintenanceMode(settings.maintenanceMode)
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [])

  useEffect(() => {
    const handleStorageChange = () => {
      const settings = storage.getSiteSettings()
      setMaintenanceMode(settings.maintenanceMode)
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const filteredContent = useMemo(() => {
    return customVideos.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.creator.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = !selectedCategory || item.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory, customVideos])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {maintenanceMode && <MaintenanceBanner />}
      <CategoryStrip onCategorySelect={setSelectedCategory} selectedCategory={selectedCategory} />

      <main className="px-4 py-8 lg:px-6">
        {(searchQuery || selectedCategory) && (
          <div className="mb-6 p-4 bg-secondary rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              {searchQuery && <span>Showing results for "{searchQuery}"</span>}
              {searchQuery && selectedCategory && <span> in </span>}
              {selectedCategory && <span className="capitalize">{selectedCategory}</span>}
              <span className="ml-2 text-foreground font-medium">({filteredContent.length} videos)</span>
            </p>
          </div>
        )}

        <AdSection placement="home-banner" className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContent.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground mb-2">
                    {customVideos.length === 0 ? "No videos available yet." : "No videos found matching your search."}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {customVideos.length === 0
                      ? "Add videos from the admin panel to get started."
                      : "Try a different search term or category"}
                  </p>
                  {(searchQuery || selectedCategory) && (
                    <button
                      onClick={() => {
                        setSelectedCategory(null)
                        window.history.pushState({}, "", "/")
                      }}
                      className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredContent.map((item, index) => (
                  <div key={`${item.id}-${item.title}-wrapper`} className="contents">
                    <MediaCard
                      key={`${item.id}-${item.title}`}
                      id={item.id}
                      thumbnail={item.thumbnail}
                      title={item.title}
                      creator={item.creator}
                      duration={item.duration}
                      views={item.views}
                      uploadedAt={item.uploadedAt}
                      verified={item.verified}
                    />
                    {/* Show random ad after every 4th video */}
                    {(index + 1) % 4 === 0 && index < filteredContent.length - 1 && (
                      <div className="col-span-1">
                        <AdSection placement="video-random" maxAds={1} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <AdSection placement="home-sidebar" />
          </div>
        </div>
      </main>

      {/* Mobile footer navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border">
        <div className="flex items-center justify-around py-3">
          <Link href="/" className="flex flex-col items-center gap-1 text-accent font-medium">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          <Link
            href="/explore"
            className="flex flex-col items-center gap-1 text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            <span className="text-xs">Explore</span>
          </Link>
          <Link
            href="/categories"
            className="flex flex-col items-center gap-1 text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="text-xs">Categories</span>
          </Link>
          <Link
            href="/library"
            className="flex flex-col items-center gap-1 text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17.001c0 5.591 3.824 10.29 9 11.622m0-13c5.5 0 10 4.745 10 10.001 0 5.591-3.824 10.29-9 11.622"
              />
            </svg>
            <span className="text-xs">Library</span>
          </Link>
        </div>
      </nav>

      <div className="h-20 md:h-0" />
    </div>
  )
}
