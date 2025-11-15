import { WebSocket, WebSocketServer } from 'ws';
import dotenv from 'dotenv'
import { randomUUID } from "crypto";
import { DB } from './db.js';
import { PlayerHandler } from './handlers/player.js';

dotenv.config();
const PORT = process.env.PORT || 3000;
const wss = new WebSocketServer({ port: PORT });

// Initialize database and handler
const db = new DB();
const playerHandler = new PlayerHandler(db);

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
console.log('WebSocket Parameters:');
console.log(`  Host: localhost`);
console.log(`  Port: ${PORT}`);
console.log(`  Protocol: ws`);

// Store active connections
const users = new Map();

wss.on('connection', (ws) => {
  const userId = generateUserId();
  users.set(userId, ws);
  
  console.log(`New user connected: ${userId}`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('\n--- Received Command ---');
      console.log('Type:', data.type);
      console.log('Data:', JSON.stringify(data.data, null, 2));
      console.log('ID:', data.id);
      
      let response;
      
      if (data.type === 'reg') {
        const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        response = await playerHandler.handleRegistration(parsedData, userId);
        ws.send(JSON.stringify(response));
        
        // Broadcast winners update to all clients
        broadcastWinnersUpdate();
      } else {
        throw new Error('Unknown message type');
      }
      
      console.log('--- Response ---');
      console.log('Type:', response.type);
      console.log('Result:', response.data);
      console.log('-------------------\n');
      
    } catch (error) {
      console.error('Error processing message:', error);
      const errorResponse = {
        type: 'error',
        data: JSON.stringify({ error: true, errorText: error.message }),
        id: 0
      };
      ws.send(JSON.stringify(errorResponse));
    }
  });
  
  ws.on('close', () => {
    console.log(`User disconnected: ${userId}`);
    users.delete(userId);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastWinnersUpdate() {
  const winners = db.getWinners();
  const message = {
    type: 'update_winners',
    data: JSON.stringify(winners),
    id: 0
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function generateUserId() {
  return randomUUID();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down WebSocket server...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});