"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Volume2, VolumeX, Maximize, Pause, SkipForward } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Ad {
  id: string
  title: string
  imageUrl: string
  targetUrl: string
  placement: string
  enabled: boolean
}

interface VideoPlayerProps {
  src: string
  poster?: string
  onError?: () => void
  className?: string
}

export function VideoPlayer({ src, poster, onError, className = "" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const adVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  // Pre-roll ad state
  const [prerollAd, setPrerollAd] = useState<Ad | null>(null)
  const [showingAd, setShowingAd] = useState(false)
  const [adSkippable, setAdSkippable] = useState(false)
  const [adCountdown, setAdCountdown] = useState(5)
  const [adLoading, setAdLoading] = useState(true)
  const [hasPlayedAd, setHasPlayedAd] = useState(false)

  // Fetch pre-roll ad
  useEffect(() => {
    const fetchPrerollAd = async () => {
      try {
        // Fetch ads from video-top or video-random placement for pre-roll
        const response = await fetch(`${API_BASE}/api/ads?placement=video-top&enabled=true`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data?.ads?.length > 0) {
            // Pick a random ad
            const ads = data.data.ads
            const randomAd = ads[Math.floor(Math.random() * ads.length)]
            setPrerollAd(randomAd)
          }
        }
      } catch (err) {
        console.error("Failed to fetch pre-roll ad:", err)
      } finally {
        setAdLoading(false)
      }
    }

    fetchPrerollAd()
  }, [])

  // Handle ad countdown
  useEffect(() => {
    if (showingAd && adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (showingAd && adCountdown === 0) {
      setAdSkippable(true)
    }
  }, [showingAd, adCountdown])

  // Track ad impression
  const trackAdImpression = useCallback(async (adId: string) => {
    try {
      await fetch(`${API_BASE}/api/ads/${adId}/impression`, { method: "POST" })
    } catch (err) {
      console.error("Failed to track ad impression:", err)
    }
  }, [])

  // Track ad click
  const trackAdClick = useCallback(async (adId: string) => {
    try {
      await fetch(`${API_BASE}/api/ads/${adId}/click`, { method: "POST" })
    } catch (err) {
      console.error("Failed to track ad click:", err)
    }
  }, [])

  // Handle play button click
  const handlePlayClick = () => {
    if (!hasPlayedAd && prerollAd) {
      // Show pre-roll ad first
      setShowingAd(true)
      setHasPlayedAd(true)
      trackAdImpression(prerollAd.id)
    } else {
      // Play the main video
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause()
        } else {
          videoRef.current.play()
        }
        setIsPlaying(!isPlaying)
      }
    }
  }

  // Skip ad
  const skipAd = () => {
    setShowingAd(false)
    if (videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  // Handle ad click
  const handleAdClick = () => {
    if (prerollAd) {
      trackAdClick(prerollAd.id)
      window.open(prerollAd.targetUrl, "_blank", "noopener,noreferrer")
    }
  }

  // Get proper image/video URL
  const getMediaUrl = (url: string): string => {
    if (!url) return ""
    if (url.startsWith("http")) return url
    return `${API_BASE}${url}`
  }

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime
      const total = videoRef.current.duration
      setCurrentTime(current)
      setProgress((current / total) * 100)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const pos = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = pos * videoRef.current.duration
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Prevent right-click on video
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    return false
  }

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const handleMouseMove = () => {
      setShowControls(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 3000)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("mousemove", handleMouseMove)
      return () => {
        container.removeEventListener("mousemove", handleMouseMove)
        clearTimeout(timeout)
      }
    }
  }, [isPlaying])

  // Check if ad is a video
  const isAdVideo = prerollAd?.imageUrl?.match(/\.(mp4|webm|ogg)$/i)

  return (
    <div
      ref={containerRef}
      className={`relative bg-black overflow-hidden select-none ${className}`}
      onContextMenu={handleContextMenu}
    >
      {/* Pre-roll Ad Overlay */}
      {showingAd && prerollAd && (
        <div className="absolute inset-0 z-20 bg-black flex flex-col">
          {/* Ad Content */}
          <div
            className="flex-1 flex items-center justify-center cursor-pointer"
            onClick={handleAdClick}
          >
            {isAdVideo ? (
              <video
                ref={adVideoRef}
                src={getMediaUrl(prerollAd.imageUrl)}
                autoPlay
                muted={false}
                className="max-w-full max-h-full object-contain"
                onEnded={skipAd}
              />
            ) : (
              <img
                src={getMediaUrl(prerollAd.imageUrl)}
                alt={prerollAd.title}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Ad Info Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">AD</span>
                <span className="text-white text-sm">{prerollAd.title}</span>
              </div>

              {/* Skip button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (adSkippable) skipAd()
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-all ${
                  adSkippable
                    ? "bg-white text-black hover:bg-gray-200 cursor-pointer"
                    : "bg-white/30 text-white cursor-not-allowed"
                }`}
                disabled={!adSkippable}
              >
                {adSkippable ? (
                  <>
                    <SkipForward className="w-4 h-4" />
                    Skip Ad
                  </>
                ) : (
                  `Skip in ${adCountdown}s`
                )}
              </button>
            </div>
          </div>

          {/* Visit Advertiser Link */}
          <button
            onClick={handleAdClick}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1 rounded transition-all"
          >
            Visit Advertiser
          </button>
        </div>
      )}

      {/* Main Video */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={onError}
        onContextMenu={handleContextMenu}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
      />

      {/* Custom Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Play/Pause Button Center */}
        {!showingAd && (
          <button
            onClick={handlePlayClick}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        )}

        {/* Bottom Controls Bar */}
        {!showingAd && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* Progress Bar */}
            <div
              className="w-full h-1 bg-white/30 rounded cursor-pointer mb-3 group"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-accent rounded relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handlePlayClick} className="text-white hover:text-accent transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <button onClick={toggleMute} className="text-white hover:text-accent transition-colors">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <button onClick={toggleFullscreen} className="text-white hover:text-accent transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invisible overlay to prevent download via drag */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "transparent" }}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  )
}
