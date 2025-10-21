// server.cjs
// Entry point for wallet backend (Express + WebSocket)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Example REST endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Example WebSocket handler
wss.on('connection', (ws) => {
  ws.send('WebSocket connection established');
  ws.on('message', (message) => {
    // Echo message
    ws.send(`Received: ${message}`);
  });
});

const PORT = process.env.PORT || 9500;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Wallet backend listening on 0.0.0.0:${PORT}`);
});
