"use client"

import Link from "next/link"
import Image from "next/image"
import { Play } from "lucide-react"

interface MediaCardProps {
  id: number
  thumbnail: string
  title: string
  creator: string
  duration: string
  views: string
  uploadedAt: string
  verified?: boolean
}

export function MediaCard({
  id,
  thumbnail,
  title,
  creator,
  duration,
  views,
  uploadedAt,
  verified = false,
}: MediaCardProps) {
  return (
    <Link href={`/watch/${id}`}>
      <div className="group cursor-pointer">
        <div className="relative mb-3 overflow-hidden rounded-md bg-secondary">
          {/* 16:9 aspect ratio container */}
          <div className="aspect-video relative">
            <Image
              src={thumbnail || "/placeholder.svg"}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

            {/* Play icon on hover */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/20">
              <Play
                className="h-12 w-12 text-accent opacity-0 transition-opacity duration-300 fill-accent group-hover:opacity-100"
                strokeWidth={0}
              />
            </div>

            {/* Duration in bottom-left */}
            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs font-medium text-white">
              {duration}
            </div>
          </div>
        </div>

        {/* Title - two lines */}
        <h3 className="font-bold text-foreground line-clamp-2 text-sm mb-1 group-hover:text-accent transition-colors">
          {title}
        </h3>

        {/* Creator and views info */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <span className="font-medium">{creator}</span>
          {verified && (
            <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Views and time info */}
        <p className="text-xs text-muted-foreground">
          {views} views • {uploadedAt}
        </p>
      </div>
    </Link>
  )
}
