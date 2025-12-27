import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BACKEND_URL = "http://localhost:5000"

// Proxy to backend API - POST /api/videos/:id/view
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const response = await fetch(`${BACKEND_URL}/api/videos/${id}/view`, {
      method: 'POST',
      headers: {
        'X-Forwarded-For': request.headers.get("x-forwarded-for") || "",
        'User-Agent': request.headers.get("user-agent") || ""
      }
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Failed to proxy to backend:', error)
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 503 })
  }
}
