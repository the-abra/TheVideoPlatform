# Frontend Productivity Enhancements for Titan UI/UX Design Platform

## Overview
This document outlines productivity enhancements for the Next.js frontend of the Titan UI/UX Design Platform. These improvements will enhance development efficiency, performance, and overall user experience.

## Performance Improvements

### 1. Code Splitting and Lazy Loading
- Implement dynamic imports for code splitting
- Example implementation:
```tsx
// pages/admin.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';

// Lazy load heavy components
const VideoManagement = lazy(() => import('@/components/admin/video-management'));
const CategoryManagement = lazy(() => import('@/components/admin/category-management'));
const AdManagement = lazy(() => import('@/components/admin/ad-management'));
const AnalyticsDashboard = lazy(() => import('@/components/admin/analytics-dashboard'));
const SiteSettings = lazy(() => import('@/components/admin/site-settings'));
const ServerManagement = lazy(() => import('@/components/admin/server-management'));
const DriveManagement = lazy(() => import('@/components/admin/drive-management'));

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <AdminHeader />
        
        <AdminTabs>
          <TabPanel value="videos">
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <VideoManagement />
            </Suspense>
          </TabPanel>
          
          <TabPanel value="categories">
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <CategoryManagement />
            </Suspense>
          </TabPanel>
          
          <TabPanel value="ads">
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <AdManagement />
            </Suspense>
          </TabPanel>
          
          <TabPanel value="analytics">
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <AnalyticsDashboard />
            </Suspense>
          </TabPanel>
          
          <TabPanel value="settings">
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <SiteSettings />
            </Suspense>
          </TabPanel>
          
          <TabPanel value="server">
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <ServerManagement />
            </Suspense>
          </TabPanel>
          
          <TabPanel value="drive">
            <Suspense fallback={<LoadingSpinner size="lg" />}>
              <DriveManagement />
            </Suspense>
          </TabPanel>
        </AdminTabs>
      </div>
    </div>
  );
}

// For route-based code splitting
// pages/index.tsx
import { lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import components with no SSR
const HomeContent = dynamic(() => import('@/components/home-content'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
```

### 2. Image Optimization
- Implement Next.js Image component with proper optimization
- Example implementation:
```tsx
// components/media-card.tsx
import Image from 'next/image';
import { useState } from 'react';

interface MediaCardProps {
  id: number;
  thumbnail: string;
  title: string;
  creator: string;
  duration?: string;
  views?: string;
  uploadedAt?: string;
  verified?: boolean;
}

export function MediaCard({ 
  id, 
  thumbnail, 
  title, 
  creator, 
  duration, 
  views, 
  uploadedAt,
  verified 
}: MediaCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group relative bg-secondary rounded-lg overflow-hidden border border-border transition-transform hover:scale-[1.02]">
      <div className="relative aspect-video bg-background">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
        )}
        
        {!imageError ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoadingComplete={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-gray-500">Image not available</div>
          </div>
        )}
        
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {duration}
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-bold text-foreground mb-1 line-clamp-2 group-hover:text-accent transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{creator}</p>
          {verified && (
            <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
              Verified
            </span>
          )}
        </div>
        {views && (
          <p className="text-xs text-muted-foreground mt-1">
            {views} views • {uploadedAt}
          </p>
        )}
      </div>
    </div>
  );
}
```

### 3. Caching Strategies
- Implement proper caching with React Query/SWR
- Example implementation:
```tsx
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// hooks/useVideos.ts
import { useQuery } from '@tanstack/react-query';
import { Video } from '@/lib/storage';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

const fetchVideos = async (): Promise<Video[]> => {
  const response = await fetch(`${API_BASE}/api/videos`);
  if (!response.ok) {
    throw new Error('Failed to fetch videos');
  }
  const data = await response.json();
  return data.data?.videos || [];
};

export const useVideos = () => {
  return useQuery({
    queryKey: ['videos'],
    queryFn: fetchVideos,
    staleTime: 300000, // 5 minutes
    cacheTime: 600000, // 10 minutes
  });
};

// hooks/useVideo.ts
import { useQuery } from '@tanstack/react-query';

const fetchVideo = async (id: number): Promise<Video> => {
  const response = await fetch(`${API_BASE}/api/videos/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch video');
  }
  const data = await response.json();
  return data.data?.video;
};

export const useVideo = (id: number) => {
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => fetchVideo(id),
    enabled: !!id,
  });
};

// In components
import { useVideos } from '@/hooks/useVideos';
import { LoadingSpinner } from '@/components/loading-spinner';

