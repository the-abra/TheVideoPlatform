import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BACKEND_URL = "http://localhost:5000"

// Proxy to backend API - GET /api/videos/search
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams.toString()
    const url = `${BACKEND_URL}/api/videos/search${searchParams ? `?${searchParams}` : ''}`

    const response = await fetch(url)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Failed to proxy to backend:', error)
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 503 })
  }
}
