import { useCallback, useEffect, useRef, useState } from 'react'

const WS_DIRECT_PORT = 8080

function wsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.hostname
  const port = window.location.port

  // En dev : utiliser le proxy Vite (même port que la page → pas de souci de pare-feu)
  // Le proxy /ws dans vite.config.js redirige vers le serveur WS sur le port 8080
  if (port) {
    return `${proto}://${host}:${port}/ws`
  }
  // Fallback : connexion directe au port 8080 (si pas de proxy)
  return `${proto}://${host}:${WS_DIRECT_PORT}`
}


// ─── Backoff exponentiel pour les reconnexions ───
function getBackoff(attempt) {
  // 500ms, 1s, 2s, 4s, 8s max
  return Math.min(500 * Math.pow(2, attempt), 8000)
}

export function useGameSync(initialState) {
  const [state, setState] = useState(initialState)
  const [connected, setConnected] = useState(false)
  const [syncInfo, setSyncInfo] = useState('') // info de diagnostic
  const stateRef = useRef(initialState)
  const wsRef = useRef(null)
  const attemptRef = useRef(0)
  const pingIntervalRef = useRef(null)
  const closedRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    let retryTimeout
    closedRef.current = false

    const connect = () => {
      const url = wsUrl()
      setSyncInfo(`Connexion à ${url}...`)
      console.log(`[sync] 🔌 Tentative de connexion à ${url} (essai #${attemptRef.current + 1})`)

      let ws
      try {
        ws = new WebSocket(url)
      } catch (err) {
        console.error(`[sync] ❌ Erreur de création WebSocket:`, err)
        setSyncInfo(`Erreur: ${err.message}`)
        scheduleRetry()
        return
      }

      wsRef.current = ws

      ws.onopen = () => {
        console.log(`[sync] ✅ Connecté à ${url}`)
        attemptRef.current = 0
        setConnected(true)
        setSyncInfo('Connecté')

        // Envoyer l'état local au serveur pour s'assurer de la synchronisation
        const currentState = stateRef.current
        ws.send(JSON.stringify({ type: 'state', state: currentState }))

        // Démarrer le ping client toutes les 8 secondes
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }))
          }
        }, 8000)
      }

      ws.onclose = (e) => {
        console.log(`[sync] ❌ Déconnecté (code: ${e.code}, raison: ${e.reason || 'aucune'})`)
        setConnected(false)
        clearInterval(pingIntervalRef.current)

        if (!closedRef.current) {
          scheduleRetry()
        }
      }

      ws.onerror = (err) => {
        console.error(`[sync] ⚠️ Erreur WebSocket:`, err)
        setSyncInfo('Erreur de connexion')
        // onclose sera appelé après onerror, donc pas besoin de retry ici
        try { ws.close() } catch {}
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'state') {
            console.log(`[sync] 📥 État reçu du serveur`)
            setState(data.state)
            stateRef.current = data.state
          }
          if (data.type === 'pong') {
            const latency = Date.now() - data.ts
            console.log(`[sync] 🏓 Pong reçu (latence: ${latency}ms)`)
          }
        } catch {
          // ignore les messages invalides
        }
      }
    }

    const scheduleRetry = () => {
      if (closedRef.current) return
      const delay = getBackoff(attemptRef.current)
      console.log(`[sync] 🔄 Reconnexion dans ${delay}ms...`)
      setSyncInfo(`Reconnexion dans ${Math.round(delay / 1000)}s...`)
      attemptRef.current++
      retryTimeout = setTimeout(connect, delay)
    }

    connect()

    return () => {
      closedRef.current = true
      clearTimeout(retryTimeout)
      clearInterval(pingIntervalRef.current)
      try { wsRef.current && wsRef.current.close() } catch {}
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
    } else {
      console.warn(`[sync] ⚠️ WebSocket non connecté — changement local uniquement`)
    }
  }, [])

  return { state, update, connected, syncInfo }
}