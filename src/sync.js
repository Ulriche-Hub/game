import { useCallback, useEffect, useRef, useState } from 'react'

const WS_PORT = 8080

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.hostname}:${WS_PORT}`
}

export function useGameSync(initialState) {
  const [state, setState] = useState(initialState)
  const [connected, setConnected] = useState(false)
  const stateRef = useRef(initialState)
  const wsRef = useRef(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    let ws
    let retry
    let closed = false

    const connect = () => {
      ws = new WebSocket(wsUrl())
      wsRef.current = ws

      ws.onopen = () => setConnected(true)

      ws.onclose = () => {
        setConnected(false)
        if (!closed) retry = setTimeout(connect, 2000)
      }

      ws.onerror = () => {
        try { ws.close() } catch {}
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'state') {
            setState(data.state)
          }
        } catch {
          // ignore
        }
      }
    }

    connect()

    return () => {
      closed = true
      clearTimeout(retry)
      try { ws && ws.close() } catch {}
    }
  }, [])

  const update = useCallback((next) => {
    const prev = stateRef.current
    const patch = typeof next === 'function' ? next(prev) : next
    const computed = { ...prev, ...patch }
    stateRef.current = computed
    setState(computed)
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'state', state: computed }))
    }
  }, [])

  return { state, update, connected }
}