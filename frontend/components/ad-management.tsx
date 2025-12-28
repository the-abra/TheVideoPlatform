"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Eye, EyeOff, ExternalLink, Edit2, X, ImageIcon, BarChart2, FolderOpen, VideoIcon, Home, ChevronRight, File } from "lucide-react"

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "";
};

// Drive file/folder types
interface DriveFile {
  name: string
  path: string
  size: number
  mimeType: string
  extension: string
  createdAt: string
  icon: string
  formattedSize: string
}

interface DriveFolder {
  name: string
  path: string
  createdAt: string
  size: number
}

// Ad placement types
type AdPlacement = "home-banner" | "home-sidebar" | "video-top" | "video-sidebar" | "video-random"

// Ad interface
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

// Ad stats interface
interface AdStats {
  totalAds: number
  totalClicks: number
  totalImpressions: number
  clickThroughRate: number
}

// Placement options for dropdowns
const PLACEMENT_OPTIONS: { value: AdPlacement; label: string }[] = [
  { value: "home-banner", label: "Home Banner" },
  { value: "home-sidebar", label: "Home Sidebar" },
  { value: "video-top", label: "Video Top" },
  { value: "video-sidebar", label: "Video Sidebar" },
  { value: "video-random", label: "Random (Between Videos)" },
]

interface AdManagementProps {
  onToast?: (message: string, type: "success" | "error" | "info") => void
}

