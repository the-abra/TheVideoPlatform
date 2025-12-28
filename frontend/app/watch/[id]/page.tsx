"use client"

import { useState, useEffect, use } from "react"
import { ThumbsUp, ThumbsDown, Share2, Bookmark, BookmarkCheck, AlertCircle } from "lucide-react"
import { Header } from "@/components/header"
import { Toast } from "@/components/toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { storage } from "@/lib/storage"
import { AdSection } from "@/components/ad-section"
import { VideoPlayer } from "@/components/video-player"
import { fixVideoUrl, fixThumbnailUrl } from "@/lib/url-utils"

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "";
};

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const videoId = Number.parseInt(id)

  const [videoData, setVideoData] = useState<any>(null)
  const [videoState, setVideoState] = useState({
    liked: false,
    disliked: false,
    likes: 0,
    dislikes: 0,
  })
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [videoError, setVideoError] = useState(false)

  useEffect(() => {
    setIsLoading(true)

    // Fetch video from backend API
    const fetchVideo = async () => {
      const API_BASE = getApiBase();
      if (!API_BASE) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/videos/${videoId}`)
        if (response.ok) {
          const data = await response.json()
          // Backend returns { success, data: { video, relatedVideos } }
          const video = data.data?.video
          if (video) {
            setVideoData(video)
            setVideoState({
              liked: false,
              disliked: false,
              likes: video.likes || 0,
              dislikes: video.dislikes || 0,
            })
            // Increment view count
            fetch(`${API_BASE}/api/videos/${videoId}/view`, { method: 'POST' }).catch(() => {})
          }
        } else {
          console.error('Failed to fetch video from backend')
          setVideoData(null)
        }
      } catch (error) {
        console.error('Error fetching video:', error)
        setVideoData(null)
      } finally {
        // Add to local history for user convenience
        storage.addToHistory(videoId)
        setIsLoading(false)
      }
    }

    fetchVideo()

    // Check if saved in localStorage
    const saved = storage.getSavedVideos()
    setIsSaved(saved.includes(videoId))
  }, [videoId])

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type })
  }

  const handleLike = () => {
    setVideoState((prev) => ({
      ...prev,
      liked: !prev.liked,
      likes: prev.liked ? prev.likes - 1 : prev.likes + 1,
      disliked: false,
      dislikes: prev.disliked ? prev.dislikes - 1 : prev.dislikes,
    }))
    showToast(!videoState.liked ? "Added to liked videos" : "Removed from liked videos", "success")
  }

  const handleDislike = () => {
    setVideoState((prev) => ({
      ...prev,
      disliked: !prev.disliked,
      dislikes: prev.disliked ? prev.dislikes - 1 : prev.dislikes + 1,
      liked: false,
      likes: prev.liked ? prev.likes - 1 : prev.likes,
    }))
  }

  const handleSave = () => {
    if (isSaved) {
      const success = storage.removeSavedVideo(videoId)
      if (success) {
        setIsSaved(false)
        showToast("Removed from library", "info")
      } else {
        showToast("Failed to update library", "error")
      }
    } else {
      const success = storage.saveVideo(videoId)
      if (success) {
        setIsSaved(true)
        showToast("Added to library", "success")
      } else {
        showToast("Failed to add to library", "error")
      }
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoData?.title || "Check out this video",
          text: `Check out this video: ${videoData?.title || ""}`,
          url: window.location.href,
        })
        showToast("Shared successfully", "success")
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard()
        }
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = async () => {
    const url = window.location.href

    try {
      // Try modern Clipboard API (requires HTTPS or localhost)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
        showToast("Link copied to clipboard", "success")
      } else {
        // Fallback for non-HTTPS contexts
        const textArea = document.createElement("textarea")
        textArea.value = url
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          const successful = document.execCommand('copy')
          if (successful) {
            showToast("Link copied to clipboard", "success")
          } else {
            showToast("Could not copy link. Please copy manually: " + url, "error")
          }
        } catch (err) {
          showToast("Could not copy link. Please copy manually.", "error")
        }

        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error("Failed to copy:", err)
      showToast("Could not copy link. Please copy manually.", "error")
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

  if (!videoData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Video Not Found</h2>
            <p className="text-muted-foreground">This video doesn't exist or has been removed.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <AdSection placement="video-top" />

          <div className="bg-secondary rounded-lg overflow-hidden aspect-video w-full">
            {videoError ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <div className="text-center p-6">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-foreground mb-2">Failed to load video</p>
                  <p className="text-sm text-muted-foreground">Please check the video URL or try again later</p>
                </div>
              </div>
            ) : (
              <VideoPlayer
                src={fixVideoUrl(videoData.url)}
                poster={fixThumbnailUrl(videoData.thumbnail)}
                onError={() => setVideoError(true)}
                className="w-full h-full"
              />
            )}
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground text-balance">{videoData.title}</h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent font-bold">{videoData.creator?.charAt(0) || "?"}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-foreground">{videoData.creator}</span>
                    {videoData.verified && (
                      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 bg-secondary rounded-full p-2 flex-wrap">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  videoState.liked ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary/80"
                }`}
                title="Like this video"
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm font-medium">{videoState.likes.toLocaleString()}</span>
              </button>

              <button
                onClick={handleDislike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  videoState.disliked ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary/80"
                }`}
                title="Dislike this video"
              >
                <ThumbsDown className="w-4 h-4" />
                <span className="text-sm font-medium">{videoState.dislikes.toLocaleString()}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-foreground hover:bg-secondary/80 transition-all"
                title="Share this video"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">Share</span>
              </button>

              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isSaved ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary/80"
                }`}
                title={isSaved ? "Remove from library" : "Add to library"}
              >
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span className="text-sm font-medium">{isSaved ? "Saved" : "Save"}</span>
              </button>
            </div>

            {videoData.description && (
              <div className="bg-secondary rounded-lg p-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  {videoData.views} views • {videoData.uploadedAt}
                </div>
                <p
                  className={`text-sm text-foreground leading-relaxed text-pretty ${!showFullDescription && "line-clamp-3"}`}
                >
                  {videoData.description}
                </p>
                {videoData.description.length > 150 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-accent text-sm font-medium hover:text-accent/80 transition-colors"
                  >
                    {showFullDescription ? "Show less" : "Show more"}
                  </button>
                )}

                {videoData.tags && videoData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {videoData.tags.map((tag: string) => (
                      <button
                        key={tag}
                        className="text-accent text-xs bg-accent/10 px-3 py-1 rounded-full hover:bg-accent/20 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sidebar Ads - visible on all screens */}
            <div className="mt-6">
              <AdSection placement="video-sidebar" maxAds={2} />
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
