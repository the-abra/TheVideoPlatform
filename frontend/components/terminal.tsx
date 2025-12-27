"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"

interface TerminalProps {
  wsUrl: string
  className?: string
}

// We need to load xterm dynamically because it uses browser-only APIs
function TerminalComponent({ wsUrl, className = "" }: TerminalProps) {
  // Function to construct WebSocket URL based on current location if wsUrl is relative
  const getWebSocketUrl = () => {
    if (wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')) {
      return wsUrl;
    }

    // If wsUrl is relative, construct it based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}${wsUrl.startsWith('/') ? '' : '/'}${wsUrl}`;
  };
  const terminalRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [key, setKey] = useState(0) // Used to force remount
  const xtermRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!terminalRef.current) return

    let mounted = true
    let xterm: any = null
    let fitAddon: any = null

    const init = async () => {
      try {
        // Dynamically import xterm
        const { Terminal } = await import("@xterm/xterm")
        const { FitAddon } = await import("@xterm/addon-fit")

        // Import CSS
        await import("@xterm/xterm/css/xterm.css")

        if (!mounted || !terminalRef.current) return

        // Create terminal
        xterm = new Terminal({
          cursorBlink: true,
          cursorStyle: "block",
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          theme: {
            background: "#1a1b26",
            foreground: "#a9b1d6",
            cursor: "#c0caf5",
            black: "#32344a",
            red: "#f7768e",
            green: "#9ece6a",
            yellow: "#e0af68",
            blue: "#7aa2f7",
            magenta: "#ad8ee6",
            cyan: "#449dab",
            white: "#787c99",
            brightBlack: "#444b6a",
            brightRed: "#ff7a93",
            brightGreen: "#b9f27c",
            brightYellow: "#ff9e64",
            brightBlue: "#7da6ff",
            brightMagenta: "#bb9af7",
            brightCyan: "#0db9d7",
            brightWhite: "#acb0d0",
          },
          scrollback: 5000,
        })

        fitAddon = new FitAddon()
        xterm.loadAddon(fitAddon)

        xtermRef.current = xterm
        fitAddonRef.current = fitAddon

        xterm.open(terminalRef.current)

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          if (fitAddon && mounted) {
            fitAddon.fit()
          }
        }, 100)

        // Welcome message
        xterm.writeln("\x1b[1;36m╔════════════════════════════════════════╗\x1b[0m")
        xterm.writeln("\x1b[1;36m║\x1b[0m     \x1b[1;33mTitan Server Terminal\x1b[0m              \x1b[1;36m║\x1b[0m")
        xterm.writeln("\x1b[1;36m╚════════════════════════════════════════╝\x1b[0m")
        xterm.writeln("")
        xterm.writeln("\x1b[33mConnecting to server...\x1b[0m")

        // Connect WebSocket
        const finalWsUrl = getWebSocketUrl();
        setStatus("connecting")
        console.log("[Terminal] Connecting to:", finalWsUrl)
        console.log("[Terminal] Current location:", window.location.href)

        // Validate WebSocket URL format
        try {
          new URL(finalWsUrl); // This will throw if URL is invalid
        } catch (urlError) {
          console.error("[Terminal] Invalid WebSocket URL:", finalWsUrl, urlError)
          setStatus("error")
          setErrorMsg(`Invalid WebSocket URL: ${finalWsUrl}`)
          return; // Don't proceed with connection
        }

        // Before creating WebSocket, let's test if we can reach the backend with a simple fetch
        // This will help distinguish between WebSocket-specific issues and general connectivity issues
        const backendUrl = finalWsUrl.replace(/^ws(s)?:\/\//, (m) => m.startsWith('wss') ? 'https://' : 'http://');
        // Construct health check URL by replacing the path
        const healthCheckUrl = backendUrl + (backendUrl.endsWith('/') ? '' : '/') + 'health';

        console.log("[Terminal] Testing backend connectivity at:", healthCheckUrl);

        // Perform a quick health check to the backend
        fetch(healthCheckUrl, { method: 'GET', cache: 'no-cache' })
          .then(response => {
            console.log("[Terminal] Backend health check response:", response.status);
            if (!response.ok) {
              console.warn("[Terminal] Backend health check failed with status:", response.status);
            }
          })
          .catch(healthCheckError => {
            console.error("[Terminal] Backend health check failed:", healthCheckError);
            // Don't stop WebSocket connection based on health check failure, but log it
          });

        const ws = new WebSocket(finalWsUrl)
        wsRef.current = ws

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.error("[Terminal] Connection timeout")
            ws.close()
            setStatus("error")
            setErrorMsg("Connection timeout: Server is not responding. Please check if the backend server is running and accessible.")
          }
        }, 10000) // 10 second timeout

        ws.onopen = () => {
          if (!mounted) {
            ws.close()
            return
          }
          // Clear the connection timeout
          clearTimeout(connectionTimeout)
          console.log("[Terminal] WebSocket connected")
          setStatus("connected")
          xterm.writeln("\x1b[32mConnected!\x1b[0m")
          xterm.writeln("")

          // Send terminal size
          if (fitAddon) {
            fitAddon.fit()
            ws.send(JSON.stringify({
              type: "resize",
              cols: xterm.cols,
              rows: xterm.rows
            }))
          }
        }

        ws.onmessage = (event) => {
          if (!mounted) return
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "pong") return
            if (msg.type === "error") {
              xterm.writeln(`\r\n\x1b[31mError: ${msg.error}\x1b[0m`)
              return
            }
          } catch {
            // Not JSON, write raw output
          }
          xterm.write(event.data)
        }

        ws.onerror = (err) => {
          console.error("[Terminal] WebSocket error:", err)
          // Clear the connection timeout
          clearTimeout(connectionTimeout)
          // Try to get more specific error information
          // Note: For security reasons, browsers don't expose detailed error info for network errors
          let errorMsg = "Connection failed";
          if (err instanceof ErrorEvent) {
            if (err.message) {
              errorMsg = `Connection failed: ${err.message}`;
            } else {
              errorMsg = "Connection failed: Network error or CORS issue";
            }
          } else {
            // When err is just an event object with isTrusted: true, we can't get specific details
            // Common causes: network issues, server not running, CORS policy, firewall blocking
            errorMsg = "Connection failed: Network error. Common causes:\n- Backend server is not running\n- Network connectivity issues\n- Firewall blocking the connection\n- CORS policy issues\n\nPlease ensure the backend server is running on the expected port.";
          }
          setStatus("error")
          setErrorMsg(errorMsg)
        }

        ws.onclose = (event) => {
          console.log("[Terminal] WebSocket closed:", event.code, event.reason)
          // Clear the connection timeout
          clearTimeout(connectionTimeout)
          if (!mounted) return
          setStatus("disconnected")
          xterm.writeln("\r\n\x1b[33mDisconnected from server.\x1b[0m")
        }

        // Handle terminal input
        xterm.onData((data: string) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "input", data }))
          }
        })

        // Handle resize
        const handleResize = () => {
          if (fitAddon && mounted) {
            fitAddon.fit()
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "resize",
                cols: xterm.cols,
                rows: xterm.rows
              }))
            }
          }
        }

        // Periodic ping to keep connection alive and detect disconnections
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000); // Send ping every 30 seconds

        window.addEventListener("resize", handleResize)

        // Cleanup function
        return () => {
          clearTimeout(connectionTimeout)
          clearInterval(pingInterval)
          window.removeEventListener("resize", handleResize)
        }

      } catch (err) {
        console.error("[Terminal] Init error:", err)
        setStatus("error")
        setErrorMsg(String(err))
      }
    }

    init()

    return () => {
      mounted = false
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (xtermRef.current) {
        xtermRef.current.dispose()
        xtermRef.current = null
      }
    }
  }, [wsUrl, key])

  const reconnect = () => {
    // To trigger a re-render and restart the WebSocket connection, we'll update the key to force a remount
    setKey(prev => prev + 1)
  }

  const statusColors = {
    connecting: "bg-yellow-500 animate-pulse",
    connected: "bg-green-500",
    disconnected: "bg-gray-500",
    error: "bg-red-500"
  }

  const statusLabels = {
    connecting: "Connecting...",
    connected: "Connected",
    disconnected: "Disconnected",
    error: "Error"
  }

  return (
    <div className={`relative flex flex-col ${className}`} style={{ minHeight: "400px" }}>
      {/* Status bar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-black/50 px-2 py-1 rounded">
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-xs text-gray-300">{statusLabels[status]}</span>
        {(status === "disconnected" || status === "error") && (
          <button
            onClick={reconnect}
            className="text-xs text-blue-400 hover:text-blue-300 ml-2"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="absolute top-10 right-2 z-10 bg-red-500/90 text-white text-xs p-2 rounded max-w-xs">
          <pre className="whitespace-pre-wrap break-words">{errorMsg}</pre>
        </div>
      )}

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 bg-[#1a1b26] rounded-lg overflow-hidden"
        style={{ padding: "8px", minHeight: "380px" }}
      />
    </div>
  )
}

// Export with no SSR since xterm uses browser APIs
export const Terminal = dynamic(() => Promise.resolve(TerminalComponent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] bg-[#1a1b26] rounded-lg">
      <div className="text-gray-400">Loading terminal...</div>
    </div>
  )
})