export function VideoList() {
  const { data: videos, isLoading, error, refetch } = useVideos();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading videos: {error.message}</p>
        <button 
          onClick={() => refetch()} 
          className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos?.map((video) => (
        <MediaCard key={video.id} {...video} />
      ))}
    </div>
  );
}
```

### 4. Error Boundaries and Fallbacks
- Implement proper error boundaries
- Example implementation:
```tsx
// components/error-boundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-accent text-accent-foreground rounded hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// components/suspense-fallback.tsx
import { LoadingSpinner } from './loading-spinner';

export function SuspenseFallback({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}
```

## Development Experience

### 1. TypeScript Strict Mode
- Implement comprehensive TypeScript types and strict mode
- Example implementation:
```ts
// types/index.ts
export interface Video {
  id: number;
  title: string;
  url: string;
  creator: string;
  thumbnail: string;
  uploadedAt: string;
  views?: string;
  category?: string;
  duration?: string;
  verified?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Ad {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: 'home-banner' | 'home-sidebar' | 'video-top' | 'video-sidebar';
  enabled: boolean;
  clicks: number;
  impressions: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowNewUploads: boolean;
  featuredVideoId: string;
}

export interface ServerInfo {
  name: string;
  version: string;
  goVersion: string;
  os: string;
  arch: string;
  status: 'online' | 'offline' | 'error' | 'starting' | 'stopping';
  startedAt: string;
  environment: string;
  port: string;
  databaseStatus: string;
}

export interface ServerMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  diskUsage: number;
  diskTotal: number;
  diskUsed: number;
  uptime: number;
  goRoutines: number;
  requestCount: number;
  activeConnections: number;
  timestamp: string;
}

export interface DriveFile {
  id: number;
  name: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  extension: string;
  folderId: number | null;
  shareToken: string;
  shareExpiry: string | null;
  isPublic: boolean;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriveFolder {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Custom hooks return types
export interface UseQueryResult<T> {
  data?: T;
  isLoading: boolean;
  error?: Error;
  refetch: () => void;
  isFetching: boolean;
}

// Context types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  role: string;
}
```

### 2. Linting and Formatting
- Implement proper linting and formatting configuration
- Example implementation:
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@vercel/style-guide/eslint/node",
    "@vercel/style-guide/eslint/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@typescript-eslint/explicit-module-boundary-types": "off"
      }
    }
  ]
}
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 3. Testing Configuration
- Add comprehensive testing setup
- Example implementation:
```json
// package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit"
  }
}
```

```ts
// jest.config.ts
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// createJestConfig is exported in this way to ensure that next/jest can load the Next.js configuration, which is async
export default createJestConfig(config);
```

```ts
// jest.setup.ts
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

## User Experience

### 1. Loading States and Skeleton Screens
- Implement proper loading states and skeleton screens
- Example implementation:
```tsx
// components/skeletons/video-card-skeleton.tsx
export function VideoCardSkeleton() {
  return (
    <div className="bg-secondary rounded-lg overflow-hidden border border-border animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-3">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

// components/skeletons/admin-skeleton.tsx
export function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-secondary rounded-lg p-6 border border-border">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-secondary rounded-lg p-4 border border-border">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>

      <div className="bg-secondary rounded-lg border border-border overflow-hidden">
        <div className="h-10 bg-gray-200"></div>
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-border rounded">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// In components with loading states
import { useVideos } from '@/hooks/useVideos';
import { VideoCardSkeleton } from '@/components/skeletons/video-card-skeleton';

export function VideoGrid() {
  const { data: videos, isLoading, error } = useVideos();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load videos</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos?.map((video) => (
        <MediaCard key={video.id} {...video} />
      ))}
    </div>
  );
}
```

### 2. Accessibility Improvements
- Implement WCAG compliance features
- Example implementation:
```tsx
// components/accessibility/keyboard-navigation.tsx
import { useEffect } from 'react';

// Hook for keyboard navigation
export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip to main content
      if (e.key === 'Tab' && e.shiftKey && e.altKey) {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        mainContent?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};

// components/accessibility/screen-reader.tsx
export const ScreenReaderOnly = ({ children }: { children: React.ReactNode }) => (
  <span 
    className="absolute w-px h-px p-0 -m-px overflow-hidden clip clip-path-[inset(0)] whitespace-nowrap border-0"
    style={{ position: 'absolute', left: '-10000px' }}
  >
    {children}
  </span>
);

// components/accessibility/focus-trap.tsx
import { useEffect, useRef } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onClose: () => void;
}

export const FocusTrap = ({ children, isActive, onClose }: FocusTrapProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const focusableElements = wrapperRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive, onClose]);

  return (
    <div ref={wrapperRef} className={isActive ? 'focus-trap' : ''}>
      {children}
    </div>
  );
};
```

