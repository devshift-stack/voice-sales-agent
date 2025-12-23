require('dotenv').config();

const app = require('./app');
const { initDatabase } = require('./utils/database');
const { initQueue } = require('./services/queue');
const { initWebSocket } = require('./services/websocket');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    // Datenbank initialisieren
    await initDatabase();
    console.log('✅ PostgreSQL verbunden');

    // Queue initialisieren
    await initQueue();
    console.log('✅ Redis Queue bereit');

    // Server starten
    const server = app.listen(PORT, HOST, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║         Voice Sales Agent - Backend v1.0              ║
║         KI-gestützter Telesales für Solarmodule       ║
╠═══════════════════════════════════════════════════════╣
║  Server:    http://${HOST}:${PORT}                        ║
║  API:       http://${HOST}:${PORT}/api                    ║
║  WebSocket: ws://${HOST}:${PORT}                          ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // WebSocket für Live-Updates
    initWebSocket(server);
    console.log('✅ WebSocket bereit');

  } catch (error) {
    console.error('❌ Startup Error:', error);
    process.exit(1);
  }
}

start();
