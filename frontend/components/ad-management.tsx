"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Eye, EyeOff, ExternalLink, Edit2, X, ImageIcon, BarChart2 } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Ad placement types
type AdPlacement = "home-banner" | "home-sidebar" | "video-top" | "video-sidebar"

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

  // Form state for creating/editing ads
  const [formData, setFormData] = useState({
    title: "",
    targetUrl: "",
    placement: "home-banner" as AdPlacement,
    enabled: true,
    imageFile: null as File | null,
    imagePreview: "",
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
    if (imageUrl.startsWith("http")) return imageUrl
    return `${API_BASE}${imageUrl}`
  }

  // Fetch all ads
  const fetchAds = useCallback(async () => {
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
    })
  }

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      if (!validTypes.includes(file.type)) {
        showToast("Invalid file type. Use JPG, PNG, GIF, or WebP", "error")
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast("File too large. Maximum size is 5MB", "error")
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          imageFile: file,
          imagePreview: reader.result as string,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Create new ad
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.targetUrl || !formData.imageFile) {
      showToast("Please fill in all required fields", "error")
      return
    }

    try {
      setSubmitting(true)
      const token = getToken()

      const data = new FormData()
      data.append("title", formData.title)
      data.append("targetUrl", formData.targetUrl)
      data.append("placement", formData.placement)
      data.append("enabled", formData.enabled.toString())
      data.append("image", formData.imageFile)

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

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ad Image *</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  {formData.imagePreview ? (
                    <div className="relative">
                      <img
                        src={formData.imagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageFile: null, imagePreview: "" }))}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload image</span>
                      <span className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF, WebP (max 5MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
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

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ad Image</label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  {formData.imagePreview ? (
                    <div className="relative">
                      <img
                        src={formData.imagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <label className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded cursor-pointer hover:bg-black/70">
                        Change Image
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Click to upload image</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave empty to keep current image</p>
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
    </div>
  )
}
