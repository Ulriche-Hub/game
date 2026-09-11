import { WebSocketServer, WebSocket } from 'ws'

const PORT = 8080
const wss = new WebSocketServer({ port: PORT })

let latest = null

// ─── Heartbeat : détecte les connexions mortes ───
const HEARTBEAT_INTERVAL = 10_000 // 10 secondes

function heartbeat() {
  this.isAlive = true
}

const interval = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      console.log(`[sync] Client mort détecté → déconnexion forcée`)
      return ws.terminate()
    }
    ws.isAlive = false
    ws.ping()
  }
}, HEARTBEAT_INTERVAL)

wss.on('close', () => {
  clearInterval(interval)
})

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress
  ws.isAlive = true
  ws.on('pong', heartbeat)

  console.log(`[sync] ✅ Nouveau client connecté depuis ${ip} (total: ${wss.clients.size})`)

  // Envoyer l'état actuel au nouveau client
  if (latest) {
    ws.send(JSON.stringify({ type: 'state', state: latest }))
    console.log(`[sync] 📤 État initial envoyé au nouveau client`)
  }

  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(String(data))
    } catch (err) {
      console.log(`[sync] ⚠️ Message invalide reçu:`, String(data).slice(0, 100))
      return
    }

    if (msg.type === 'state') {
      latest = { ...(latest || {}), ...msg.state }
      const payload = JSON.stringify({ type: 'state', state: latest })
      let sent = 0
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(payload)
          sent++
        }
      }
      console.log(`[sync] 🔄 État synchronisé → ${sent} client(s) mis à jour`)
    }

    // Répondre aux pings client avec un pong
    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }))
    }
  })

  ws.on('close', () => {
    console.log(`[sync] ❌ Client déconnecté depuis ${ip} (restants: ${wss.clients.size})`)
  })

  ws.on('error', (err) => {
    console.log(`[sync] ⚠️ Erreur client ${ip}:`, err.message)
  })
})

console.log(`[sync] 🚀 Relais WebSocket actif sur ws://0.0.0.0:${PORT}`)
console.log(`[sync] 💡 Heartbeat actif toutes les ${HEARTBEAT_INTERVAL / 1000}s`)