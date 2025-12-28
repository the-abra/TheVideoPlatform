import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const BACKEND_URL = "http://localhost:5000"

// Proxy to backend API - GET /api/check-vpn
export async function GET(request: Request) {
  try {
    // Forward headers that might contain the real IP
    const headers: HeadersInit = {}
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIP = request.headers.get("x-real-ip")
    const cfIP = request.headers.get("cf-connecting-ip")

    if (forwardedFor) headers["x-forwarded-for"] = forwardedFor
    if (realIP) headers["x-real-ip"] = realIP
    if (cfIP) headers["cf-connecting-ip"] = cfIP

    const response = await fetch(`${BACKEND_URL}/api/check-vpn`, {
      headers,
    })
    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Failed to proxy to backend:", error)
    return NextResponse.json(
      { success: false, message: "Backend unavailable", data: { isVPN: false, isProxy: false } },
      { status: 503 }
    )
  }
}
