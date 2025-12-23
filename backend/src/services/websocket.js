const WebSocket = require('ws');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket Client verbunden');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(ws, data);
      } catch (e) {
        console.error('WebSocket Message Error:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket Client getrennt');
    });

    ws.on('error', (error) => {
      console.error('WebSocket Error:', error);
      clients.delete(ws);
    });

    // Willkommensnachricht
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket verbunden'
    }));
  });
}

function handleMessage(ws, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'subscribe':
      // Für zukünftige Kanal-Subscriptions
      ws.channels = ws.channels || [];
      ws.channels.push(data.channel);
      break;

    default:
      console.log('Unknown WebSocket message:', data);
  }
}

// Nachricht an alle Clients senden
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Nachricht an bestimmten Kanal senden
function broadcastToChannel(channel, data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.channels?.includes(channel)) {
      client.send(message);
    }
  });
}

// Anzahl verbundener Clients
function getClientCount() {
  return clients.size;
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastToChannel,
  getClientCount
};
