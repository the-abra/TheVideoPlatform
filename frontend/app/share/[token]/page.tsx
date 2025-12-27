"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Download, FileText, Image, Film, Music, Archive, File, AlertCircle, Loader2, Copy, Check, Link2, ExternalLink } from "lucide-react"

interface SharedFile {
  name: string
  size: number
  mimeType: string
  downloads: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export default function SharePage() {
  const params = useParams()
  const token = params.token as string

  const [file, setFile] = useState<SharedFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const directUrl = typeof window !== "undefined" ? `${window.location.origin}/share/${token}/raw` : ""

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/share/${token}`)
        const data = await response.json()

        if (data.success) {
          setFile(data.data)
        } else {
          setError(data.error || "File not found or link has expired")
        }
      } catch (err) {
        setError("Failed to load file information")
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchFileInfo()
    }
  }, [token])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`${API_URL}/api/share/${token}/download`)
      if (!response.ok) {
        throw new Error("Download failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file?.name || "download"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Refresh file info to update download count
      const infoResponse = await fetch(`${API_URL}/api/share/${token}`)
      const data = await infoResponse.json()
      if (data.success) {
        setFile(data.data)
      }
    } catch (err) {
      setError("Download failed")
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyDirectLink = async () => {
    try {
      await navigator.clipboard.writeText(directUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="w-16 h-16 text-blue-400" />
    if (mimeType.startsWith("video/")) return <Film className="w-16 h-16 text-purple-400" />
    if (mimeType.startsWith("audio/")) return <Music className="w-16 h-16 text-green-400" />
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text"))
      return <FileText className="w-16 h-16 text-red-400" />
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("compressed"))
      return <Archive className="w-16 h-16 text-yellow-400" />
    return <File className="w-16 h-16 text-gray-400" />
  }

  const renderPreview = () => {
    if (!file) return null

    if (file.mimeType.startsWith("image/")) {
      return (
        <div className="mb-6 rounded-xl overflow-hidden border border-gray-700 bg-gray-900/50">
          <img
            src={directUrl}
            alt={file.name}
            className="max-w-full max-h-[400px] mx-auto object-contain"
          />
        </div>
      )
    }

    if (file.mimeType.startsWith("video/")) {
      return (
        <div className="mb-6 rounded-xl overflow-hidden border border-gray-700 bg-gray-900/50">
          <video
            src={directUrl}
            controls
            className="max-w-full max-h-[400px] mx-auto"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )
    }

    if (file.mimeType.startsWith("audio/")) {
      return (
        <div className="mb-6 p-4 rounded-xl border border-gray-700 bg-gray-900/50">
          <audio src={directUrl} controls className="w-full">
            Your browser does not support the audio tag.
          </audio>
        </div>
      )
    }

    // Default: show icon
    return (
      <div className="mb-6 flex justify-center">
        {getFileIcon(file.mimeType)}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading file information...</p>
        </div>
      </div>
    )
  }

  if (error || !file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">File Not Found</h1>
          <p className="text-gray-400 mb-6">{error || "This share link is invalid or has expired."}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 max-w-2xl w-full">
        <div className="text-center">
          {renderPreview()}

          <h1 className="text-xl font-bold text-white mb-2 break-all">{file.name}</h1>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-6">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{file.downloads} downloads</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl transition-colors text-lg font-medium"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download
                </>
              )}
            </button>

            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors text-lg font-medium"
            >
              <ExternalLink className="w-5 h-5" />
              Open Direct
            </a>
          </div>

          {/* Direct Link Section */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Link2 className="w-4 h-4" />
              <span>Direct Link (for embedding)</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={directUrl}
                readOnly
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono truncate"
              />
              <button
                onClick={handleCopyDirectLink}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Use this URL to embed images, videos, or link directly to the file
            </p>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Shared via Titan Drive
          </p>
        </div>
      </div>
    </div>
  )
}
