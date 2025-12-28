"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { ChevronRight } from "lucide-react"
import { storage, type Category } from "@/lib/storage"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)

    // Fetch categories from API instead of localStorage
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          // Filter out "folder" category from client display
          const filteredCategories = (data.data.categories || []).filter(
            (cat: Category) => {
              const name = cat.name.toLowerCase().trim()
              return name !== 'folder' && name !== 'folders'
            }
          )
          setCategories(filteredCategories)
        } else {
          // Fallback to localStorage if API fails
          const filteredCategories = storage.getCategories().filter(
            (cat) => {
              const name = cat.name.toLowerCase().trim()
              return name !== 'folder' && name !== 'folders'
            }
          )
          setCategories(filteredCategories)
        }
      } catch (error) {
        // Fallback to localStorage if API fails
        const filteredCategories = storage.getCategories().filter(
          (cat) => {
            const name = cat.name.toLowerCase().trim()
            return name !== 'folder' && name !== 'folders'
          }
        )
        setCategories(filteredCategories)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 py-8 lg:px-6">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Categories</h1>
          <p className="text-muted-foreground">Browse content by category</p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No categories available yet.</p>
            <p className="text-sm text-muted-foreground">Categories can be added from the admin panel.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link key={category.id} href={`/?search=&category=${category.name}`}>
                <button className="w-full group relative overflow-hidden rounded-lg bg-secondary p-6 text-left hover:shadow-lg transition-all hover:scale-105">
                  <div className="relative z-10">
                    <div className="text-4xl mb-3">{category.icon}</div>
                    <h3 className="text-xl font-bold text-foreground mb-1">{category.name}</h3>
                    <div className="flex items-center gap-2 text-accent text-sm font-medium mt-4">
                      Browse <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity" />
                </button>
              </Link>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border">
        <div className="flex items-center justify-around py-3">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-xs">Home</span>
          </Link>
          <Link
            href="/explore"
            className="flex flex-col items-center gap-1 text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            <span className="text-xs">Explore</span>
          </Link>
          <Link href="/categories" className="flex flex-col items-center gap-1 text-accent font-medium">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="text-xs">Categories</span>
          </Link>
          <Link
            href="/library"
            className="flex flex-col items-center gap-1 text-muted-foreground font-medium hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17.001c0 5.591 3.824 10.29 9 11.622m0-13c5.5 0 10 4.745 10 10.001 0 5.591-3.824 10.29-9 11.622"
              />
            </svg>
            <span className="text-xs">Library</span>
          </Link>
        </div>
      </nav>

      <div className="h-20 md:h-0" />
    </div>
  )
}
