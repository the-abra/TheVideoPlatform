import { NextRequest, NextResponse } from "next/server"

// For server-side route, use environment variable or default
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    // First get file info to check if it exists and get metadata
    const infoResponse = await fetch(`${API_URL}/api/share/${token}`)
    const infoData = await infoResponse.json()

    if (!infoData.success) {
      return NextResponse.json(
        { error: "File not found or link expired" },
        { status: 404 }
      )
    }

    const fileInfo = infoData.data

    // Fetch the actual file from backend
    const fileResponse = await fetch(`${API_URL}/api/share/${token}/download`)

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch file" },
        { status: 500 }
      )
    }

    const fileBuffer = await fileResponse.arrayBuffer()

    // Return the file with appropriate headers for direct access
    const headers = new Headers()
    headers.set("Content-Type", fileInfo.mimeType || "application/octet-stream")
    headers.set("Content-Length", fileInfo.size.toString())
    headers.set("Cache-Control", "public, max-age=31536000, immutable")

    // Allow embedding from same origin
    headers.set("X-Content-Type-Options", "nosniff")

    // For images/videos/audio, allow inline display
    if (
      fileInfo.mimeType.startsWith("image/") ||
      fileInfo.mimeType.startsWith("video/") ||
      fileInfo.mimeType.startsWith("audio/") ||
      fileInfo.mimeType === "application/pdf"
    ) {
      headers.set("Content-Disposition", `inline; filename="${fileInfo.name}"`)
    } else {
      headers.set("Content-Disposition", `attachment; filename="${fileInfo.name}"`)
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error serving shared file:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