### 3. Keyboard Navigation Support
- Add keyboard navigation support
- Example implementation:
```tsx
// hooks/useKeyboardNavigation.ts
import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts: { [key: string]: () => void }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts from triggering when in input fields
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = `${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key.toLowerCase()}`;
      
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Usage in components
import { useKeyboardShortcuts } from '@/hooks/useKeyboardNavigation';

export function VideoPlayer({ video }: { video: Video }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useKeyboardShortcuts({
    ' ': () => { // Spacebar to play/pause
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    },
    'arrowleft': () => { // Left arrow to seek back
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      }
    },
    'arrowright': () => { // Right arrow to seek forward
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(
          videoRef.current.duration, 
          videoRef.current.currentTime + 5
        );
      }
    },
    'f': () => { // F key to toggle fullscreen
      if (videoRef.current) {
        if (!document.fullscreenElement) {
          videoRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
      }
    }
  });

  return (
    <div className="relative">
      <video 
        ref={videoRef}
        src={video.url}
        className="w-full h-auto"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => {
              if (videoRef.current) {
                if (isPlaying) {
                  videoRef.current.pause();
                } else {
                  videoRef.current.play();
                }
                setIsPlaying(!isPlaying);
              }
            }}
            className="p-2 hover:bg-white/20 rounded"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          <span className="text-sm">
            {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

## Code Organization

### 1. Component Architecture
- Implement proper component architecture
- Example implementation:
```tsx
// components/ui/index.ts (UI component barrel export)
export { Button } from './button';
export { Input } from './input';
export { Label } from './label';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { Checkbox } from './checkbox';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { Textarea } from './textarea';
export { Switch } from './switch';
export { Slider } from './slider';
export { Progress } from './progress';
export { Skeleton } from './skeleton';

// components/layouts/index.ts
export { MainLayout } from './main-layout';
export { AdminLayout } from './admin-layout';
export { AuthLayout } from './auth-layout';

// components/admin/index.ts
export { VideoManagement } from './admin/video-management';
export { CategoryManagement } from './admin/category-management';
export { AdManagement } from './admin/ad-management';
export { AnalyticsDashboard } from './admin/analytics-dashboard';
export { SiteSettings } from './admin/site-settings';
export { ServerManagement } from './admin/server-management';
export { DriveManagement } from './admin/drive-management';
```

### 2. State Management
- Implement proper state management solution
- Example implementation with Zustand:
```ts
// store/index.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Video, Category, SiteSettings } from '@/types';

interface AppState {
  videos: Video[];
  categories: Category[];
  settings: SiteSettings;
  currentVideo: Video | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setVideos: (videos: Video[]) => void;
  setCategories: (categories: Category[]) => void;
  setSettings: (settings: SiteSettings) => void;
  setCurrentVideo: (video: Video | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchVideos: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchSettings: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      videos: [],
      categories: [],
      settings: {
        siteName: 'MEDIAHUB',
        siteDescription: 'Your premium streaming platform',
        maintenanceMode: false,
        allowNewUploads: true,
        featuredVideoId: '',
      },
      currentVideo: null,
      loading: false,
      error: null,
      
      setVideos: (videos) => set({ videos }),
      setCategories: (categories) => set({ categories }),
      setSettings: (settings) => set({ settings }),
      setCurrentVideo: (currentVideo) => set({ currentVideo }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      fetchVideos: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/videos');
          if (!response.ok) throw new Error('Failed to fetch videos');
          const data = await response.json();
          set({ videos: data.data?.videos || [], loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },
      
      fetchCategories: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/categories');
          if (!response.ok) throw new Error('Failed to fetch categories');
          const data = await response.json();
          set({ categories: data.data?.categories || [], loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },
      
      fetchSettings: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/settings');
          if (!response.ok) throw new Error('Failed to fetch settings');
          const data = await response.json();
          set({ settings: data.data?.settings || get().settings, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },
    }),
    {
      name: 'titan-storage',
      partialize: (state) => ({
        settings: state.settings,
        videos: state.videos,
        categories: state.categories,
      }),
    }
  )
);

// hooks/state-hooks.ts
import { useAppStore } from '@/store';

export const useVideos = () => {
  const { videos, loading, error, fetchVideos } = useAppStore();
  return { videos, loading, error, fetchVideos };
};

export const useCategories = () => {
  const { categories, loading, error, fetchCategories } = useAppStore();
  return { categories, loading, error, fetchCategories };
};

export const useSettings = () => {
  const { settings, loading, error, fetchSettings, setSettings } = useAppStore();
  return { settings, loading, error, fetchSettings, setSettings };
};
```

### 3. Form Handling and Validation
- Implement proper form handling and validation
- Example implementation:
```tsx
// lib/form-validation.ts
import { z } from 'zod';

// Video form schema
export const videoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be less than 200 characters'),
  url: z.string().url('Please enter a valid URL'),
  creator: z.string().min(2, 'Creator name must be at least 2 characters').max(100, 'Creator name must be less than 100 characters'),
  thumbnail: z.string().url('Please enter a valid thumbnail URL').optional().or(z.literal('')),
  category: z.string().optional(),
  duration: z.string().regex(/^([0-9]+:[0-5][0-9])|([0-9]+:[0-5][0-9]:[0-5][0-9])$/, 'Duration must be in format MM:SS or HH:MM:SS').optional(),
});

