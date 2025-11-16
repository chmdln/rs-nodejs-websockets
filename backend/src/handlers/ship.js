export class ShipHandler {
  constructor() {
    this.gameSessions = new Map(); 
  }

  async addShips(data) {
    const { gameId, ships, indexPlayer } = data;
    let session = this.gameSessions.get(gameId);

    if (!session) {
      session = { players: {} };
      this.gameSessions.set(gameId, session);
    }
    // Add or update the player's ships
    session.players[indexPlayer] = { ships };
    const playerCount = Object.keys(session.players).length;

    // start game 
    if (playerCount === 2) {
      const userId1 = Object.keys(session.players)[0];
      const userId2 = Object.keys(session.players)[1];
      return {
        "p1": {
          "type": "start_game",
          "data": JSON.stringify({
            "ships": Object.values(session.players)[0].ships, 
            "currentPlayerIndex": userId1
          }),
          "id": 0
          }, 
        "p2": {
          "type": "start_game",
          "data": JSON.stringify({
            "ships": Object.values(session.players)[1].ships, 
            "currentPlayerIndex": userId2
          }),
          "id": 1
        }
      }
    }
  }
}