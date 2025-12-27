import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BACKEND_URL = "http://localhost:5000"

// Proxy to backend API - GET /api/videos/:id
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const response = await fetch(`${BACKEND_URL}/api/videos/${id}`)
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Failed to proxy to backend:', error)
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 503 })
  }
}

// Proxy to backend API - PUT /api/videos/:id
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authHeader = request.headers.get("authorization")
    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/api/videos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {})
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Failed to proxy to backend:', error)
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 503 })
  }
}

// Proxy to backend API - DELETE /api/videos/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authHeader = request.headers.get("authorization")

    const response = await fetch(`${BACKEND_URL}/api/videos/${id}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader ? { 'Authorization': authHeader } : {})
      }
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Failed to proxy to backend:', error)
    return NextResponse.json({ success: false, message: "Backend unavailable" }, { status: 503 })
  }
}
