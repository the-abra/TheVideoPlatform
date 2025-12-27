import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// GET /api/health - Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
}
