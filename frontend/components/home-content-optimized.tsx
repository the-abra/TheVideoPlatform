/**
 * OPTIMIZED Home Content Component
 *
 * Improvements over old version:
 * 1. Uses custom hooks - cleaner code
 * 2. Automatic loading/error handling
 * 3. No manual getApiBase() calls
 * 4. Automatic refetch capability
 * 5. Better separation of concerns
 */

"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { CategoryStrip } from "@/components/category-strip"
import { MediaCard } from "@/components/media-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { MaintenanceBanner } from "@/components/maintenance-banner"
import { AdSection } from "@/components/ad-section"
import { storage } from "@/lib/storage"
import { useVideos } from "@/hooks/use-api"

export function HomeContentOptimized() {
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get("search") || ""

  // Use custom hook - automatic loading/error handling!
  const { data, loading, error } = useVideos({
    page: 1,
    limit: 50,
  })

  const videos = data?.data?.videos || []

  // Check maintenance mode from local storage
  const settings = storage.getSiteSettings()
  const maintenanceMode = settings.maintenanceMode

  // Filter and search logic
  const filteredVideos = useMemo(() => {
    if (!videos.length) return []

    return videos.filter((video: any) => {
      const matchesSearch = searchQuery
        ? video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.creator.toLowerCase().includes(searchQuery.toLowerCase())
        : true

      return matchesSearch
    })
  }, [videos, searchQuery])

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`
    return `${Math.floor(diffInSeconds / 2592000)} months ago`
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {maintenanceMode && <MaintenanceBanner />}

      <CategoryStrip />

      {/* Banner Ad */}
      <div className="container mx-auto px-4 py-4">
        <AdSection placement="home-banner" maxAds={3} />
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {searchQuery && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">
                  Search results for "{searchQuery}"
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredVideos.length} {filteredVideos.length === 1 ? "result" : "results"} found
                </p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-destructive">Error loading videos: {error.message}</p>
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  {searchQuery ? "No videos found matching your search" : "No videos available"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVideos.map((video: any) => (
                  <MediaCard
                    key={video.id}
                    id={video.id}
                    thumbnail={video.thumbnail}
                    title={video.title}
                    creator={video.creator}
                    duration={video.duration || "0:00"}
                    views={video.views?.toLocaleString() || "0"}
                    uploadedAt={formatDate(video.createdAt)}
                    verified={video.verified}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Hidden on mobile */}
          <aside className="hidden lg:block w-80 space-y-4">
            <AdSection placement="home-sidebar" maxAds={3} />
          </aside>
        </div>
      </main>
    </div>
  )
}
