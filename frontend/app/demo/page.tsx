"use client"

import { Header } from "@/components/header"
import { Code, Copy, CheckCircle, Server, Database, Lock, FileCode, BookOpen, Zap } from "lucide-react"
import { useState } from "react"

export default function DemoModePage() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 py-8 lg:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-3">Backend Architecture Documentation</h1>
            <p className="text-muted-foreground mb-6 text-balance">
              Complete backend specification for Go + SQLite + Local Video Storage. Use this document to build the
              entire backend system.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-foreground">Tech Stack</h3>
                </div>
                <p className="text-sm text-muted-foreground">Go 1.21+</p>
              </div>

              <div className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-foreground">Database</h3>
                </div>
                <p className="text-sm text-muted-foreground">SQLite3</p>
              </div>

              <div className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-foreground">Auth</h3>
                </div>
                <p className="text-sm text-muted-foreground">JWT Tokens</p>
              </div>

              <div className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-foreground">Storage</h3>
                </div>
                <p className="text-sm text-muted-foreground">Local Files</p>
              </div>
            </div>
          </div>

          {/* Download Architecture Document */}
          <div className="mb-12 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg border-2 border-accent/50 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-accent/20 p-3 rounded-lg">
                  <FileCode className="w-8 h-8 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-xl mb-2">Complete Backend Architecture Document</h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    A comprehensive 200+ line specification document containing everything needed to build the complete
                    backend system: database schemas, API endpoints, authentication flows, file storage, error handling,
                    and implementation checklists.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                      9 API Endpoints
                    </span>
                    <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                      6 Database Tables
                    </span>
                    <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                      JWT Auth
                    </span>
                    <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                      File Upload
                    </span>
                    <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-semibold">
                      Analytics
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/BACKEND_ARCHITECTURE.md"
                  download
                  className="px-6 py-3 bg-accent hover:bg-accent/90 text-background font-bold rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Download Architecture Document
                </a>
                <button
                  onClick={() => {
                    fetch("/BACKEND_ARCHITECTURE.md")
                      .then((res) => res.text())
                      .then((text) => {
                        copyToClipboard(text, 9999)
                      })
                  }}
                  className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground font-semibold rounded-lg transition-colors inline-flex items-center gap-2 border border-border"
                >
                  {copiedIndex === 9999 ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 p-4 bg-background/50 rounded-lg border border-border/50">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4 text-accent" />
                  Document Includes:
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                    Complete project structure with Go best practices
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                    SQLite schema for videos, categories, ads, users, settings, and analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>9 fully documented API endpoints with
                    request/response examples
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                    JWT authentication with bcrypt password hashing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                    File upload handling for videos, thumbnails, and ad images
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                    View tracking with IP-based throttling
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                    Analytics dashboard with SQL queries
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                    Complete implementation checklist and testing strategy
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="mb-12 bg-secondary rounded-lg border border-border overflow-hidden">
            <div className="bg-background p-4 border-b border-border">
              <h3 className="font-bold text-foreground text-lg">Quick Start for Backend Developers</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-bold text-foreground mb-2">Step 1: Download the Architecture Document</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Download <code className="px-2 py-1 bg-background rounded text-accent">BACKEND_ARCHITECTURE.md</code>{" "}
                  using the button above. This contains all specifications.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-2">Step 2: Initialize Go Project</h4>
                <div className="bg-background rounded-lg p-4 border border-border">
                  <pre className="text-xs text-foreground overflow-x-auto">
                    <code>{`mkdir titan-backend && cd titan-backend
go mod init titan-backend
go get -u github.com/go-chi/chi/v5
go get -u github.com/mattn/go-sqlite3
go get -u github.com/golang-jwt/jwt/v5`}</code>
                  </pre>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-2">Step 3: Follow the Implementation Checklist</h4>
                <p className="text-sm text-muted-foreground">
                  The architecture document contains a 9-phase checklist covering setup, database, models,
                  authentication, API endpoints, file handling, middleware, testing, and documentation.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-2">Step 4: Run the Backend</h4>
                <div className="bg-background rounded-lg p-4 border border-border">
                  <pre className="text-xs text-foreground overflow-x-auto">
                    <code>{`go run cmd/server/main.go
# Server starts at http://localhost:5000`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* System Architecture Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-secondary rounded-lg border border-border p-6">
              <h3 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-accent" />
                Database Tables
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-foreground font-semibold">videos</span> - Video metadata, URLs, views, likes
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-foreground font-semibold">categories</span> - Dynamic video categories
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-foreground font-semibold">ads</span> - Advertisement placements and URLs
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-foreground font-semibold">users</span> - Admin authentication
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-foreground font-semibold">settings</span> - Site configuration (key-value
                    store)
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <div>
                    <span className="text-foreground font-semibold">view_logs</span> - Analytics and view tracking
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-secondary rounded-lg border border-border p-6">
              <h3 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-accent" />
                API Endpoints
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">GET</span>
                  <span className="text-foreground">/api/videos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-bold">POST</span>
                  <span className="text-foreground">/api/videos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">GET</span>
                  <span className="text-foreground">/api/videos/:id</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">GET</span>
                  <span className="text-foreground">/api/videos/search</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-bold">POST</span>
                  <span className="text-foreground">/api/auth/login</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">GET</span>
                  <span className="text-foreground">/api/categories</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">GET</span>
                  <span className="text-foreground">/api/analytics</span>
                </li>
                <li className="text-xs text-muted-foreground mt-2">+ 15 more endpoints documented</li>
              </ul>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 p-6 bg-secondary/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Note for AI Assistants:</strong> This architecture document is
              specifically designed for AI-assisted development. It contains complete specifications, example code, SQL
              schemas, and implementation checklists to enable autonomous backend development with Go, SQLite, and local
              file storage. The frontend at{" "}
              <code className="px-1.5 py-0.5 bg-background rounded text-accent">http://localhost:3000</code> is already
              built and expects the backend at{" "}
              <code className="px-1.5 py-0.5 bg-background rounded text-accent">http://localhost:5000</code>.
            </p>
          </div>
        </div>
      </main>

      {/* Mobile Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-border md:hidden z-50">
        <div className="flex justify-around items-center py-3 px-4"></div>
      </div>
    </div>
  )
}
