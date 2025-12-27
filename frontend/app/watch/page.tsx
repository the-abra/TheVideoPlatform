"use client"

import Image from "next/image"
import { useState } from "react"
import { ThumbsUp, ThumbsDown, Share2, Plus, MoreVertical } from "lucide-react"
import { Header } from "@/components/header"

// Mock video data
const VIDEO_DATA = {
  id: "video_1",
  title: "Advanced Tech Meditation Series - Episode 1",
  creator: {
    name: "Tech Wellness Studio",
    avatar: "/creator-avatar.jpg",
    verified: true,
    subscribers: "2.4M",
  },
  views: "2,451,930",
  uploadedAt: "3 days ago",
  thumbnail: "/dark-tech-meditation.jpg",
  duration: "14:23",
  description:
    "Dive deep into our premiere episode exploring the intersection of technology and wellness. This immersive experience combines cutting-edge visual effects with guided meditation techniques to create the ultimate digital wellness journey.\n\nLearn about:\n• The science of tech meditation\n• Advanced mindfulness techniques\n• Digital wellness practices\n• Future of meditation technology\n\nPerfect for anyone looking to balance screen time with mental clarity.",
  tags: ["#meditation", "#wellness", "#technology", "#mindfulness"],
  likes: 125430,
  dislikes: 2340,
  liked: false,
  disliked: false,
}

// Mock up next videos
const UP_NEXT = [
  {
    id: 2,
    thumbnail: "/virtual-reality-landscape.jpg",
    title: "Immersive VR Journey Through Digital Worlds",
    creator: "VR Experiences",
    duration: "8:45",
    views: "1.8M",
    uploadedAt: "1 week ago",
    verified: true,
  },
  {
    id: 3,
    thumbnail: "/4k-nature-documentary.jpg",
    title: "4K Ultra High Definition Nature Documentary",
    creator: "Nature Archive",
    duration: "31:12",
    views: "5.2M",
    uploadedAt: "2 weeks ago",
    verified: true,
  },
  {
    id: 4,
    thumbnail: "/gaming-esports-tournament.jpg",
    title: "Gaming Championship Finals - Best Moments",
    creator: "Pro Gaming Network",
    duration: "45:30",
    views: "3.1M",
    uploadedAt: "5 days ago",
    verified: true,
  },
  {
    id: 5,
    thumbnail: "/music-production-studio.png",
    title: "Behind the Scenes: Music Production Masterclass",
    creator: "Sound Engineering Pro",
    duration: "22:18",
    views: "890K",
    uploadedAt: "1 week ago",
    verified: false,
  },
]

const COMMENTS = [
  {
    id: 1,
    author: "Alex Chen",
    avatar: "/avatar1.jpg",
    timestamp: "2 days ago",
    text: "This is exactly what I needed! The meditation techniques combined with the visuals are incredible.",
    likes: 543,
    liked: false,
  },
  {
    id: 2,
    author: "Sarah Williams",
    avatar: "/avatar2.jpg",
    timestamp: "1 day ago",
    text: "Finally found a way to reduce my screen time anxiety. Brilliant episode!",
    likes: 234,
    liked: false,
  },
  {
    id: 3,
    author: "Marcus Tech",
    avatar: "/avatar3.jpg",
    timestamp: "18 hours ago",
    text: "The production quality is out of this world. Can't wait for episode 2!",
    likes: 876,
    liked: false,
  },
]

