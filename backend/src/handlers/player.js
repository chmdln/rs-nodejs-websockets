export class PlayerHandler {
  constructor(db) {
    this.db = db;
  }

  async handleRegistration(data, clientId) {
    try {
      const { name, password } = data;

      // Validate input
      if (!name || !password) {
        return this.createResponse('reg', {
          name: '',
          index: '',
          error: true,
          errorText: 'Name and password are required'
        });
      }

      if (name.length < 5) {
        return this.createResponse('reg', {
          name: '',
          index: '',
          error: true,
          errorText: 'Minimum 5 characters'
        });
      }

      if (password.length < 5) {
        return this.createResponse('reg', {
          name: '',
          index: '',
          error: true,
          errorText: 'Minimum 5 characters'
        });
      }

      // Register or login player
      const result = this.db.registerPlayer(name, password, clientId);

      if (result.success) {
        return this.createResponse('reg', {
          name: result.player.name,
          index: result.player.index,
          error: false,
          errorText: ''
        });
      } else {
        return this.createResponse('reg', {
          name: '',
          index: '',
          error: true,
          errorText: result.error
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      return this.createResponse('reg', {
        name: '',
        index: '',
        error: true,
        errorText: 'Registration failed'
      });
    }
  }

  createResponse(type, data) {
    return {
      type,
      data: JSON.stringify(data),
      id: 0
    };
  }
}
