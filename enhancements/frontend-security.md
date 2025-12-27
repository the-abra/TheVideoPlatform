# Frontend Security Enhancements for Titan UI/UX Design Platform

## Overview
This document outlines security enhancements for the Next.js frontend of the Titan UI/UX Design Platform. These improvements will strengthen the application's client-side security posture and protect against common web vulnerabilities.

## Client-Side Security

### 1. Input Sanitization
- Implement proper input sanitization before sending to backend
- Use libraries like DOMPurify for sanitizing user-generated content
- Example implementation:
```tsx
import DOMPurify from 'dompurify';

const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

// Usage in forms
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const sanitizedInput = sanitizeInput(userInput);
  // Send sanitizedInput to backend
};
```

### 2. CSRF Protection
- Implement CSRF tokens for state-changing operations
- Example implementation:
```tsx
// In your API calls
const getCSRFToken = async (): Promise<string> => {
  const response = await fetch('/api/csrf-token');
  const data = await response.json();
  return data.token;
};

const makeSecureRequest = async (url: string, options: RequestInit) => {
  const token = await getCSRFToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token,
    },
  });
};
```

### 3. Secure Local Storage
- Avoid storing sensitive data in localStorage
- Use httpOnly cookies for authentication tokens when possible
- Example implementation:
```tsx
// Instead of localStorage for tokens, use httpOnly cookies
// For other data, implement encryption
import { encrypt, decrypt } from './crypto-utils';

const secureLocalStorage = {
  setItem: (key: string, value: any) => {
    const encryptedValue = encrypt(JSON.stringify(value));
    localStorage.setItem(key, encryptedValue);
  },
  
  getItem: (key: string) => {
    const encryptedValue = localStorage.getItem(key);
    if (!encryptedValue) return null;
    try {
      return JSON.parse(decrypt(encryptedValue));
    } catch {
      return null;
    }
  },
  
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  }
};
```

### 4. Content Security Policy (CSP)
- Implement CSP headers in next.config.js
- Example implementation:
```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https://api.example.com; frame-ancestors 'none';"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

## Authentication Security

### 1. Secure JWT Token Storage
- Store tokens in httpOnly cookies instead of localStorage
- Example implementation:
```tsx
// Using next-auth for secure authentication
import { signIn, signOut, useSession } from 'next-auth/react';

// For custom authentication, use httpOnly cookies
const login = async (credentials: { username: string; password: string }) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include cookies in request
    body: JSON.stringify(credentials),
  });
  
  if (response.ok) {
    // Token is stored in httpOnly cookie, no need to handle it in frontend
    return { success: true };
  }
  return { success: false };
};
```

### 2. Token Refresh Mechanism
- Implement automatic token refresh
- Example implementation:
```tsx
// Create an authentication context
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  token: string | null;
  refreshToken: () => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  
  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include refresh token cookie
      });
      
      if (response.ok) {
        // New access token is stored in httpOnly cookie
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };
  
  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setToken(null);
  };
  
  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
      }
    };
    checkAuth();
  }, []);
  
  return (
    <AuthContext.Provider value={{ token, refreshToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 3. Session Timeout
- Implement automatic session timeout
- Example implementation:
```tsx
// Session timeout hook
import { useEffect, useRef } from 'react';

const useSessionTimeout = (timeoutMinutes: number, onTimeout: () => void) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMinutes * 60 * 1000);
  };
  
  useEffect(() => {
    resetTimeout();
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleUserActivity = () => {
      resetTimeout();
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [timeoutMinutes, onTimeout]);
};

// Usage in your components
const MyComponent = () => {
  const { logout } = useAuth();
  
  useSessionTimeout(30, () => {
    // Automatically log out after 30 minutes of inactivity
    logout();
  });
  
  return <div>Protected content</div>;
};
```

## Data Handling Security

### 1. XSS Prevention
- Sanitize data before rendering
- Use React's built-in XSS protection
- Example implementation:
```tsx
// Safe rendering of user-generated content
const SafeContent = ({ content }: { content: string }) => {
  // For HTML content, use dangerouslySetInnerHTML with sanitization
  const sanitizedContent = useMemo(() => 
    DOMPurify.sanitize(content), [content]
  );
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
      className="user-content"
    />
  );
};

// For plain text, React automatically escapes by default
const PlainText = ({ text }: { text: string }) => (
  <p>{text}</p> // This is automatically escaped by React
);
```

### 2. Error Handling
- Implement proper error handling without exposing sensitive information
- Example implementation:
```tsx
// Custom error boundary
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error:', error, errorInfo);
    // Log to error reporting service, but don't expose details to user
  }

  public render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please try again later.</h1>;
    }

    return this.props.children;
  }
}

// API error handling
const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error status
    switch (error.response.status) {
      case 401:
        // Unauthorized - redirect to login
        router.push('/login');
        break;
      case 403:
        // Forbidden - show access denied message
        showToast('Access denied', 'error');
        break;
      case 404:
        // Not found - show appropriate message
        showToast('Resource not found', 'error');
        break;
      case 500:
        // Server error - generic message
        showToast('Server error occurred', 'error');
        break;
      default:
        // Generic error message
        showToast('An error occurred', 'error');
    }
  } else if (error.request) {
    // Network error
    showToast('Network error occurred', 'error');
  } else {
    // Other errors
    showToast('An unexpected error occurred', 'error');
  }
};
```

## API Communication Security

### 1. Secure API Calls
- Implement proper authentication headers management
- Example implementation:
```tsx
// API client with security features
class SecureApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  get<T>(endpoint: string, headers: HeadersInit = {}) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  post<T>(endpoint: string, data: any, headers: HeadersInit = {}) {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: any, headers: HeadersInit = {}) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, headers: HeadersInit = {}) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

// Usage
const apiClient = new SecureApiClient();

// In your components
const fetchUserData = async () => {
  try {
    const userData = await apiClient.get('/api/user/profile');
    return userData;
  } catch (error) {
    handleApiError(error);
  }
};
```

### 2. Request/Response Validation
- Validate API responses before using them
- Example implementation:
```tsx
// Response validation utility
const validateApiResponse = <T>(response: any, schema: any): T | null => {
  try {
    // Simple validation - check required fields exist
    for (const field of schema.required || []) {
      if (response[field] === undefined) {
        console.error(`Missing required field: ${field}`);
        return null;
      }
    }
    
    // Type validation
    for (const [field, type] of Object.entries(schema.types || {})) {
      if (response[field] !== undefined && typeof response[field] !== type) {
        console.error(`Invalid type for field ${field}: expected ${type}, got ${typeof response[field]}`);
        return null;
      }
    }
    
    return response as T;
  } catch (error) {
    console.error('Response validation failed:', error);
    return null;
  }
};

// Usage example
interface UserResponse {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

const userSchema = {
  required: ['id', 'username', 'email', 'createdAt'],
  types: {
    id: 'number',
    username: 'string',
    email: 'string',
    createdAt: 'string'
  }
};

const fetchValidatedUser = async (userId: number) => {
  try {
    const response = await apiClient.get(`/api/users/${userId}`);
    const validatedUser = validateApiResponse<UserResponse>(response, userSchema);
    
    if (!validatedUser) {
      throw new Error('Invalid user data received');
    }
    
    return validatedUser;
  } catch (error) {
    handleApiError(error);
  }
};
```

## File Handling Security

### 1. Secure File Uploads
- Validate file types and sizes before upload
- Example implementation:
```tsx
// File validation utility
const validateFile = (file: File, options: { maxSize?: number; allowedTypes?: string[] } = {}) => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'] } = options;
  
  // Check file size (default 10MB)
  if (file.size > maxSize) {
    throw new Error(`File size exceeds limit (${maxSize / (1024 * 1024)}MB)`);
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type not allowed: ${file.type}`);
  }
  
  // Additional client-side validation could include:
  // - File extension check
  // - Magic number validation (if possible)
  // - Virus scanning (server-side only)
};