export default function WatchPage() {
  const [videoState, setVideoState] = useState({
    liked: VIDEO_DATA.liked,
    disliked: VIDEO_DATA.disliked,
    likes: VIDEO_DATA.likes,
    dislikes: VIDEO_DATA.dislikes,
  })
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [comments, setComments] = useState(COMMENTS)

  const handleLike = () => {
    setVideoState((prev) => ({
      ...prev,
      liked: !prev.liked,
      likes: prev.liked ? prev.likes - 1 : prev.likes + 1,
      disliked: false,
      dislikes: prev.disliked ? prev.dislikes - 1 : prev.dislikes,
    }))
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

  const handleCommentLike = (id: number) => {
    setComments(
      comments.map((c) => (c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c)),
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 lg:p-6">
        {/* Main video section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video player */}
          <div className="relative bg-secondary rounded-lg overflow-hidden aspect-video">
            <Image
              src={VIDEO_DATA.thumbnail || "/placeholder.svg"}
              alt={VIDEO_DATA.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <button className="w-20 h-20 bg-accent rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-accent-foreground ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Video title and info */}
          <div className="space-y-4">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{VIDEO_DATA.title}</h1>

            {/* Creator info and subscribe */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src={VIDEO_DATA.creator.avatar || "/placeholder.svg"}
                  alt={VIDEO_DATA.creator.name}
                  width={48}
                  height={48}
                  className="rounded-full bg-secondary"
                />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-foreground">{VIDEO_DATA.creator.name}</span>
                    {VIDEO_DATA.creator.verified && (
                      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{VIDEO_DATA.creator.subscribers} subscribers</span>
                </div>
              </div>
              <button className="px-6 py-2 bg-accent text-accent-foreground font-bold rounded-full hover:opacity-90 transition-opacity">
                Subscribe
              </button>
            </div>

            {/* Engagement bar */}
            <div className="flex gap-2 bg-secondary rounded-full p-2 flex-wrap">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  videoState.liked ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary/80"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm font-medium">{videoState.likes.toLocaleString()}</span>
              </button>

              <button
                onClick={handleDislike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  videoState.disliked ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-secondary/80"
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span className="text-sm font-medium">{videoState.dislikes.toLocaleString()}</span>
              </button>

              <button className="flex items-center gap-2 px-4 py-2 rounded-full text-foreground hover:bg-secondary/80 transition-all">
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">Share</span>
              </button>

              <button className="flex items-center gap-2 px-4 py-2 rounded-full text-foreground hover:bg-secondary/80 transition-all">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Playlist</span>
              </button>
            </div>

            {/* Description */}
            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                {VIDEO_DATA.views} views • {VIDEO_DATA.uploadedAt}
              </div>
              <p className={`text-sm text-foreground leading-relaxed ${!showFullDescription && "line-clamp-3"}`}>
                {VIDEO_DATA.description}
              </p>
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-accent text-sm font-medium hover:text-accent/80 transition-colors"
              >
                {showFullDescription ? "Show less" : "Show more"}
              </button>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 pt-2">
                {VIDEO_DATA.tags.map((tag) => (
                  <button
                    key={tag}
                    className="text-accent text-xs bg-accent/10 px-3 py-1 rounded-full hover:bg-accent/20 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comments section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Comments</h2>

            {/* Comment input */}
            <div className="flex gap-3">
              <Image
                src="/creator-avatar.jpg"
                alt="Your avatar"
                width={40}
                height={40}
                className="rounded-full bg-secondary"
              />
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 bg-secondary text-foreground placeholder-muted-foreground px-4 py-2 rounded-full border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all text-sm"
              />
            </div>

            {/* Comments list */}
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Image
                    src={comment.avatar || "/placeholder.svg"}
                    alt={comment.author}
                    width={40}
                    height={40}
                    className="rounded-full bg-secondary flex-shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-foreground">{comment.text}</p>
                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={() => handleCommentLike(comment.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          comment.liked ? "text-accent" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{comment.likes}</span>
                      </button>
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Reply
                      </button>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Up next sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-3">
            <h3 className="font-bold text-foreground text-lg">Up Next</h3>
            <div className="space-y-2">
              {UP_NEXT.map((video) => (
                <div
                  key={video.id}
                  className="bg-secondary rounded-lg overflow-hidden group cursor-pointer hover:bg-secondary/80 transition-colors"
                >
                  {/* Horizontal media card layout */}
                  <div className="flex gap-2 p-2">
                    <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded">
                      <Image
                        src={video.thumbnail || "/placeholder.svg"}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all">
                        <svg
                          className="w-6 h-6 text-accent opacity-0 group-hover:opacity-100 transition-opacity fill-accent"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-xs font-medium text-white">
                        {video.duration}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                        {video.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{video.creator}</p>
                      <p className="text-xs text-muted-foreground">{video.views} views</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
