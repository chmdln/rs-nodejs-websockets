export class DB {
  constructor() {
    this.players = new Map(); // key: index, value: player object
    this.credentials = new Map(); // key: name, value: { password, index }
    this.winners = []; // array of { name, wins }
    this.playerIndex = 1;
  }

  // Player registration and login
  registerPlayer(name, password, clientId) {
    if (this.credentials.has(name)) {
      // Player exists - try to login
      const storedCredentials = this.credentials.get(name);
      if (storedCredentials.password === password) {
        // Login successful
        const player = this.players.get(storedCredentials.index);
        if (player) {
          player.clientId = clientId; // Update client ID
          return { success: true, player, isNew: false };
        }
      } else {
        // Wrong password
        return { success: false, error: 'Invalid password' };
      }
    }

    // Create new player
    const playerIndex = this.playerIndex++;
    const player = {
      name,
      index: playerIndex,
      clientId,
      wins: 0
    };

    this.players.set(playerIndex, player);
    this.credentials.set(name, { password, index: playerIndex });
    
    return { success: true, player, isNew: true };
  }

  getPlayer(index) {
    return this.players.get(index);
  }

  getPlayerByName(name) {
    const credentials = this.credentials.get(name);
    if (credentials) {
      return this.players.get(credentials.index);
    }
    return null;
  }

  getPlayerByClientId(clientId) {
    for (const player of this.players.values()) {
      if (player.clientId === clientId) {
        return player;
      }
    }
    return null;
  }

  // Winners methods
  addWin(playerName) {
    let winner = this.winners.find(w => w.name === playerName);
    if (winner) {
      winner.wins++;
    } else {
      this.winners.push({ name: playerName, wins: 1 });
    }
    
    // Update player's wins count
    const player = this.getPlayerByName(playerName);
    if (player) {
      player.wins++;
    }
    
    // Sort winners by wins count (descending)
    this.winners.sort((a, b) => b.wins - a.wins);
  }

  getWinners() {
    return this.winners.slice(0, 10); // Top 10 winners
  }
}

// module.exports = InMemoryDB;