export function AdManagement({ onToast }: AdManagementProps) {
  const [ads, setAds] = useState<Ad[]>([])
  const [stats, setStats] = useState<AdStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // File picker state
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [filePickerFiles, setFilePickerFiles] = useState<DriveFile[]>([])
  const [filePickerFolders, setFilePickerFolders] = useState<DriveFolder[]>([])
  const [filePickerPath, setFilePickerPath] = useState<DriveFolder[]>([])
  const [filePickerLoading, setFilePickerLoading] = useState(false)

  // Form state for creating/editing ads
  const [formData, setFormData] = useState({
    title: "",
    targetUrl: "",
    placement: "home-banner" as AdPlacement,
    enabled: true,
    imageFile: null as File | null,
    imagePreview: "",
    imageUrl: "", // For files selected from drive
  })

  // Get auth token
  const getToken = () => localStorage.getItem("titanAuthToken")

  // Show toast notification
  const showToast = (message: string, type: "success" | "error" | "info") => {
    if (onToast) {
      onToast(message, type)
    } else {
      console.log(`[${type}] ${message}`)
    }
  }

  // Get image URL with API base
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
      return imageUrl
    }
    const API_BASE = getApiBase();
    if (!API_BASE) return "/placeholder.svg";
    return `${API_BASE}${imageUrl}`
  }

  // Fetch all ads
  const fetchAds = useCallback(async () => {
    const API_BASE = getApiBase();
    if (!API_BASE) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/ads`)

      if (!response.ok) {
        throw new Error("Failed to fetch ads")
      }

      const data = await response.json()
      if (data.success && data.data?.ads) {
        setAds(data.data.ads)
      }
    } catch (error) {
      console.error("Error fetching ads:", error)
      showToast("Failed to load ads", "error")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch ad stats
  const fetchStats = useCallback(async () => {
    const API_BASE = getApiBase();
    if (!API_BASE) return;

    try {
      const response = await fetch(`${API_BASE}/api/ads/stats`)

      if (!response.ok) {
        throw new Error("Failed to fetch stats")
      }

      const data = await response.json()
      if (data.success && data.data) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [])

  // Load ads and stats on mount
  useEffect(() => {
    fetchAds()
    fetchStats()
  }, [fetchAds, fetchStats])

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      targetUrl: "",
      placement: "home-banner",
      enabled: true,
      imageFile: null,
      imagePreview: "",
      imageUrl: "",
    })
  }

  // File picker functions
  const loadFilePickerFiles = async (folderPath: string | null) => {
    setFilePickerLoading(true)
    const API_BASE = getApiBase();
    if (!API_BASE) {
      setFilePickerLoading(false);
      return;
    }

    try {
      const token = getToken()
      const url = folderPath
        ? `${API_BASE}/api/files?folderPath=${encodeURIComponent(folderPath)}`
        : `${API_BASE}/api/files`

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = await response.json()
        setFilePickerFiles(data.data?.files || [])
        setFilePickerFolders(data.data?.folders || [])
      }
    } catch (error) {
      console.error('Error loading files:', error)
    }
    setFilePickerLoading(false)
  }

  const openFilePicker = async () => {
    setFilePickerPath([])
    setShowFilePicker(true)
    await loadFilePickerFiles(null)
  }

  const navigateFilePickerFolder = async (folder: DriveFolder | null) => {
    if (!folder) {
      setFilePickerPath([])
      await loadFilePickerFiles(null)
    } else {
      // Update path
      const pathIndex = filePickerPath.findIndex(f => f.path === folder.path)
      if (pathIndex >= 0) {
        setFilePickerPath(filePickerPath.slice(0, pathIndex + 1))
      } else {
        setFilePickerPath([...filePickerPath, folder])
      }
      await loadFilePickerFiles(folder.path)
    }
  }

  const selectFileFromPicker = async (file: DriveFile) => {
    const API_BASE = getApiBase();
    if (!API_BASE) {
      showToast('Failed to select file', 'error');
      return;
    }

    try {
      const token = getToken()

      // Create share link for this file
      const response = await fetch(`${API_BASE}/api/files/${encodeURIComponent(file.path)}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ expiryHours: 0 }) // No expiry
      })

      if (response.ok) {
        const data = await response.json()
        const shareToken = data.data?.shareToken || data.shareToken
        // Store relative path so it works from any origin (PC or phone)
        const shareUrl = `/share/${shareToken}/raw`

        setFormData(prev => ({
          ...prev,
          imageUrl: shareUrl,
          imagePreview: `${window.location.origin}${shareUrl}`, // Use full URL for preview only
          imageFile: null
        }))
        showToast('File selected from drive', 'success')
      } else {
        showToast('Failed to create share link', 'error')
      }

      setShowFilePicker(false)
    } catch (error) {
      console.error('Failed to select file:', error)
      showToast('Failed to select file', 'error')
    }
  }

  // Check if file is an allowed ad media type (video, gif, image)
  const isAdMediaFile = (mimeType: string): boolean => {
    return mimeType.startsWith('image/') ||
           mimeType.startsWith('video/') ||
           mimeType === 'image/gif'
  }

  // Handle image/video file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (images and videos)
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"]
      if (!validTypes.includes(file.type)) {
        showToast("Invalid file type. Use JPG, PNG, GIF, WebP, MP4 or WebM", "error")
        return
      }

      // Validate file size (max 100MB for videos, 5MB for images)
      const maxSize = file.type.startsWith("video/") ? 100 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxSize) {
        showToast(`File too large. Maximum size is ${file.type.startsWith("video/") ? "100MB" : "5MB"}`, "error")
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          imageFile: file,
          imagePreview: reader.result as string,
          imageUrl: "", // Clear drive URL when uploading file
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Create new ad
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.targetUrl || (!formData.imageFile && !formData.imageUrl)) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const API_BASE = getApiBase();
    if (!API_BASE) {
      showToast("Failed to connect to server", "error");
      return;
    }

    try {
      setSubmitting(true)
      const token = getToken()

      const data = new FormData()
      data.append("title", formData.title)
      data.append("targetUrl", formData.targetUrl)
      data.append("placement", formData.placement)
      data.append("enabled", formData.enabled.toString())
      if (formData.imageFile) {
        data.append("image", formData.imageFile)
      } else if (formData.imageUrl) {
        data.append("imageUrl", formData.imageUrl)
      }

      const response = await fetch(`${API_BASE}/api/ads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create ad")
      }

      showToast("Ad created successfully", "success")
      setShowCreateModal(false)
      resetForm()
      fetchAds()
      fetchStats()
    } catch (error) {
      console.error("Error creating ad:", error)
      showToast(error instanceof Error ? error.message : "Failed to create ad", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Update existing ad
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingAd || !formData.title || !formData.targetUrl) {
      showToast("Please fill in all required fields", "error")
      return
    }

    const API_BASE = getApiBase();
    if (!API_BASE) {
      showToast("Failed to connect to server", "error");
      return;
    }

    try {
      setSubmitting(true)
      const token = getToken()

      const data = new FormData()
      data.append("title", formData.title)
      data.append("targetUrl", formData.targetUrl)
      data.append("placement", formData.placement)
      data.append("enabled", formData.enabled.toString())
      if (formData.imageFile) {
        data.append("image", formData.imageFile)
      } else if (formData.imageUrl && formData.imageUrl !== editingAd.imageUrl) {
        data.append("imageUrl", formData.imageUrl)
      }

      const response = await fetch(`${API_BASE}/api/ads/${editingAd.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update ad")
      }

      showToast("Ad updated successfully", "success")
      setShowEditModal(false)
      setEditingAd(null)
      resetForm()
      fetchAds()
    } catch (error) {
      console.error("Error updating ad:", error)
      showToast(error instanceof Error ? error.message : "Failed to update ad", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle ad enabled status
  const handleToggle = async (ad: Ad) => {
    const API_BASE = getApiBase();
    if (!API_BASE) {
      showToast("Failed to connect to server", "error");
      return;
    }

    try {
      const token = getToken()

      const response = await fetch(`${API_BASE}/api/ads/${ad.id}/toggle`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to toggle ad")
      }

      showToast(`Ad ${ad.enabled ? "disabled" : "enabled"} successfully`, "success")
      fetchAds()
    } catch (error) {
      console.error("Error toggling ad:", error)
      showToast("Failed to toggle ad", "error")
    }
  }

  // Delete ad
  const handleDelete = async (ad: Ad) => {
    if (!window.confirm(`Are you sure you want to delete "${ad.title}"?`)) {
      return
    }

    const API_BASE = getApiBase();
    if (!API_BASE) {
      showToast("Failed to connect to server", "error");
      return;
    }

    try {
      const token = getToken()

      const response = await fetch(`${API_BASE}/api/ads/${ad.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete ad")
      }

      showToast("Ad deleted successfully", "success")
      fetchAds()
      fetchStats()
    } catch (error) {
      console.error("Error deleting ad:", error)
      showToast("Failed to delete ad", "error")
    }
  }

  // Open edit modal
  const openEditModal = (ad: Ad) => {
    setEditingAd(ad)
    setFormData({
      title: ad.title,
      targetUrl: ad.targetUrl,
      placement: ad.placement,
      enabled: ad.enabled,
      imageFile: null,
      imagePreview: getImageUrl(ad.imageUrl),
    })
    setShowEditModal(true)
  }

  // Calculate CTR for individual ad
  const getCTR = (clicks: number, impressions: number): string => {
    if (impressions === 0) return "0.00%"
    return ((clicks / impressions) * 100).toFixed(2) + "%"
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ad Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Create and manage advertisements across the platform</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Ad
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ImageIcon className="w-4 h-4" />
              <span className="text-sm">Total Ads</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalAds}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Impressions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalImpressions.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Clicks</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalClicks.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart2 className="w-4 h-4" />
              <span className="text-sm">CTR</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.clickThroughRate.toFixed(2)}%</p>
          </div>
        </div>
      )}

      {/* Ads List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">No ads created yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first ad to start monetizing</p>
          <button
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            Create Ad
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className={`bg-card border rounded-lg overflow-hidden transition-all ${
                ad.enabled ? "border-border" : "border-red-500/30 opacity-60"
              }`}
            >
              {/* Ad Image */}
              <div className="relative aspect-video bg-secondary">
                <img
                  src={getImageUrl(ad.imageUrl)}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg"
                  }}
                />
                {!ad.enabled && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full font-medium">Disabled</span>
                  </div>
                )}
              </div>

              {/* Ad Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-foreground line-clamp-1">{ad.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{ad.placement.replace("-", " ")}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{ad.impressions} views</span>
                  <span>{ad.clicks} clicks</span>
                  <span>{getCTR(ad.clicks, ad.impressions)} CTR</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => openEditModal(ad)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggle(ad)}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                      ad.enabled
                        ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                        : "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                    }`}
                  >
                    {ad.enabled ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Enable
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(ad)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Ad Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Create New Ad</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ad Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter ad title"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              {/* Target URL */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Target URL *</label>
                <input
                  type="url"
                  value={formData.targetUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, targetUrl: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              {/* Placement */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Placement *</label>
                <select
                  value={formData.placement}
                  onChange={(e) => setFormData((prev) => ({ ...prev, placement: e.target.value as AdPlacement }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {PLACEMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ad Media *</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  {formData.imagePreview ? (
                    <div className="relative">
                      {formData.imagePreview.includes('video') || formData.imageFile?.type?.startsWith('video/') ? (
                        <video
                          src={formData.imagePreview}
                          className="w-full h-40 object-cover rounded-lg"
                          controls
                        />
                      ) : (
                        <img
                          src={formData.imagePreview}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageFile: null, imagePreview: "", imageUrl: "" }))}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="flex flex-col items-center justify-center cursor-pointer py-4 border-b border-border">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload file</span>
                        <span className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WebP, MP4, WebM</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={openFilePicker}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Or browse from Storage
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-border bg-background text-accent focus:ring-accent"
                />
                <label htmlFor="enabled" className="text-sm text-foreground">
                  Enable ad immediately
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Ad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ad Modal */}
      {showEditModal && editingAd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-foreground">Edit Ad</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingAd(null)
                  resetForm()
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ad Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter ad title"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              {/* Target URL */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Target URL *</label>
                <input
                  type="url"
                  value={formData.targetUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, targetUrl: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              {/* Placement */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Placement *</label>
                <select
                  value={formData.placement}
                  onChange={(e) => setFormData((prev) => ({ ...prev, placement: e.target.value as AdPlacement }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {PLACEMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ad Media</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  {formData.imagePreview ? (
                    <div className="relative">
                      {formData.imagePreview.includes('video') || formData.imageFile?.type?.startsWith('video/') ? (
                        <video
                          src={formData.imagePreview}
                          className="w-full h-40 object-cover rounded-lg"
                          controls
                        />
                      ) : (
                        <img
                          src={formData.imagePreview}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      )}
                      <div className="absolute bottom-2 right-2 flex gap-1">
                        <label className="px-2 py-1 bg-black/50 text-white text-xs rounded cursor-pointer hover:bg-black/70">
                          Change
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={openFilePicker}
                          className="px-2 py-1 bg-black/50 text-white text-xs rounded hover:bg-black/70 flex items-center gap-1"
                        >
                          <FolderOpen className="w-3 h-3" />
                          Storage
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="flex flex-col items-center justify-center cursor-pointer py-4 border-b border-border">
                        <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Click to upload file</span>
                        <span className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WebP, MP4, WebM</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={openFilePicker}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Or browse from Storage
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave empty to keep current media</p>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-border bg-background text-accent focus:ring-accent"
                />
                <label htmlFor="edit-enabled" className="text-sm text-foreground">
                  Ad enabled
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingAd(null)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Picker Modal */}
      {showFilePicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-lg p-6 max-w-2xl w-full space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Select Media from Storage
              </h3>
              <button onClick={() => setShowFilePicker(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto pb-2">
              <button
                onClick={() => navigateFilePickerFolder(null)}
                className="hover:text-foreground flex items-center gap-1"
              >
                <Home className="w-4 h-4" />
                Root
              </button>
              {filePickerPath.map((folder) => (
                <div key={folder.path} className="flex items-center gap-1">
                  <ChevronRight className="w-4 h-4" />
                  <button
                    onClick={() => navigateFilePickerFolder(folder)}
                    className="hover:text-foreground"
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto border border-border rounded-lg">
              {filePickerLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* Folders */}
                  {filePickerFolders.map((folder) => (
                    <button
                      key={`folder-${folder.path}`}
                      onClick={() => navigateFilePickerFolder(folder)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left"
                    >
                      <FolderOpen className="w-5 h-5 text-accent" />
                      <span className="text-foreground font-medium">{folder.name}</span>
                    </button>
                  ))}

                  {/* Files - filtered by media type */}
                  {filePickerFiles
                    .filter((file) => isAdMediaFile(file.mimeType))
                    .map((file) => (
                      <button
                        key={`file-${file.path}`}
                        onClick={() => selectFileFromPicker(file)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left"
                      >
                        {file.mimeType.startsWith('video/') ? (
                          <VideoIcon className="w-5 h-5 text-blue-400" />
                        ) : (
                          <File className="w-5 h-5 text-green-400" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.formattedSize} • {file.mimeType}
                          </p>
                        </div>
                      </button>
                    ))}

                  {/* Empty state */}
                  {filePickerFolders.length === 0 &&
                   filePickerFiles.filter((f) => isAdMediaFile(f.mimeType)).length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <p>No media files found in this folder</p>
                      <p className="text-sm mt-1">Images, GIFs, and videos are supported</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowFilePicker(false)}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
