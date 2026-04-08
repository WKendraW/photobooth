const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

const rooms = new Map();

wss.on('connection', ws => {
  let currentRoom = null;

  ws.on('message', message => {
    const data = JSON.parse(message);
    const { code } = data;

    if (!rooms.has(code)) {
      rooms.set(code, new Set());
    }

    const room = rooms.get(code);
    if (!currentRoom) {
      room.add(ws);
      currentRoom = code;
    }

    if (data.type === 'join') {
      // Notify others in room
      room.forEach(client => {
        if (client !== ws) {
          client.send(JSON.stringify({ type: 'joined' }));
        }
      });
    } else if (data.type === 'peer') {
      // Relay signal
      room.forEach(client => {
        if (client !== ws) {
          client.send(JSON.stringify({ type: 'peer', signal: data.signal }));
        }
      });
    } else if (['photo', 'turn', 'config'].includes(data.type)) {
      // Broadcast to room
      room.forEach(client => {
        if (client !== ws) {
          client.send(message);
        }
      });
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      room.delete(ws);
      if (room.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });
});

console.log('Signaling server running on ws://localhost:8080');