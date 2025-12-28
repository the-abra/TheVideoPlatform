/**
 * Fix media URLs to work across different network environments (localhost, IP addresses, etc.)
 */

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "";
};

/**
 * Convert media URL to work from any origin
 * Handles:
 * - Localhost URLs (http://localhost:5000/storage/...)
 * - IP-based URLs (http://10.13.2.98:5000/storage/...)
 * - Share links (http://localhost:3000/share/...)
 * - Relative paths (/storage/...)
 */
export function fixMediaUrl(url: string): string {
  if (!url) return "";

  // Already a valid http/https URL that doesn't contain localhost or 127.0.0.1
  if (url.startsWith("http") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
    return url;
  }

  // Fix localhost/127.0.0.1 URLs to use backend server
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    // Extract the path part (e.g., /storage/videos/...)
    const match = url.match(/\/storage\/[^\s"']+/) || url.match(/\/share\/[^/]+\/raw/);
    if (match) {
      const path = match[0];

      // Share links go to frontend
      if (path.startsWith("/share/")) {
        return path; // Relative to frontend
      }

      // Storage files go to backend
      const API_BASE = getApiBase();
      return API_BASE ? `${API_BASE}${path}` : path;
    }
  }

  // Relative share link
  if (url.startsWith("/share/")) {
    return url; // Browser resolves to current origin
  }

  // Relative storage path
  if (url.startsWith("/storage/")) {
    const API_BASE = getApiBase();
    return API_BASE ? `${API_BASE}${url}` : url;
  }

  // Default: return as-is
  return url;
}

/**
 * Fix thumbnail URL
 */
export function fixThumbnailUrl(url: string): string {
  if (!url) return "/placeholder.svg";
  return fixMediaUrl(url);
}

/**
 * Fix video URL
 */
export function fixVideoUrl(url: string): string {
  if (!url) return "";
  return fixMediaUrl(url);
}
