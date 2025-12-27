import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BACKEND_URL = "http://localhost:5000"

// Proxy to backend API - GET /api/videos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams.toString()
    const url = `${BACKEND_URL}/api/videos${searchParams ? `?${searchParams}` : ''}`

    const response = await fetch(url)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Failed to proxy to backend:', error)
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 503 })
  }
}

// Proxy to backend API - POST /api/videos
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    // Forward the request to backend
    const formData = await request.formData()

    const response = await fetch(`${BACKEND_URL}/api/videos`, {
      method: 'POST',
      headers: {
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: formData
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Failed to proxy to backend:', error)
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 503 })
  }
}
