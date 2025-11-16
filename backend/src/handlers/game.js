export class GameHandler {
  constructor(db, shipHandler) {
    this.db = db;
    this.shipHandler = shipHandler;
    this.games = new Map(); 
  }

  async handleAttack(data) {
    const { gameId, x, y, indexPlayer } = data;
    let session = this.games.get(gameId);
    let userId1; 
    let userId2; 

    if (!session) {
        const ships = this.shipHandler.gameSessions.get(gameId);
        [userId1, userId2] = Object.keys(ships.players); 
        const p1Coords = this.generateShipCoords(ships.players[userId1].ships);
        const p2Coords = this.generateShipCoords(ships.players[userId2].ships);
        session = { 
            [userId1]: p1Coords, 
            [userId2]: p2Coords, 
            "turn": userId1
        };
        this.games.set(gameId, session);
    } else {
        [userId1, userId2] = Object.keys(session).filter(k => k !== "turn");
    }

    // turn check
    if (session.turn !== indexPlayer) {
        return;
    }
    const oppUserId = Object.keys(session).find(key => key !== indexPlayer);
    const res = this.isPlayerShot(session[oppUserId], x, y) 
    // turn switch ONLY if miss
    if (res === "miss") {
        session.turn = oppUserId;
    }

    if (this.isWinner(session, oppUserId)) {
        this.db.addWin(indexPlayer);

        return {
            "data": {
                "type": "finish",
                "data": JSON.stringify({
                    "winPlayer": indexPlayer
                }),
                "id": 0
            }, 
            "lostPlayer": oppUserId
        };
    }

    return {
        "p1": {
            "type": "attack",
            "data": JSON.stringify({
                "position": { "x": x, "y": y },
                "currentPlayerIndex": indexPlayer,
                "status": res
            }),
            "id": 0
        }, 
        "p2": {
            "type": "attack",
            "data": JSON.stringify({
                "position": { "x": x, "y": y },
                "currentPlayerIndex": indexPlayer,
                "status": res
            }),
            "id": 0
        }, 
        "userIds": [userId1, userId2], 
        "turn": session.turn
    };
  }

  async handleRandomAttack(data) {
    const { gameId, indexPlayer } = data;
    const [x1, y1] = this.pickRandomCoords();
    return this.handleAttack({ gameId, x: x1, y: y1, indexPlayer });
  }


  generateShipCoords(ships) {
    return ships.map(ship => {
        const { x, y } = ship.position;
        const { direction, length } = ship;

        const coords = new Set();

        for (let i = 0; i < length; i++) {
            const cx = direction ? x : x + i;   
            const cy = direction ? y + i : y;   

            coords.add(`${cx},${cy}`);
        }
        return coords;
    });
  }

  isPlayerShot(coords, x, y) {
    const target = `${x},${y}`;

    for (let shipCoords of coords) {
        if (shipCoords.has(target)) {
            shipCoords.delete(target);
            if (shipCoords.size === 0) return "killed";
            return "shot";
        }
    }
    return "miss";
  }

  pickRandomCoords() {
    function randomCoord() {
        return {
            x: Math.floor(Math.random() * 10),
            y: Math.floor(Math.random() * 10)
        };
    }

    let c1 = randomCoord();
    let c2 = randomCoord();

    while (c2.x === c1.x && c2.y === c1.y) {
        c2 = randomCoord();
    }
    return [c1, c2];
  }

  isWinner(session, userId) {
    return session[userId].every(shipCoords => shipCoords.size === 0);
  }

}