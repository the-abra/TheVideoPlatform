import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BACKEND_URL = "http://localhost:5000"

// Proxy to backend API - GET /api/categories
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/categories`)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Failed to proxy to backend:', error)
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 503 })
  }
}
