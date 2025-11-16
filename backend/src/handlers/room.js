import { randomUUID } from "node:crypto";

export class RoomHandler {
  constructor(db) {
    this.db = db;
    this.rooms = new Map(); 
    this.userRooms = new Map(); 
  }

  createRoom(userId) {
    const roomId = this.generateRoomId();
    this.rooms.set(roomId, {
      roomId,
      users: [userId]
    });

    this.userRooms.set(userId, roomId);
    
    return {
      type: 'create_room',
      data: '',
      id: 0
    };
  }

  async addUserToRoom(indexRoom, userId) {
    let roomId;
    const availableRooms = this.getAvailableRooms();
    roomId = availableRooms.find(room => room.roomId === indexRoom).roomId;

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.users.includes(userId)) {
      throw new Error('User already in room');
    }

    // Add user to room
    room.users.push(userId);
    this.userRooms.set(userId, roomId);
    
    // Room is now full, create game
    const idGame = this.generateGameId();
    const [player1Id, player2Id] = room.users;

    return {
      player1Response: {
        type: 'create_game',
        data: JSON.stringify({
          idGame,
          idPlayer: player1Id
        }),
        id: 0
      },
      player2Response: {
        type: 'create_game',
        data: JSON.stringify({
          idGame,
          idPlayer: player2Id
        }),
        id: 0
      },
      room
    };

  }

  getAvailableRooms() {
    const available = [];
    
    this.rooms.forEach((room) => {
      if (room.users.length === 1) {
        const userId = room.users[0];
        const player = this.db.getPlayerById(userId);
        
        available.push({
          roomId: room.roomId,
          roomUsers: [
            {
              name: player.name,
              index: player ? player.index : userId
            }
          ]
        });
      }
    });
    return available;
  }

  getRoom(indexOrId) {
    if (typeof indexOrId === 'number') {
      const availableRooms = this.getAvailableRooms();
      if (indexOrId < 0 || indexOrId >= availableRooms.length) {
        return null;
      }
      const roomId = availableRooms[indexOrId].roomId;
      return this.rooms.get(roomId);
    }
    return this.rooms.get(indexOrId);
  }

  generateRoomId() {
    return randomUUID();
  }

  generateGameId() {
    return randomUUID();
  }

  generatePlayerId() {
    return randomUUID();
  }
}