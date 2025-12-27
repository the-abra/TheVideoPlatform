"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Toast } from "@/components/toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { storage } from "@/lib/storage"
import Link from "next/link"
import { Bookmark, Clock, Trash2, AlertCircle } from "lucide-react"

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<"saved" | "history">("saved")
  const [savedVideos, setSavedVideos] = useState<any[]>([])
  const [watchHistory, setWatchHistory] = useState<number[]>([])
  const [allVideos, setAllVideos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load saved video IDs and watch history IDs from localStorage
      const savedIds = storage.getSavedVideos()
      const historyIds = storage.getWatchHistory()

      // Fetch all videos from API to get video details
      let allVideosData = []
      try {
        const response = await fetch('/api/videos')
        if (response.ok) {
          const data = await response.json()
          allVideosData = data.data.videos || []
        } else {
          // Fallback to localStorage if API fails
          allVideosData = storage.getVideos()
        }
      } catch (error) {
        // Fallback to localStorage if API fails
        allVideosData = storage.getVideos()
      }

      setAllVideos(allVideosData)

      // Map saved IDs to actual video objects
      const savedData = allVideosData.filter(video => savedIds.includes(video.id))
      setSavedVideos(savedData)
      setWatchHistory(historyIds)
    } catch (error) {
      console.error("[v0] Error loading library data:", error)
      showToast("Failed to load library data", "error")
    } finally {
      setIsLoading(false)
    }
  }

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type })
  }

  const handleRemoveVideo = async (id: number) => {
    if (!confirm("Remove this video from your library?")) {
      return
    }

    const success = storage.removeSavedVideo(id)
    if (success) {
      setSavedVideos(savedVideos.filter((v) => v.id !== id))
      showToast("Removed from library", "success")
    } else {
      showToast("Failed to remove video", "error")
    }
  }

  const handleClearHistory = async () => {
    if (!confirm("Clear all watch history? This action cannot be undone.")) {
      return
    }

    const success = storage.clearHistory()
    if (success) {
      setWatchHistory([])
      showToast("Watch history cleared", "success")
    } else {
      showToast("Failed to clear history", "error")
    }
  }

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

      <main className="px-4 py-8 lg:px-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Library</h1>
          <p className="text-muted-foreground">Your saved videos and watch history</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab("saved")}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === "saved"
                ? "text-accent border-b-2 border-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              Saved Videos ({savedVideos.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === "history"
                ? "text-accent border-b-2 border-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Watch History ({watchHistory.length})
            </div>
          </button>
        </div>

        {/* Saved Videos */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            {savedVideos.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No saved videos yet</p>
                <p className="text-sm text-muted-foreground mb-4">Save videos to watch them later</p>
                <Link
                  href="/"
                  className="inline-block px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                >
                  Browse Videos
                </Link>
              </div>
            ) : (
              savedVideos.map((video) => (
                <Link key={video.id} href={`/watch/${video.id}`}>
                  <div className="flex gap-4 bg-secondary rounded-lg p-4 hover:bg-secondary/80 transition-colors cursor-pointer group border border-border">
                    <div className="relative w-40 h-24 flex-shrink-0 overflow-hidden rounded bg-background">
                      <img
                        src={video.thumbnail || "/placeholder.svg?height=96&width=160"}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {video.duration && (
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                          {video.duration}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground mb-1 line-clamp-2 group-hover:text-accent transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">{video.creator}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Bookmark className="w-3 h-3" />
                        <span>Saved to library</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleRemoveVideo(video.id)
                      }}
                      className="p-2 hover:bg-background rounded-lg transition-colors h-fit"
                      title="Remove from library"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Watch History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {watchHistory.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No watch history</p>
                <p className="text-sm text-muted-foreground mb-4">Videos you watch will appear here</p>
                <Link
                  href="/"
                  className="inline-block px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                >
                  Start Watching
                </Link>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {watchHistory.length} {watchHistory.length === 1 ? "video" : "videos"} watched
                  </p>
                  <button
                    onClick={handleClearHistory}
                    className="px-4 py-2 bg-secondary text-foreground text-sm rounded-lg hover:bg-secondary/80 transition-colors border border-border"
                  >
                    Clear All History
                  </button>
                </div>
                {watchHistory.map((videoId) => {
                  const video = allVideos.find(v => v.id === videoId)
                  if (!video) return null

                  return (
                    <Link key={videoId} href={`/watch/${videoId}`}>
                      <div className="flex gap-4 bg-secondary rounded-lg p-4 hover:bg-secondary/80 transition-colors cursor-pointer group border border-border">
                        <div className="relative w-40 h-24 flex-shrink-0 overflow-hidden rounded bg-background">
                          <img
                            src={video.thumbnail || "/placeholder.svg?height=96&width=160"}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {video.duration && (
                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                              {video.duration}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground mb-1 line-clamp-2 group-hover:text-accent transition-colors">
                            {video.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">{video.creator}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Recently watched</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-12 bg-secondary/50 rounded-lg p-6 border border-border">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-foreground mb-2">About Your Library</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your library and watch history are stored locally in your browser. This means your data will persist
                across sessions but won't sync between devices. Clear your browser data will remove all saved videos and
                history.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile footer navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border">
        <div className="flex items-center justify-around py-3">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
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
          <Link href="/library" className="flex flex-col items-center gap-1 text-accent font-medium">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
            <span className="text-xs">Library</span>
          </Link>
        </div>
      </nav>

      <div className="h-20 md:h-0" />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
