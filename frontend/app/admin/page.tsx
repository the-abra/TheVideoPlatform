"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Toast } from "@/components/toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Terminal as XTerminal } from "@/components/terminal"
import { AdManagement } from "@/components/ad-management"
import { storage, type Video, type Category, type ServerInfo, type ServerMetrics, type ServerLog, type DriveFile, type DriveFolder } from "@/lib/storage"
import {
  BarChart3,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  VideoIcon,
  Settings,
  Upload,
  Play,
  Users,
  Eye,
  Save,
  X,
  Server,
  Terminal,
  Activity,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  Send,
  RefreshCw,
  Trash,
  Circle,
  FolderOpen,
  File,
  Download,
  Share2,
  Link,
  Copy,
  FolderPlus,
  FileUp,
  ChevronRight,
  Home,
} from "lucide-react"
import { useRouter } from "next/navigation"

// Determine API and WebSocket bases based on the current location for better environment compatibility
const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
};

const getWsBase = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.hostname}:5000`;
  }
  return "ws://localhost:5000";
};

const API_BASE = getApiBase();
const WS_BASE = getWsBase();

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [activeTab, setActiveTab] = useState<"videos" | "categories" | "ads" | "analytics" | "settings" | "server" | "drive">("videos")
  const [videos, setVideos] = useState<Video[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showAddVideo, setShowAddVideo] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newVideo, setNewVideo] = useState({
    title: "",
    url: "",
    creator: "",
    thumbnail: "",
    category: "other" as const,
  })
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwordError, setPasswordError] = useState("")
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  const [newVideoFormState, setNewVideoFormState] = useState({
    title: "",
    url: "",
    creator: "",
    thumbnail: "",
    category: "",
    duration: "",
  })

  const [newCategory, setNewCategory] = useState({
    name: "",
    icon: "📁",
  })

  const [siteSettings, setSiteSettings] = useState({
    siteName: "MEDIAHUB",
    siteDescription: "Your premium streaming platform",
    maintenanceMode: false,
    allowNewUploads: true,
    featuredVideoId: "",
  })

  // Ad management is handled by the AdManagement component

  // Server management state
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null)
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([])
  const [consoleInput, setConsoleInput] = useState("")
  const [consoleHistory, setConsoleHistory] = useState<{ command: string; output: string; success: boolean; timestamp: string }[]>([])
  const [isServerLoading, setIsServerLoading] = useState(false)
  const [metricsWs, setMetricsWs] = useState<WebSocket | null>(null)
  const [logsWs, setLogsWs] = useState<WebSocket | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isServerDataLoading, setIsServerDataLoading] = useState(false)

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([])
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<DriveFolder[]>([])
  const [isDriveLoading, setIsDriveLoading] = useState(false)
  const [driveStats, setDriveStats] = useState({ totalFiles: 0, totalSize: 0 })
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [shareModal, setShareModal] = useState<{ file: DriveFile; shareUrl: string } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  // File picker state for video creation
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [filePickerMode, setFilePickerMode] = useState<'video' | 'thumbnail'>('video')
  const [filePickerFiles, setFilePickerFiles] = useState<DriveFile[]>([])
  const [filePickerFolders, setFilePickerFolders] = useState<DriveFolder[]>([])
  const [filePickerFolderId, setFilePickerFolderId] = useState<number | null>(null)
  const [filePickerLoading, setFilePickerLoading] = useState(false)
  const [filePickerPath, setFilePickerPath] = useState<DriveFolder[]>([])

  useEffect(() => {
    setIsAuthChecking(true)
    const authStatus = storage.isAuthenticated()
    setIsAuthenticated(authStatus)

    // Load auth token from localStorage
    const savedToken = localStorage.getItem("titanAuthToken")
    if (savedToken) {
      setAuthToken(savedToken)
    }

    if (authStatus) {
      loadData()
      // Ads are now loaded by the AdManagement component
    }

    const savedSettings = localStorage.getItem("titan_site_settings")
    if (savedSettings) {
      setSiteSettings(JSON.parse(savedSettings))
    }
    setIsAuthChecking(false)

    const loadedSettings = storage.getSiteSettings()
    setSiteSettings(loadedSettings)
  }, [])

  // loadAds is now handled by the AdManagement component

  const loadData = async () => {
    // Load videos and categories from API instead of localStorage
    try {
      // Load videos from API
      const videoResponse = await fetch(`${API_BASE}/api/videos`)
      if (videoResponse.ok) {
        const videoData = await videoResponse.json()
        setVideos(videoData.data?.videos || [])
      } else {
        // Fallback to localStorage if API fails
        setVideos(storage.getVideos())
      }

      // Load categories from API
      const categoryResponse = await fetch(`${API_BASE}/api/categories`)
      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json()
        setCategories(categoryData.data?.categories || [])
      } else {
        // Fallback to localStorage if API fails
        setCategories(storage.getCategories())
      }
    } catch (error) {
      console.error("Failed to load data from API, using localStorage fallback", error)
      // Fallback to localStorage if API fails
      setVideos(storage.getVideos())
      setCategories(storage.getCategories())
    }
  }

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type })
  }

  const validateVideoForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!newVideoFormState.title.trim()) {
      newErrors.title = "Title is required"
    } else if (newVideoFormState.title.length < 3) {
      newErrors.title = "Title must be at least 3 characters"
    }

    if (!newVideoFormState.url.trim()) {
      newErrors.url = "Video URL is required"
    } else if (!newVideoFormState.url.startsWith("http")) {
      newErrors.url = "Please enter a valid URL"
    }

    if (!newVideoFormState.creator.trim()) {
      newErrors.creator = "Creator name is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (!passwordInput.trim()) {
      setPasswordError("Please enter a password")
      return
    }

    setIsLoading(true)
    try {
      // Try to authenticate with backend
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: passwordInput })
      })
      const data = await res.json()

      if (data.success && data.data?.token) {
        setAuthToken(data.data.token)
        localStorage.setItem("titanAuthToken", data.data.token)
        setIsAuthenticated(true)
        storage.setAuthenticated(true)
        setPasswordInput("")
        showToast("Successfully logged in", "success")
        loadData()
      } else {
        setPasswordError(data.error || "Incorrect password")
        setPasswordInput("")
      }
    } catch (error) {
      setPasswordError("Unable to connect to server")
      setPasswordInput("")
    }
    setIsLoading(false)
  }

  // File picker functions
  const openFilePicker = async (mode: 'video' | 'thumbnail') => {
    setFilePickerMode(mode)
    setFilePickerFolderId(null)
    setFilePickerPath([])
    setShowFilePicker(true)
    await loadFilePickerFiles(null)
  }

  const loadFilePickerFiles = async (folderPath: string | null) => {
    setFilePickerLoading(true)
    try {
      const token = authToken || localStorage.getItem("titanAuthToken")
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
      console.error('Failed to load files:', error)
    } finally {
      setFilePickerLoading(false)
    }
  }

  const navigateFilePickerFolder = async (folder: DriveFolder | null) => {
    if (folder === null) {
      // Go to root
      setFilePickerFolderId(null)
      setFilePickerPath([])
      await loadFilePickerFiles(null)
    } else {
      setFilePickerFolderId(folder.path ? parseInt(folder.path.split('/').pop() || '0') : null) // Keep this for UI consistency
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
    try {
      const token = authToken || localStorage.getItem("titanAuthToken")
      let shareUrl = ''

      console.log('[FilePicker] Creating share link for:', file.path)

      // Create share link for this file
      const response = await fetch(`${API_BASE}/api/files/${encodeURIComponent(file.path)}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ expiryHours: 0 }) // No expiry
      })

      const data = await response.json()
      console.log('[FilePicker] Share response:', response.status, data)

      if (response.ok && data.success) {
        const shareToken = data.data?.shareToken || data.shareToken
        shareUrl = `${window.location.origin}/share/${shareToken}/raw`
      } else {
        showToast(data.error || 'Failed to create share link', 'error')
        return
      }

      // Set the URL based on mode
      if (filePickerMode === 'video') {
        setNewVideoFormState({ ...newVideoFormState, url: shareUrl })
      } else {
        setNewVideoFormState({ ...newVideoFormState, thumbnail: shareUrl })
      }

      setShowFilePicker(false)
      showToast(`${filePickerMode === 'video' ? 'Video' : 'Thumbnail'} URL set from drive`, 'success')
    } catch (error) {
      console.error('Failed to select file:', error)
      showToast('Failed to select file', 'error')
    }
  }

  const isVideoFile = (mimeType: string) => {
    return mimeType.startsWith('video/')
  }

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleAddVideo = async () => {
    if (!validateVideoForm()) {
      showToast("Please fix the errors in the form", "error")
      return
    }

    setIsLoading(true)

    try {
      const token = await getAuthToken()
      if (!token) {
        showToast("Authentication failed", "error")
        setIsLoading(false)
        return
      }

      // Prepare form data for the video
      // The backend expects the video URL to be sent as the "url" field
      const formData = new FormData()
      formData.append('title', newVideoFormState.title)
      formData.append('url', newVideoFormState.url)  // The actual video URL
      formData.append('creator', newVideoFormState.creator)

      // Only append thumbnail if it's provided
      if (newVideoFormState.thumbnail) {
        formData.append('thumbnail', newVideoFormState.thumbnail)
      }
      if (newVideoFormState.category) {
        formData.append('category', newVideoFormState.category)
      }
      if (newVideoFormState.duration) {
        formData.append('duration', newVideoFormState.duration)
      }

      const response = await fetch(`${API_BASE}/api/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })

      if (response.ok) {
        // Reload videos from API
        loadData()
        setNewVideoFormState({ title: "", url: "", creator: "", thumbnail: "", category: "other", duration: "" })
        setShowAddVideo(false)
        setErrors({})
        showToast("Video added successfully", "success")
      } else {
        const errorData = await response.json()
        showToast(errorData.error || "Failed to add video", "error")
      }
    } catch (error) {
      console.error("Error adding video:", error)
      showToast("Error adding video: " + error.message, "error")
    }

    setIsLoading(false)
  }

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video)
    setNewVideoFormState({
      title: video.title,
      url: video.url,
      creator: video.creator,
      thumbnail: video.thumbnail,
      category: video.category,
      duration: video.duration,
    })
    setErrors({})
  }

  const handleSaveEdit = async () => {
    if (!validateVideoForm() || !editingVideo) {
      showToast("Please fix the errors in the form", "error")
      return
    }

    setIsLoading(true)

    try {
      const token = await getAuthToken()
      if (!token) {
        showToast("Authentication failed", "error")
        setIsLoading(false)
        return
      }

      // Prepare form data for the video
      const formData = new FormData()
      formData.append('title', newVideoFormState.title)
      formData.append('url', newVideoFormState.url)
      formData.append('creator', newVideoFormState.creator)
      if (newVideoFormState.thumbnail) {
        formData.append('thumbnail', newVideoFormState.thumbnail)
      }
      if (newVideoFormState.category) {
        formData.append('category', newVideoFormState.category)
      }
      if (newVideoFormState.duration) {
        formData.append('duration', newVideoFormState.duration)
      }

      const response = await fetch(`${API_BASE}/api/videos/${editingVideo.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })

      if (response.ok) {
        // Reload videos from API
        loadData()
        setEditingVideo(null)
        setNewVideoFormState({ title: "", url: "", creator: "", thumbnail: "", category: "other", duration: "" })
        setErrors({})
        showToast("Video updated successfully", "success")
      } else {
        const errorData = await response.json()
        showToast(errorData.error || "Failed to update video", "error")
      }
    } catch (error) {
      console.error("Error updating video:", error)
      showToast("Error updating video: " + error.message, "error")
    }

    setIsLoading(false)
  }

  const handleDeleteVideo = async (id: number) => {
    if (!confirm("Are you sure you want to delete this video? This action cannot be undone.")) {
      return
    }

    setIsLoading(true)

    try {
      const token = await getAuthToken()
      if (!token) {
        showToast("Authentication failed", "error")
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE}/api/videos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (response.ok) {
        // Reload videos from API
        loadData()
        showToast("Video deleted successfully", "success")
      } else {
        const errorData = await response.json()
        showToast(errorData.error || "Failed to delete video", "error")
      }
    } catch (error) {
      console.error("Error deleting video:", error)
      showToast("Error deleting video: " + error.message, "error")
    }

    setIsLoading(false)
  }

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      showToast("Please enter a category name", "error")
      return
    }

    try {
      const token = await getAuthToken()
      if (!token) {
        showToast("Authentication failed", "error")
        return
      }

      const category: Category = {
        id: newCategory.name.toLowerCase().replace(/\s+/g, "-"),
        name: newCategory.name,
        icon: newCategory.icon,
      }

      const response = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(category)
      })

      if (response.ok) {
        // Reload categories from API
        loadData()
        setNewCategory({ name: "", icon: "📁" })
        showToast("Category added successfully", "success")
      } else {
        const errorData = await response.json()
        showToast(errorData.error || "Failed to add category", "error")
      }
    } catch (error) {
      console.error("Error adding category:", error)
      showToast("Error adding category: " + error.message, "error")
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return

    try {
      const token = await getAuthToken()
      if (!token) {
        showToast("Authentication failed", "error")
        return
      }

      const response = await fetch(`${API_BASE}/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editingCategory)
      })

      if (response.ok) {
        // Reload categories from API
        loadData()
        setEditingCategory(null)
        showToast("Category updated successfully", "success")
      } else {
        const errorData = await response.json()
        showToast(errorData.error || "Failed to update category", "error")
      }
    } catch (error) {
      console.error("Error updating category:", error)
      showToast("Error updating category: " + error.message, "error")
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? Videos with this category will not be deleted."))
      return

    try {
      const token = await getAuthToken()
      if (!token) {
        showToast("Authentication failed", "error")
        return
      }

      const response = await fetch(`${API_BASE}/api/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (response.ok) {
        // Reload categories from API
        loadData()
        showToast("Category deleted successfully", "success")
      } else {
        const errorData = await response.json()
        showToast(errorData.error || "Failed to delete category", "error")
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      showToast("Error deleting category: " + error.message, "error")
    }
  }

  const handleSaveSettings = async () => {
    try {
      const token = await getAuthToken()
      if (!token) {
        showToast("Authentication failed", "error")
        return
      }

      const response = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(siteSettings)
      })

      if (response.ok) {
        showToast("Settings saved successfully", "success")
        window.dispatchEvent(new Event("storage"))
      } else {
        const errorData = await response.json()
        showToast(errorData.error || "Failed to save settings", "error")
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      showToast("Error saving settings: " + error.message, "error")
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    storage.setAuthenticated(false)
    showToast("Logged out successfully", "info")
    // Clear loaded data upon logout
    setVideos([])
    setCategories([])
    // Clean up WebSocket connections
    if (metricsWs) metricsWs.close()
    if (logsWs) logsWs.close()
  }

  // Server management functions
  const getAuthToken = async (): Promise<string | null> => {
    // Check if we have a valid token
    const token = authToken || localStorage.getItem("titanAuthToken")
    return token
  }

  const fetchServerInfo = async () => {
    const token = await getAuthToken()
    if (!token) {
      console.warn("[Server] No auth token available for fetchServerInfo")
      setServerError("Authentication failed. Please refresh and login again.")
      return
    }
    console.log("[Server] Fetching server info...")
    try {
      const res = await fetch(`${API_BASE}/api/server/info`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      console.log("[Server] Server info response:", data)
      if (data.success) {
        setServerInfo(data.data.server)
        setServerError(null)
      } else {
        setServerError(data.error || "Failed to fetch server info")
      }
    } catch (error) {
      console.error("[Server] Failed to fetch server info:", error)
      setServerError(`Connection failed: ${error}. Make sure backend is running on ${API_BASE}`)
    }
  }

  const fetchServerMetrics = async () => {
    const token = await getAuthToken()
    if (!token) {
      console.warn("[Server] No auth token available for fetchServerMetrics")
      return
    }
    console.log("[Server] Fetching server metrics...")
    try {
      const res = await fetch(`${API_BASE}/api/server/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      console.log("[Server] Server metrics response:", data)
      if (data.success) setServerMetrics(data.data.metrics)
    } catch (error) {
      console.error("[Server] Failed to fetch server metrics:", error)
    }
  }

  const fetchServerLogs = async () => {
    const token = await getAuthToken()
    if (!token) {
      console.warn("[Server] No auth token available for fetchServerLogs")
      return
    }
    console.log("[Server] Fetching server logs...")
    try {
      const res = await fetch(`${API_BASE}/api/server/logs?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      console.log("[Server] Server logs response:", data)
      if (data.success) setServerLogs(data.data.logs || [])
    } catch (error) {
      console.error("[Server] Failed to fetch server logs:", error)
    }
  }

  const executeCommand = async (command: string) => {
    if (!command.trim()) return
    const token = await getAuthToken()
    if (!token) {
      setConsoleHistory(prev => [...prev, {
        command,
        output: "Error: Not authenticated. Please refresh and login again.",
        success: false,
        timestamp: new Date().toISOString()
      }])
      return
    }

    setIsServerLoading(true)
    console.log("[Server] Executing command:", command)
    try {
      const res = await fetch(`${API_BASE}/api/server/command`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ command })
      })
      const data = await res.json()
      console.log("[Server] Command response:", data)
      if (data.success) {
        const result = data.data.result
        setConsoleHistory(prev => [...prev, {
          command: result.command,
          output: result.output,
          success: result.success,
          timestamp: result.timestamp
        }])
      } else {
        setConsoleHistory(prev => [...prev, {
          command,
          output: data.error || "Error: Command failed",
          success: false,
          timestamp: new Date().toISOString()
        }])
      }
    } catch (error) {
      console.error("[Server] Command execution failed:", error)
      setConsoleHistory(prev => [...prev, {
        command,
        output: `Error: Failed to execute command - ${error}`,
        success: false,
        timestamp: new Date().toISOString()
      }])
    }
    setConsoleInput("")
    setIsServerLoading(false)
  }

  const clearLogs = async () => {
    if (!confirm("Clear logs older than 7 days?")) return
    const token = await getAuthToken()
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/server/logs?days=7`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        showToast("Logs cleared successfully", "success")
        fetchServerLogs()
      }
    } catch (error) {
      showToast("Failed to clear logs", "error")
    }
  }

  const connectWebSockets = () => {
    console.log("[Server] Connecting to WebSockets...")

    // Connect to metrics WebSocket
    try {
      const metrics = new WebSocket(`${WS_BASE}/ws/metrics`)
      metrics.onopen = () => {
        console.log("[Server] Metrics WebSocket connected")
        showToast("Real-time metrics connected", "success")
      }
      metrics.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setServerMetrics(data)
        } catch (e) {
          console.warn("[Server] Failed to parse metrics:", e)
        }
      }
      metrics.onerror = () => {
        // WebSocket errors are common and don't affect HTTP data loading
        console.warn("[Server] Metrics WebSocket connection failed - using HTTP polling")
      }
      metrics.onclose = () => console.log("[Server] Metrics WebSocket closed")
      setMetricsWs(metrics)
    } catch (error) {
      console.warn("[Server] Failed to connect to metrics WebSocket:", error)
    }

    // Connect to logs WebSocket
    try {
      const logs = new WebSocket(`${WS_BASE}/ws/logs`)
      logs.onopen = () => {
        console.log("[Server] Logs WebSocket connected")
      }
      logs.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data)
          setServerLogs(prev => [log, ...prev].slice(0, 100))
        } catch (e) {
          console.warn("[Server] Failed to parse log:", e)
        }
      }
      logs.onerror = () => {
        console.warn("[Server] Logs WebSocket connection failed - logs will refresh manually")
      }
      logs.onclose = () => console.log("[Server] Logs WebSocket closed")
      setLogsWs(logs)
    } catch (error) {
      console.warn("[Server] Failed to connect to logs WebSocket:", error)
    }
  }

  // Effect to handle server tab
  useEffect(() => {
    if (activeTab === "server") {
      console.log("[Server] Server tab activated, loading data...")
      setIsServerDataLoading(true)
      setServerError(null)

      const loadData = async () => {
        await fetchServerInfo()
        await fetchServerMetrics()
        await fetchServerLogs()
        setIsServerDataLoading(false)
      }

      loadData()
      connectWebSockets()

      // Poll metrics every second for real-time updates
      const metricsInterval = setInterval(() => {
        fetchServerMetrics()
      }, 1000)

      // Poll logs every 5 seconds
      const logsInterval = setInterval(() => {
        fetchServerLogs()
      }, 5000)

      return () => {
        console.log("[Server] Cleaning up connections...")
        clearInterval(metricsInterval)
        clearInterval(logsInterval)
        if (metricsWs) metricsWs.close()
        if (logsWs) logsWs.close()
      }
    }
  }, [activeTab])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m ${seconds % 60}s`
  }

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "error": return "text-red-500"
      case "warn": case "warning": return "text-yellow-500"
      case "info": return "text-blue-500"
      case "debug": return "text-gray-500"
      default: return "text-foreground"
    }
  }

  // Drive functions
  const fetchDriveFiles = async (folderPath: string | null = null) => {
    const token = await getAuthToken()
    if (!token) return

    setIsDriveLoading(true)
    try {
      const url = folderPath
        ? `${API_BASE}/api/files?folderPath=${encodeURIComponent(folderPath)}`
        : `${API_BASE}/api/files`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setDriveFiles(data.data.files || [])
        setDriveFolders(data.data.folders || [])
        setDriveStats({
          totalFiles: data.data.totalFiles || 0,
          totalSize: data.data.totalSize || 0
        })
      }
    } catch (error) {
      console.error("[Drive] Failed to fetch files:", error)
      showToast("Failed to load files", "error")
    } finally {
      setIsDriveLoading(false)
    }
  }

  const fetchFolderPath = async (folderPath: string) => {
    const token = await getAuthToken()
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/folders/${encodeURIComponent(folderPath)}/path`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setFolderPath(data.data.path || [])
      }
    } catch (error) {
      console.error("[Drive] Failed to fetch folder path:", error)
    }
  }

  const navigateToFolder = (folderPath: string | null) => {
    setCurrentFolderPath(folderPath)
    setSelectedFiles([])
    fetchDriveFiles(folderPath)
    if (folderPath) {
      fetchFolderPath(folderPath)
    } else {
      setFolderPath([])
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const token = await getAuthToken()
    if (!token) return

    setUploadProgress(0)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append("file", file)
      if (currentFolderPath) {
        formData.append("folderPath", currentFolderPath)
      }

      try {
        const res = await fetch(`${API_BASE}/api/files/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        const data = await res.json()
        if (data.success) {
          setUploadProgress(Math.round(((i + 1) / files.length) * 100))
        } else {
          showToast(`Failed to upload ${file.name}`, "error")
        }
      } catch (error) {
        console.error("[Drive] Upload error:", error)
        showToast(`Failed to upload ${file.name}`, "error")
      }
    }

    setUploadProgress(null)
    showToast("Files uploaded successfully", "success")
    fetchDriveFiles(currentFolderPath)
    e.target.value = ""
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    const token = await getAuthToken()
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/folders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentPath: currentFolderPath
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast("Folder created", "success")
        setShowNewFolderModal(false)
        setNewFolderName("")
        fetchDriveFiles(currentFolderPath)
      } else {
        showToast(data.error || "Failed to create folder", "error")
      }
    } catch (error) {
      console.error("[Drive] Create folder error:", error)
      showToast("Failed to create folder", "error")
    }
  }

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return

    const token = await getAuthToken()
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/files/${encodeURIComponent(fileName)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        showToast("File deleted", "success")
        fetchDriveFiles(currentFolderPath)
      } else {
        showToast(data.error || "Failed to delete file", "error")
      }
    } catch (error) {
      console.error("[Drive] Delete error:", error)
      showToast("Failed to delete file", "error")
    }
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!confirm("Are you sure you want to delete this folder and all its contents?")) return

    const token = await getAuthToken()
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/folders/${encodeURIComponent(folderPath)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        showToast("Folder deleted", "success")
        fetchDriveFiles(currentFolderPath)
      } else {
        showToast(data.error || "Failed to delete folder", "error")
      }
    } catch (error) {
      console.error("[Drive] Delete folder error:", error)
      showToast("Failed to delete folder", "error")
    }
  }

  const handleDownloadFile = async (file: DriveFile) => {
    const token = await getAuthToken()
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/files/${encodeURIComponent(file.path)}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[Drive] Download error:", error)
      showToast("Failed to download file", "error")
    }
  }

  const handleCreateShareLink = async (file: DriveFile) => {
    const token = await getAuthToken()
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/files/${encodeURIComponent(file.path)}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ expiryHours: 0 })
      })
      const data = await res.json()
      if (data.success) {
        const shareToken = data.data?.shareToken || data.shareToken
        const shareUrl = `${window.location.origin}/share/${shareToken}`
        setShareModal({ file, shareUrl })
        fetchDriveFiles(currentFolderPath)
      } else {
        showToast(data.error || "Failed to create share link", "error")
      }
    } catch (error) {
      console.error("[Drive] Share error:", error)
      showToast("Failed to create share link", "error")
    }
  }

  const handleCopyShareLink = () => {
    if (shareModal) {
      navigator.clipboard.writeText(shareModal.shareUrl)
      showToast("Link copied to clipboard", "success")
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return

    const token = await getAuthToken()
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/api/files/bulk`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fileNames: selectedFiles })
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${data.data.deleted} files deleted`, "success")
        setSelectedFiles([])
        fetchDriveFiles(currentFolderPath)
      } else {
        showToast(data.error || "Failed to delete files", "error")
      }
    } catch (error) {
      console.error("[Drive] Bulk delete error:", error)
      showToast("Failed to delete files", "error")
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "🖼️"
    if (mimeType.startsWith("video/")) return "🎬"
    if (mimeType.startsWith("audio/")) return "🎵"
    if (mimeType.includes("pdf")) return "📄"
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝"
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊"
    if (mimeType.includes("zip") || mimeType.includes("compressed")) return "📦"
    return "📁"
  }

  // Effect to load drive files when tab is active
  useEffect(() => {
    if (activeTab === "drive") {
      fetchDriveFiles(currentFolderPath)
    }
  }, [activeTab])

  const totalViews = videos.reduce((sum, video) => sum + Number.parseInt(video.views || "0"), 0)
  const videosByCategory = videos.reduce(
    (acc, video) => {
      acc[video.category] = (acc[video.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Admin Access</h1>
            <p className="text-muted-foreground">Enter password to continue</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter admin password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  setPasswordError("")
                }}
                className={`w-full bg-secondary text-foreground placeholder-muted-foreground px-4 py-3 rounded-lg border ${
                  passwordError ? "border-red-500" : "border-border"
                } focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 transition-all`}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {passwordError}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : "Enter"}
            </button>
          </form>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Admin Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your platform</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-2 mb-8 border-b border-border overflow-x-auto">
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "videos"
                ? "text-accent border-accent"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <VideoIcon className="w-4 h-4" />
            Video Management
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "categories"
                ? "text-accent border-accent"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Upload className="w-4 h-4" />
            Categories
          </button>

          <button
            onClick={() => setActiveTab("ads")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "ads"
                ? "text-accent border-accent"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Ads
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "analytics"
                ? "text-accent border-accent"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "settings"
                ? "text-accent border-accent"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Settings className="w-4 h-4" />
            Site Settings
          </button>
          <button
            onClick={() => setActiveTab("server")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "server"
                ? "text-accent border-accent"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Server className="w-4 h-4" />
            Server
          </button>
          <button
            onClick={() => setActiveTab("drive")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "drive"
                ? "text-accent border-accent"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Drive
          </button>
        </div>

        {activeTab === "videos" && (
          <div className="space-y-6">
            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Add New Video</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                  <input
                    type="text"
                    value={newVideoFormState.title}
                    onChange={(e) => setNewVideoFormState({ ...newVideoFormState, title: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                    placeholder="Enter video title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Video URL *</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newVideoFormState.url}
                      onChange={(e) => setNewVideoFormState({ ...newVideoFormState, url: e.target.value })}
                      className="flex-1 bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                      placeholder="https://example.com/video.mp4"
                    />
                    <button
                      type="button"
                      onClick={() => openFilePicker('video')}
                      className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                      title="Browse Drive"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Creator *</label>
                  <input
                    type="text"
                    value={newVideoFormState.creator}
                    onChange={(e) => setNewVideoFormState({ ...newVideoFormState, creator: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                    placeholder="Creator name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Thumbnail URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newVideoFormState.thumbnail}
                      onChange={(e) => setNewVideoFormState({ ...newVideoFormState, thumbnail: e.target.value })}
                      className="flex-1 bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                    <button
                      type="button"
                      onClick={() => openFilePicker('thumbnail')}
                      className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                      title="Browse Drive"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                  <select
                    value={newVideoFormState.category}
                    onChange={(e) => setNewVideoFormState({ ...newVideoFormState, category: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Duration</label>
                  <input
                    type="text"
                    value={newVideoFormState.duration}
                    onChange={(e) => setNewVideoFormState({ ...newVideoFormState, duration: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                    placeholder="10:30"
                  />
                </div>
              </div>

              <button
                onClick={handleAddVideo}
                className="w-full bg-accent text-accent-foreground py-3 rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                Add Video
              </button>
            </div>

            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">All Videos ({videos.length})</h2>
              {videos.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No videos uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {videos.map((video) => (
                    <div key={video.id} className="bg-background rounded-lg p-4 border border-border">
                      {editingVideo?.id === video.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                              <input
                                type="text"
                                value={editingVideo.title}
                                onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                                className="w-full bg-secondary text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Video URL</label>
                              <input
                                type="url"
                                value={editingVideo.url}
                                onChange={(e) => setEditingVideo({ ...editingVideo, url: e.target.value })}
                                className="w-full bg-secondary text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Creator</label>
                              <input
                                type="text"
                                value={editingVideo.creator}
                                onChange={(e) => setEditingVideo({ ...editingVideo, creator: e.target.value })}
                                className="w-full bg-secondary text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                              <select
                                value={editingVideo.category || ""}
                                onChange={(e) => setEditingVideo({ ...editingVideo, category: e.target.value })}
                                className="w-full bg-secondary text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent"
                              >
                                <option value="">Select a category</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.name}>
                                    {cat.icon} {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="flex-1 bg-accent text-accent-foreground py-2 rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingVideo(null)}
                              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors border border-border"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-foreground text-lg mb-1">{video.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{video.creator}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>{video.views} views</span>
                              {video.category && <span>• {video.category}</span>}
                              {video.duration && <span>• {video.duration}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingVideo(video)}
                              className="p-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors border border-border"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(video.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Add New Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Category Name *</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                    placeholder="e.g., Gaming, Music, Education"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Icon (Emoji)</label>
                  <input
                    type="text"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                    placeholder="📁"
                    maxLength={2}
                  />
                </div>
              </div>

              <button
                onClick={handleAddCategory}
                className="w-full bg-accent text-accent-foreground py-3 rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </div>

            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">All Categories ({categories.length})</h2>
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No categories created yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Add categories to organize your videos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-background rounded-lg p-4 border border-border">
                      {editingCategory?.id === category.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-foreground mb-1">Name</label>
                            <input
                              type="text"
                              value={editingCategory.name}
                              onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                              className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-foreground mb-1">Icon</label>
                            <input
                              type="text"
                              value={editingCategory.icon}
                              onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                              className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg border border-border focus:outline-none focus:border-accent text-sm"
                              maxLength={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateCategory}
                              className="flex-1 bg-accent text-accent-foreground py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="px-3 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors border border-border"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{category.icon}</span>
                              <h3 className="font-bold text-foreground">{category.name}</h3>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mb-3">
                            {videos.filter((v) => v.category === category.name).length} videos
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingCategory(category)}
                              className="flex-1 p-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-colors border border-border text-sm flex items-center justify-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ads" && (
          <AdManagement onToast={showToast} />
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-secondary rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Videos</h3>
                  <Play className="w-5 h-5 text-accent" />
                </div>
                <p className="text-3xl font-bold text-foreground">{videos.length}</p>
              </div>

              <div className="bg-secondary rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Views</h3>
                  <Eye className="w-5 h-5 text-accent" />
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {videos.reduce((sum, v) => sum + Number.parseInt(v.views || "0"), 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-secondary rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Categories</h3>
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <p className="text-3xl font-bold text-foreground">{categories.length}</p>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Content by Category</h2>
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No categories available</p>
                  <p className="text-sm text-muted-foreground mt-2">Create categories to see analytics</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category) => {
                    const count = videos.filter((v) => v.category === category.name).length
                    const percentage = videos.length > 0 ? (count / videos.length) * 100 : 0

                    return (
                      <div key={category.id}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground flex items-center gap-2">
                            <span>{category.icon}</span>
                            {category.name}
                          </span>
                          <span className="text-sm text-muted-foreground">{count} videos</span>
                        </div>
                        <div className="w-full bg-background rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Top Performing Videos</h2>
              <div className="space-y-2">
                {videos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No videos available</p>
                ) : (
                  [...videos]
                    .sort((a, b) => Number.parseInt(b.views || "0") - Number.parseInt(a.views || "0"))
                    .slice(0, 5)
                    .map((video, index) => (
                      <div
                        key={video.id}
                        className="flex items-center gap-4 bg-background rounded-lg p-3 border border-border"
                      >
                        <span className="text-2xl font-bold text-muted-foreground w-8">{index + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{video.title}</p>
                          <p className="text-xs text-muted-foreground">by {video.creator}</p>
                        </div>
                        <span className="text-sm font-medium text-accent">{video.views} views</span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-6">Site Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Site Name</label>
                  <input
                    type="text"
                    value={siteSettings.siteName}
                    onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Site Description</label>
                  <textarea
                    value={siteSettings.siteDescription}
                    onChange={(e) => setSiteSettings({ ...siteSettings, siteDescription: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50 resize-none h-24"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Featured Video</label>
                  <select
                    value={siteSettings.featuredVideoId}
                    onChange={(e) => setSiteSettings({ ...siteSettings, featuredVideoId: e.target.value })}
                    className="w-full bg-background text-foreground px-4 py-2 rounded-lg border border-border focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="">None</option>
                    {videos.map((video) => (
                      <option key={video.id} value={video.id}>
                        {video.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Select a video to feature on the homepage</p>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4">Platform Controls</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                      <div>
                        <p className="font-medium text-foreground">Maintenance Mode</p>
                        <p className="text-xs text-muted-foreground">Temporarily disable the platform</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={siteSettings.maintenanceMode}
                          onChange={(e) => setSiteSettings({ ...siteSettings, maintenanceMode: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                      <div>
                        <p className="font-medium text-foreground">Allow New Uploads</p>
                        <p className="text-xs text-muted-foreground">Enable or disable content uploads</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={siteSettings.allowNewUploads}
                          onChange={(e) => setSiteSettings({ ...siteSettings, allowNewUploads: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full bg-accent text-accent-foreground py-3 rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Save Settings
                </button>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/demo"
                  className="bg-background rounded-lg p-6 border border-border hover:border-accent/40 transition-colors"
                >
                  <h3 className="font-bold text-foreground mb-2">API Documentation</h3>
                  <p className="text-sm text-muted-foreground mb-3">View comprehensive API docs</p>
                  <div className="text-accent text-sm font-medium">View Docs →</div>
                </a>

                <a
                  href="/"
                  className="bg-background rounded-lg p-6 border border-border hover:border-accent/40 transition-colors"
                >
                  <h3 className="font-bold text-foreground mb-2">View Platform</h3>
                  <p className="text-sm text-muted-foreground mb-3">See your site as users do</p>
                  <div className="text-accent text-sm font-medium">Go to Site →</div>
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "server" && (
          <div className="space-y-6">
            {/* Loading State */}
            {isServerDataLoading && (
              <div className="bg-secondary rounded-lg p-6 border border-border text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-muted-foreground">Loading server data...</p>
              </div>
            )}

            {/* Error State */}
            {serverError && !isServerDataLoading && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 text-red-500">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <h3 className="font-bold">Connection Error</h3>
                    <p className="text-sm">{serverError}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setServerError(null)
                    setIsServerDataLoading(true)
                    fetchServerInfo().then(() => fetchServerMetrics()).then(() => fetchServerLogs()).finally(() => setIsServerDataLoading(false))
                  }}
                  className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg transition-colors text-sm font-medium"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* Server Status */}
            {!isServerDataLoading && !serverError && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Circle className={`w-3 h-3 ${serverInfo?.status === "online" ? "text-green-500 fill-green-500" : "text-red-500 fill-red-500"}`} />
                </div>
                <p className="text-xl font-bold text-foreground capitalize">{serverInfo?.status || "Unknown"}</p>
              </div>

              <div className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Uptime</h3>
                  <Clock className="w-4 h-4 text-accent" />
                </div>
                <p className="text-xl font-bold text-foreground">{serverMetrics ? formatUptime(serverMetrics.uptime) : "N/A"}</p>
              </div>

              <div className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Requests</h3>
                  <Activity className="w-4 h-4 text-accent" />
                </div>
                <p className="text-xl font-bold text-foreground">{serverMetrics?.requestCount?.toLocaleString() || "0"}</p>
              </div>

              <div className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Connections</h3>
                  <Users className="w-4 h-4 text-accent" />
                </div>
                <p className="text-xl font-bold text-foreground">{serverMetrics?.activeConnections || 0}</p>
              </div>
            </div>

            {/* Server Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-foreground">CPU Usage</h3>
                  <Cpu className="w-5 h-5 text-accent" />
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-foreground">{serverMetrics?.cpuUsage?.toFixed(1) || 0}%</span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(serverMetrics?.cpuUsage || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-foreground">Memory Usage</h3>
                  <MemoryStick className="w-5 h-5 text-accent" />
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-foreground">{serverMetrics?.memoryUsage?.toFixed(1) || 0}%</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({formatBytes(serverMetrics?.memoryUsed || 0)} / {formatBytes(serverMetrics?.memoryTotal || 0)})
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(serverMetrics?.memoryUsage || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-foreground">Disk Usage</h3>
                  <HardDrive className="w-5 h-5 text-accent" />
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-foreground">{serverMetrics?.diskUsage?.toFixed(1) || 0}%</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    ({formatBytes(serverMetrics?.diskUsed || 0)} / {formatBytes(serverMetrics?.diskTotal || 0)})
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(serverMetrics?.diskUsage || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Server Info */}
            <div className="bg-secondary rounded-lg p-6 border border-border">
              <h2 className="text-xl font-bold text-foreground mb-4">Server Information</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{serverInfo?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-medium text-foreground">{serverInfo?.version || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Go Version</p>
                  <p className="font-medium text-foreground">{serverInfo?.goVersion || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">OS / Arch</p>
                  <p className="font-medium text-foreground">{serverInfo?.os || "N/A"} / {serverInfo?.arch || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Environment</p>
                  <p className="font-medium text-foreground capitalize">{serverInfo?.environment || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Port</p>
                  <p className="font-medium text-foreground">{serverInfo?.port || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Database</p>
                  <p className={`font-medium ${serverInfo?.databaseStatus === "connected" ? "text-green-500" : "text-red-500"}`}>
                    {serverInfo?.databaseStatus || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Goroutines</p>
                  <p className="font-medium text-foreground">{serverMetrics?.goRoutines || 0}</p>
                </div>
              </div>
            </div>

            {/* Server Console */}
            <div className="bg-secondary rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-accent" />
                  <h2 className="text-xl font-bold text-foreground">Server Terminal</h2>
                </div>
                <span className="text-xs text-muted-foreground">Interactive shell - Full access to server</span>
              </div>

              {/* Real Terminal */}
              <div className="h-[500px]">
                <XTerminal wsUrl={`${WS_BASE}/ws/terminal?token=${authToken || localStorage.getItem("titanAuthToken") || ""}`} className="h-full" />
              </div>
            </div>

            {/* Server Logs */}
            <div className="bg-secondary rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" />
                  <h2 className="text-xl font-bold text-foreground">Server Logs</h2>
                  <span className="text-sm text-muted-foreground">({serverLogs.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchServerLogs}
                    className="p-2 bg-background text-muted-foreground rounded hover:text-foreground"
                    title="Refresh logs"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearLogs}
                    className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"
                    title="Clear old logs"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="h-80 overflow-y-auto">
                {serverLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No logs available
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-background sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        <th className="p-3 w-40">Time</th>
                        <th className="p-3 w-20">Level</th>
                        <th className="p-3 w-24">Source</th>
                        <th className="p-3">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {serverLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-background/50">
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className={`p-3 font-medium uppercase text-xs ${getLogLevelColor(log.level)}`}>
                            {log.level}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">{log.source || "-"}</td>
                          <td className="p-3 text-foreground">{log.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {activeTab === "drive" && (
          <div className="space-y-6">
            {/* Drive Header */}
            <div className="bg-secondary rounded-lg p-6 border border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">File Storage</h2>
                  <p className="text-muted-foreground text-sm">
                    {driveStats.totalFiles} files, {formatBytes(driveStats.totalSize)} used
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity cursor-pointer">
                    <FileUp className="w-4 h-4" />
                    Upload Files
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border text-foreground rounded-lg hover:bg-background transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    New Folder
                  </button>
                  {selectedFiles.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedFiles.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploadProgress !== null && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="text-foreground">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigateToFolder(null)}
                className={`flex items-center gap-1 hover:text-accent transition-colors ${
                  currentFolderPath === null ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Home className="w-4 h-4" />
                Root
              </button>
              {folderPath.map((folder, index) => (
                <div key={folder.path} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <button
                    onClick={() => navigateToFolder(folder.path)}
                    className={`hover:text-accent transition-colors ${
                      index === folderPath.length - 1 ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Files and Folders Grid */}
            <div className="bg-secondary rounded-lg border border-border overflow-hidden">
              {isDriveLoading ? (
                <div className="p-12 text-center">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-muted-foreground">Loading files...</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {/* Folders */}
                  {driveFolders.map((folder) => (
                    <div
                      key={`folder-${folder.path}`}
                      className="flex items-center gap-4 p-4 hover:bg-background/50 transition-colors cursor-pointer"
                      onDoubleClick={() => navigateToFolder(folder.path)}
                    >
                      <FolderOpen className="w-8 h-8 text-yellow-500" />
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigateToFolder(folder.path)}
                          className="text-foreground font-medium hover:text-accent transition-colors text-left"
                        >
                          {folder.name}
                        </button>
                        <p className="text-sm text-muted-foreground">
                          Folder • {new Date(folder.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.path); }}
                        className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                        title="Delete folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Files */}
                  {driveFiles.map((file) => (
                    <div
                      key={`file-${file.path}`}
                      className="flex items-center gap-4 p-4 hover:bg-background/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.path)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles([...selectedFiles, file.path])
                          } else {
                            setSelectedFiles(selectedFiles.filter((path) => path !== file.path))
                          }
                        }}
                        className="w-4 h-4 rounded border-border"
                      />
                      <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {file.formattedSize} • {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="p-2 text-muted-foreground hover:text-accent transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCreateShareLink(file)}
                          className="p-2 text-muted-foreground hover:text-accent transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.path)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {driveFolders.length === 0 && driveFiles.length === 0 && (
                    <div className="p-12 text-center">
                      <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No files yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload files or create folders to get started
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Create New Folder</h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Share File</h3>
              <button onClick={() => setShareModal(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              Share link for: <span className="text-foreground font-medium">{shareModal.file.originalName}</span>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareModal.shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
              />
              <button
                onClick={handleCopyShareLink}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can download the file
            </p>
          </div>
        </div>
      )}

      {/* File Picker Modal for Video Creation */}
      {showFilePicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-2xl w-full space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Select {filePickerMode === 'video' ? 'Video' : 'Image'} from Drive
              </h3>
              <button onClick={() => setShowFilePicker(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Breadcrumb navigation */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto pb-2">
              <button
                onClick={() => navigateFilePickerFolder(null)}
                className="hover:text-foreground flex items-center gap-1"
              >
                <Home className="w-4 h-4" />
                Root
              </button>
              {filePickerPath.map((folder, index) => (
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
                  <LoadingSpinner size="md" />
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

                  {/* Files - filtered by type */}
                  {filePickerFiles
                    .filter((file) =>
                      filePickerMode === 'video'
                        ? isVideoFile(file.mimeType)
                        : isImageFile(file.mimeType)
                    )
                    .map((file) => (
                      <button
                        key={`file-${file.path}`}
                        onClick={() => selectFileFromPicker(file)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-secondary transition-colors text-left"
                      >
                        {filePickerMode === 'video' ? (
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
                   filePickerFiles.filter((f) =>
                     filePickerMode === 'video' ? isVideoFile(f.mimeType) : isImageFile(f.mimeType)
                   ).length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <p>No {filePickerMode === 'video' ? 'video' : 'image'} files found in this folder</p>
                      <p className="text-sm mt-1">Upload files via the Drive tab</p>
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
