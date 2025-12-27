export interface Video {
  id: number
  title: string
  url: string
  creator: string
  thumbnail: string
  uploadedAt: string
  views?: string
  category?: string
  duration?: string
  verified?: boolean
}

export interface Category {
  id: string
  name: string
  icon: string
}

export interface Ad {
  id: string
  title: string
  imageUrl: string
  targetUrl: string
  placement: "home-banner" | "home-sidebar" | "video-top" | "video-sidebar"
  enabled: boolean
  clicks: number
  impressions: number
  createdAt: string
  updatedAt: string
}

export interface SiteSettings {
  siteName: string
  siteDescription: string
  maintenanceMode: boolean
  allowNewUploads: boolean
  featuredVideoId: string
}

export interface ServerInfo {
  name: string
  version: string
  goVersion: string
  os: string
  arch: string
  status: "online" | "offline" | "error" | "starting" | "stopping"
  startedAt: string
  environment: string
  port: string
  databaseStatus: string
}

export interface ServerMetrics {
  cpuUsage: number
  memoryUsage: number
  memoryTotal: number
  memoryUsed: number
  diskUsage: number
  diskTotal: number
  diskUsed: number
  uptime: number
  goRoutines: number
  requestCount: number
  activeConnections: number
  timestamp: string
}

export interface ServerLog {
  id: number
  level: string
  message: string
  source: string
  timestamp: string
}

export interface ConsoleCommand {
  command: string
  output: string
  success: boolean
  timestamp: string
}

export interface DriveFile {
  name: string
  path: string
  size: number
  mimeType: string
  extension: string
  createdAt: string
  icon: string
  formattedSize: string
}

export interface DriveFolder {
  name: string
  path: string
  createdAt: string
  size: number
}

export const storage = {
  // Videos storage
  getVideos: (): Video[] => {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem("titanVideos")
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("[v0] Error loading videos:", error)
      return []
    }
  },

  saveVideos: (videos: Video[]): boolean => {
    if (typeof window === "undefined") return false
    try {
      localStorage.setItem("titanVideos", JSON.stringify(videos))
      return true
    } catch (error) {
      console.error("[v0] Error saving videos:", error)
      return false
    }
  },

  // Library storage
  getSavedVideos: (): number[] => {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem("titanLibrarySaved")
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("[v0] Error loading saved videos:", error)
      return []
    }
  },

  saveVideo: (videoId: number): boolean => {
    try {
      const saved = storage.getSavedVideos()
      if (!saved.includes(videoId)) {
        saved.push(videoId)
        localStorage.setItem("titanLibrarySaved", JSON.stringify(saved))
      }
      return true
    } catch (error) {
      console.error("[v0] Error saving video to library:", error)
      return false
    }
  },

  removeSavedVideo: (videoId: number): boolean => {
    try {
      const saved = storage.getSavedVideos()
      const filtered = saved.filter((id) => id !== videoId)
      localStorage.setItem("titanLibrarySaved", JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error("[v0] Error removing saved video:", error)
      return false
    }
  },

  // Watch history
  getWatchHistory: (): number[] => {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem("titanWatchHistory")
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("[v0] Error loading watch history:", error)
      return []
    }
  },

  addToHistory: (videoId: number): boolean => {
    try {
      const history = storage.getWatchHistory()
      const filtered = history.filter((id) => id !== videoId)
      filtered.unshift(videoId)
      const limited = filtered.slice(0, 50) // Keep last 50 videos
      localStorage.setItem("titanWatchHistory", JSON.stringify(limited))
      return true
    } catch (error) {
      console.error("[v0] Error adding to history:", error)
      return false
    }
  },

  clearHistory: (): boolean => {
    try {
      localStorage.removeItem("titanWatchHistory")
      return true
    } catch (error) {
      console.error("[v0] Error clearing history:", error)
      return false
    }
  },

  // Auth
  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("adminAuth") === "true"
  },

  setAuthenticated: (value: boolean): void => {
    if (typeof window === "undefined") return
    if (value) {
      localStorage.setItem("adminAuth", "true")
    } else {
      localStorage.removeItem("adminAuth")
    }
  },

  getCategories: (): Category[] => {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem("titanCategories")
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("[v0] Error loading categories:", error)
      return []
    }
  },

  saveCategories: (categories: Category[]): boolean => {
    if (typeof window === "undefined") return false
    try {
      localStorage.setItem("titanCategories", JSON.stringify(categories))
      return true
    } catch (error) {
      console.error("[v0] Error saving categories:", error)
      return false
    }
  },

  getAds: (): Ad[] => {
    if (typeof window === "undefined") return []
    try {
      const data = localStorage.getItem("titanAds")
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("[v0] Error loading ads:", error)
      return []
    }
  },

  saveAds: (ads: Ad[]): boolean => {
    if (typeof window === "undefined") return false
    try {
      localStorage.setItem("titanAds", JSON.stringify(ads))
      return true
    } catch (error) {
      console.error("[v0] Error saving ads:", error)
      return false
    }
  },

  getAdsByPlacement: (placement: Ad["placement"]): Ad[] => {
    const allAds = storage.getAds()
    return allAds.filter((ad) => ad.placement === placement && ad.enabled)
  },

  getSiteSettings: (): SiteSettings => {
    if (typeof window === "undefined")
      return {
        siteName: "MEDIAHUB",
        siteDescription: "Your premium streaming platform",
        maintenanceMode: false,
        allowNewUploads: true,
        featuredVideoId: "",
      }
    try {
      const data = localStorage.getItem("titan_site_settings")
      return data
        ? JSON.parse(data)
        : {
            siteName: "MEDIAHUB",
            siteDescription: "Your premium streaming platform",
            maintenanceMode: false,
            allowNewUploads: true,
            featuredVideoId: "",
          }
    } catch (error) {
      console.error("[v0] Error loading site settings:", error)
      return {
        siteName: "MEDIAHUB",
        siteDescription: "Your premium streaming platform",
        maintenanceMode: false,
        allowNewUploads: true,
        featuredVideoId: "",
      }
    }
  },

  saveSiteSettings: (settings: SiteSettings): boolean => {
    if (typeof window === "undefined") return false
    try {
      localStorage.setItem("titan_site_settings", JSON.stringify(settings))
      return true
    } catch (error) {
      console.error("[v0] Error saving site settings:", error)
      return false
    }
  },
}

export const getSiteSettings = storage.getSiteSettings
export const saveSiteSettings = storage.saveSiteSettings
export const getVideos = storage.getVideos
export const saveVideos = storage.saveVideos
export const getSavedVideos = storage.getSavedVideos
export const saveVideo = storage.saveVideo
export const removeSavedVideo = storage.removeSavedVideo
export const getWatchHistory = storage.getWatchHistory
export const addToHistory = storage.addToHistory
export const clearHistory = storage.clearHistory
export const isAuthenticated = storage.isAuthenticated
export const setAuthenticated = storage.setAuthenticated
export const getCategories = storage.getCategories
export const saveCategories = storage.saveCategories
export const getAds = storage.getAds
export const saveAds = storage.saveAds
export const getAdsByPlacement = storage.getAdsByPlacement
