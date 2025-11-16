import { WebSocket, WebSocketServer } from 'ws';
import dotenv from 'dotenv'
import { randomUUID } from "node:crypto";

import { DB } from './db.js';
import { PlayerHandler } from './handlers/player.js';
import { RoomHandler } from './handlers/room.js';
import { ShipHandler } from './handlers/ship.js';
import { GameHandler } from './handlers/game.js';

dotenv.config();
const PORT = process.env.PORT || 3000;
const wss = new WebSocketServer({ port: PORT });

// Initialize database and handler
const db = new DB();
const playerHandler = new PlayerHandler(db);
const roomHandler = new RoomHandler(db);
const shipHandler = new ShipHandler(db, roomHandler);
const gameHandler = new GameHandler(db, shipHandler);

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
      console.log('Data:', data.data);
      
      let response;
      
      if (data.type === 'reg') {
        const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        response = await playerHandler.handleRegistration(parsedData, userId);
        ws.send(JSON.stringify(response));
        broadcastRoomUpdate();
        broadcastWinnersUpdate();

      } else if (data.type === 'create_room') {
        response = roomHandler.createRoom(userId);
        ws.send(JSON.stringify(response));
        broadcastRoomUpdate();
    
      } else if (data.type === 'add_user_to_room') {
        const roomData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        const resp = await roomHandler.addUserToRoom(roomData.indexRoom, userId);
        
        if (resp.player1Response.type === 'create_game') { 
          const p1 = JSON.parse(resp.player1Response.data);
          const p2 = JSON.parse(resp.player2Response.data);
          const userIds = [p1.idPlayer, p2.idPlayer];
          const user1Ws = users.get(userIds[0]);
          const user2Ws = users.get(userIds[1]);

          if (user1Ws && user1Ws.readyState === WebSocket.OPEN) {
              user1Ws.send(JSON.stringify(resp.player1Response));
          }
          if (user2Ws && user2Ws.readyState === WebSocket.OPEN) {
              user2Ws.send(JSON.stringify(resp.player2Response));
          }
        } else {
          ws.send(JSON.stringify(resp));
        }
        broadcastRoomUpdate();

      } else if (data.type === 'add_ships') {
        const shipData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        const resp = await shipHandler.addShips(shipData);
        
        if (resp) {
          const { p1, p2 } = resp;
          const userId1 = JSON.parse(p1.data).currentPlayerIndex;  
          const userId2 = JSON.parse(p2.data).currentPlayerIndex;      
          const ws1 = users.get(userId1);
          const ws2 = users.get(userId2);
          
          if (ws1 && ws1.readyState === WebSocket.OPEN) {
            ws1.send(JSON.stringify(p1));
          }
          
          if (ws2 && ws2.readyState === WebSocket.OPEN) {
            ws2.send(JSON.stringify(p2));
          }
          // Send turn information - player 1 goes first
          const turnMessage = {
            type: 'turn',
            data: JSON.stringify({
              currentPlayer: userId1
            }),
            id: 0
          };
          
          if (ws1 && ws1.readyState === WebSocket.OPEN) {
            ws1.send(JSON.stringify(turnMessage));
          }
          if (ws2 && ws2.readyState === WebSocket.OPEN) {
            ws2.send(JSON.stringify(turnMessage));
          }
        }
      } else if (data.type === 'attack') {
        const attackData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        const resp = await gameHandler.handleAttack(attackData);

        if (resp) {
          if (resp.data && resp.data.type === "finish") {
            const { data, lostPlayer } = resp 
            const wsWinner = users.get(attackData.indexPlayer);
            const wsLoser = users.get(lostPlayer);
            if (wsWinner && wsWinner.readyState === WebSocket.OPEN) {
              wsWinner.send(JSON.stringify(data));
            }
            if (wsLoser && wsLoser.readyState === WebSocket.OPEN) {
              wsLoser.send(JSON.stringify(data));
            }
            broadcastWinnersUpdate();
            return; 
          }

          const { p1, p2, userIds, turn } = resp;
          const userId1 = userIds[0]; 
          const userId2 = userIds[1];     
          const ws1 = users.get(userId1);
          const ws2 = users.get(userId2);
          
          if (ws1 && ws1.readyState === WebSocket.OPEN) {
            ws1.send(JSON.stringify(p1));
          }
          
          if (ws2 && ws2.readyState === WebSocket.OPEN) {
            ws2.send(JSON.stringify(p2));
          }
          sendTurnMessage(turn, ws1, ws2); 
        }
      } else if (data.type === 'randomAttack') {
        const randAttackData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        const resp = await gameHandler.handleRandomAttack(randAttackData);

        if (resp) {
          if (resp.data && resp.data.type === "finish") {
            const { data, lostPlayer } = resp 
            const wsWinner = users.get(attackData.indexPlayer);
            const wsLoser = users.get(lostPlayer);
            if (wsWinner && wsWinner.readyState === WebSocket.OPEN) {
              wsWinner.send(JSON.stringify(data));
            }
            if (wsLoser && wsLoser.readyState === WebSocket.OPEN) {
              wsLoser.send(JSON.stringify(data));
            }
            broadcastWinnersUpdate();
            return; 
          }

          const { p1, p2, userIds, turn } = resp;
          const userId1 = userIds[0];  
          const userId2 = userIds[1];      
          const ws1 = users.get(userId1);
          const ws2 = users.get(userId2);
          
          if (ws1 && ws1.readyState === WebSocket.OPEN) {
            ws1.send(JSON.stringify(p1));
          }
          
          if (ws2 && ws2.readyState === WebSocket.OPEN) {
            ws2.send(JSON.stringify(p2));
          }
          sendTurnMessage(turn, ws1, ws2); 
        }
      } else {
        throw new Error('Unknown message type');
      }
      
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


function broadcastRoomUpdate() {
  const rooms = roomHandler.getAvailableRooms();
  const message = {
    type: 'update_room',
    data: JSON.stringify(rooms),
    id: 0
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function sendTurnMessage(userId, ws1, ws2) {
  const turnMessage = {
    type: 'turn',
    data: JSON.stringify({
      currentPlayer: userId
    }),
    id: 0
  };
  
  if (ws1 && ws1.readyState === WebSocket.OPEN) {
    ws1.send(JSON.stringify(turnMessage));
  }
  if (ws2 && ws2.readyState === WebSocket.OPEN) {
    ws2.send(JSON.stringify(turnMessage));
  }
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