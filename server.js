import { WebSocketServer } from 'ws'

const PORT = 8080
const wss = new WebSocketServer({ port: PORT })

let latest = null

wss.on('connection', (ws) => {
  if (latest) {
    ws.send(JSON.stringify({ type: 'state', state: latest }))
  }

  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(String(data))
    } catch {
      return
    }
    if (msg.type === 'state') {
      latest = { ...(latest || {}), ...msg.state }
      const payload = JSON.stringify({ type: 'state', state: latest })
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(payload)
        }
      }
    }
  })
})

console.log(`[sync] Relais WebSocket actif sur ws://0.0.0.0:${PORT}`)