// Secure file upload component
const SecureFileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    try {
      validateFile(selectedFile, {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi']
      });
      
      setFile(selectedFile);
    } catch (error: any) {
      alert(error.message);
    }
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      alert('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    }
  };
  
  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file}>
        Upload
      </button>
    </div>
  );
};
```

### 2. Secure File Previews
- Implement secure file preview mechanisms
- Example implementation:
```tsx
// Secure file preview component
const SecureFilePreview = ({ fileUrl, fileName, mimeType }: { 
  fileUrl: string; 
  fileName: string; 
  mimeType: string; 
}) => {
  // Validate file URL to prevent XSS
  const isValidUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      // Only allow same-origin or specific trusted domains
      return parsedUrl.origin === window.location.origin || 
             parsedUrl.origin === 'https://trusted-domain.com';
    } catch {
      return false;
    }
  };
  
  if (!isValidUrl(fileUrl)) {
    return <div>Invalid file URL</div>;
  }
  
  // Render appropriate preview based on file type
  if (mimeType.startsWith('image/')) {
    return <img src={fileUrl} alt={fileName} />;
  } else if (mimeType.startsWith('video/')) {
    return (
      <video controls>
        <source src={fileUrl} type={mimeType} />
      </video>
    );
  } else if (mimeType.startsWith('audio/')) {
    return (
      <audio controls>
        <source src={fileUrl} type={mimeType} />
      </audio>
    );
  } else {
    // For other file types, provide a download link
    return (
      <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
        Download {fileName}
      </a>
    );
  }
};
```

## Additional Security Measures

### 1. Environment Configuration
- Secure environment variables
- Example implementation:
```tsx
// Environment configuration with validation
const validateEnvironment = () => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_BASE',
    // Add other required environment variables
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      // In production, you might want to throw an error
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }
};

// Call this early in your app
validateEnvironment();
```

### 2. Dependency Security
- Regularly audit dependencies for vulnerabilities
- Example implementation (package.json scripts):
```json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "preinstall": "npm audit"
  }
}
```

## Implementation Checklist

- [ ] Implement input sanitization using DOMPurify
- [ ] Add CSRF protection tokens
- [ ] Secure JWT token storage (prefer httpOnly cookies)
- [ ] Implement token refresh mechanism
- [ ] Add session timeout functionality
- [ ] Implement XSS prevention measures
- [ ] Add proper error handling without information disclosure
- [ ] Create secure API client with proper headers
- [ ] Implement request/response validation
- [ ] Add file validation before upload
- [ ] Implement secure file preview mechanisms
- [ ] Add Content Security Policy headers
- [ ] Validate environment variables
- [ ] Implement secure local storage for non-sensitive data
- [ ] Add dependency security checks
- [ ] Implement proper authentication context
- [ ] Add secure form handling
- [ ] Implement secure routing with authentication checks
- [ ] Add security-focused error boundaries