"use client"

import { useEffect, useState } from "react"
import { type Category } from "@/lib/storage"

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return "";
};

export function CategoryStrip({
  onCategorySelect,
  selectedCategory,
}: {
  onCategorySelect?: (category: string | null) => void
  selectedCategory?: string | null
}) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    // Fetch categories from backend API
    const fetchCategories = async () => {
      const API_BASE = getApiBase();
      if (!API_BASE) return; // Skip if not on client side

      console.log('[CategoryStrip] Fetching from:', `${API_BASE}/api/categories`);

      try {
        const response = await fetch(`${API_BASE}/api/categories`, {
          headers: {
            'Accept': 'application/json',
          },
        })
        if (response.ok) {
          const data = await response.json()
          // Backend returns { success, data: { categories } }
          // Filter out "other" category from display (it's only used as fallback)
          const allCategories = data.data?.categories || []
          setCategories(allCategories.filter((cat: Category) => cat.id !== 'other'))
        } else {
          console.error('Failed to fetch categories from backend')
          setCategories([])
        }
      } catch (error) {
        console.error('[CategoryStrip] Error fetching categories:', error)
        console.error('[CategoryStrip] API_BASE was:', API_BASE)
        setCategories([])
      }
    }

    fetchCategories()
  }, [])

  return (
    <div className="sticky top-[73px] z-30 bg-background border-b border-border px-4 py-3">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => onCategorySelect?.(null)}
          className={`px-4 py-2 rounded-full font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
            selectedCategory === null
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-foreground hover:bg-secondary/80"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategorySelect?.(category.name)}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${
              selectedCategory === category.name
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {category.icon} {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}
