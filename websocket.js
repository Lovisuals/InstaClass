const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });
  ws.on('close', () => console.log('Client disconnected'));
});

console.log('WebSocket server running on ws://localhost:8081');