// Category form schema
export const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(50, 'Category name must be less than 50 characters'),
  icon: z.string().max(2, 'Icon should be a single emoji').optional(),
});

// Settings form schema
export const settingsSchema = z.object({
  siteName: z.string().min(1, 'Site name is required').max(100, 'Site name must be less than 100 characters'),
  siteDescription: z.string().max(500, 'Description must be less than 500 characters'),
  maintenanceMode: z.boolean(),
  allowNewUploads: z.boolean(),
  featuredVideoId: z.string().optional(),
});

// Hook for form handling
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const useVideoForm = () => {
  return useForm({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: '',
      url: '',
      creator: '',
      thumbnail: '',
      category: '',
      duration: '',
    },
  });
};

// Form component
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';

interface VideoFormProps {
  onSubmit: (data: any) => void;
  categories: Category[];
  defaultValues?: any;
}

export function VideoForm({ onSubmit, categories, defaultValues }: VideoFormProps) {
  const form = useVideoForm();
  
  if (defaultValues) {
    form.reset(defaultValues);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Enter video title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL *</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/video.mp4" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="creator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Creator *</FormLabel>
              <FormControl>
                <Input placeholder="Creator name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="thumbnail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/thumbnail.jpg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 10:30 or 1:23:45" {...field} />
              </FormControl>
              <FormDescription>Format: MM:SS or HH:MM:SS</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full">
          {defaultValues ? 'Update Video' : 'Add Video'}
        </Button>
      </form>
    </Form>
  );
}
```

## Build & Deployment

### 1. Bundle Optimization
- Optimize build process and bundle size
- Example implementation:
```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['localhost', 'yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  webpack: (config, { isServer, dev }) => {
    // Only enable bundle analyzer in production
    if (!dev && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: 'bundle-report.html',
          openAnalyzer: false,
        })
      );
    }
    
    // Optimize moment.js (if used)
    if (!dev) {
      config.resolve.alias['moment-timezone/data/packed/latest.json'] = 
        'moment-timezone/data/packed/latest.json';
    }
    
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin',
  },
];

module.exports = nextConfig;
```

### 2. Environment Configuration
- Implement proper environment configuration
- Example implementation:
```ts
// lib/env.ts
const isServer = typeof window === 'undefined';

interface EnvConfig {
  API_BASE: string;
  WS_BASE: string;
  NODE_ENV: string;
  VERCEL_ENV?: string;
}

const getEnvConfig = (): EnvConfig => {
  if (isServer) {
    // Server-side environment variables
    return {
      API_BASE: process.env.API_BASE_URL || 'http://localhost:5000',
      WS_BASE: process.env.WS_BASE_URL || 'ws://localhost:5000',
      NODE_ENV: process.env.NODE_ENV || 'development',
      VERCEL_ENV: process.env.VERCEL_ENV,
    };
  } else {
    // Client-side environment variables
    return {
      API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000',
      WS_BASE: process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:5000',
      NODE_ENV: process.env.NODE_ENV || 'development',
      VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    };
  }
};

export const env = getEnvConfig();

// Validate required environment variables
if (!env.API_BASE) {
  console.error('API_BASE environment variable is required');
}

// lib/api-client.ts
class ApiClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor() {
    this.baseUrl = env.API_BASE;
    this.wsUrl = env.WS_BASE;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

## Implementation Checklist

- [ ] Implement code splitting with dynamic imports
- [ ] Add Next.js Image optimization with proper loading states
- [ ] Implement caching strategies with React Query/SWR
- [ ] Add error boundaries and fallback components
- [ ] Implement comprehensive TypeScript types and strict mode
- [ ] Set up proper linting and formatting configuration
- [ ] Add comprehensive testing setup with Jest and React Testing Library
- [ ] Implement loading states and skeleton screens
- [ ] Add accessibility improvements (WCAG compliance)
- [ ] Implement keyboard navigation support
- [ ] Create proper component architecture with barrel exports
- [ ] Implement state management solution (Zustand)
- [ ] Add proper form handling and validation with Zod
- [ ] Optimize build process and bundle size
- [ ] Implement proper environment configuration
- [ ] Add performance monitoring and analytics
- [ ] Implement proper routing and navigation
- [ ] Add comprehensive documentation
- [ ] Set up CI/CD pipeline with automated testing
- [ ] Add proper analytics and monitoring
- [ ] Implement proper error reporting and logging