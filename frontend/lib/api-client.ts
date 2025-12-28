/**
 * Centralized API Client
 *
 * Benefits:
 * 1. Single source of truth for API configuration
 * 2. Automatic URL construction
 * 3. Error handling in one place
 * 4. Easy to add interceptors, retry logic, caching
 * 5. Type-safe API calls
 */

class ApiClient {
  private baseUrl: string = "";
  private static instance: ApiClient;

  private constructor() {
    this.initializeBaseUrl();
  }

  /**
   * Singleton pattern - only one instance of API client
   */
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Initialize base URL for backend API
   * Called once on client-side
   */
  private initializeBaseUrl(): void {
    if (typeof window !== 'undefined') {
      this.baseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    }
  }

  /**
   * Get the base URL (cached)
   */
  public getBaseUrl(): string {
    if (!this.baseUrl && typeof window !== 'undefined') {
      this.initializeBaseUrl();
    }
    return this.baseUrl;
  }

  /**
   * Construct full API URL
   */
  public getApiUrl(path: string): string {
    const base = this.getBaseUrl();
    if (!base) return "";

    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  public async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.getApiUrl(path);

    if (!url) {
      throw new Error("API base URL not initialized");
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[API Error] ${path}:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  public async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.fetch<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  public async post<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.fetch<T>(path, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * POST with FormData (for file uploads)
   */
  public async postFormData<T>(path: string, formData: FormData, options?: RequestInit): Promise<T> {
    return this.fetch<T>(path, {
      ...options,
      method: 'POST',
      body: formData,
      // Don't set Content-Type for FormData - browser sets it automatically with boundary
    });
  }

  /**
   * PUT request
   */
  public async put<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.fetch<T>(path, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  public async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.fetch<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  public async patch<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.fetch<T>(path, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * Add auth token to request headers
   */
  public withAuth(token: string): RequestInit {
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();

// Export convenient helper
export const getApiBaseUrl = () => apiClient.getBaseUrl();
