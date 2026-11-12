const crypto = require('crypto');
const { pool } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require('../utils/tokens');

class AuthService {
  async registerUser({ name, email, password }) {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      const error = new Error('Email is already registered');
      error.statusCode = 409;
      error.errors = [{ field: 'email', message: 'Email is already registered' }];
      throw error;
    }

    const passwordHash = await hashPassword(password);
    const familyId = crypto.randomUUID();
    const { rawToken, expiresAt } = generateRefreshToken();
    const tokenHash = hashToken(rawToken);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userInsert = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email`,
        [name, email, passwordHash]
      );

      const user = userInsert.rows[0];

      await client.query(
        `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, familyId, tokenHash, expiresAt]
      );

      await client.query('COMMIT');

      const accessToken = generateAccessToken(user.id);

      return {
        user,
        accessToken,
        rawRefreshToken: rawToken,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async loginUser({ email, password }) {
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.errors = [{ field: 'credentials', message: 'Invalid email or password' }];
      throw error;
    }

    const user = result.rows[0];
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.errors = [{ field: 'credentials', message: 'Invalid email or password' }];
      throw error;
    }

    const familyId = crypto.randomUUID();
    const { rawToken, expiresAt } = generateRefreshToken();
    const tokenHash = hashToken(rawToken);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, familyId, tokenHash, expiresAt]
    );

    const accessToken = generateAccessToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      rawRefreshToken: rawToken,
    };
  }

  async rotateRefreshToken(rawRefreshToken) {
    if (!rawRefreshToken) {
      const error = new Error('Refresh token is required');
      error.statusCode = 401;
      error.errors = [{ field: 'refreshToken', message: 'Refresh token is required' }];
      throw error;
    }

    const tokenHash = hashToken(rawRefreshToken);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Row-level lock to safely handle concurrent refresh requests
      const tokenResult = await client.query(
        `SELECT id, user_id, family_id, expires_at, used_at, revoked_at
         FROM refresh_tokens
         WHERE token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        const error = new Error('Invalid refresh token');
        error.statusCode = 401;
        error.errors = [{ field: 'refreshToken', message: 'Invalid refresh token' }];
        throw error;
      }

      const tokenRecord = tokenResult.rows[0];

      // Detect Token Reuse / Replay Attack
      if (tokenRecord.used_at !== null) {
        await client.query(
          `UPDATE refresh_tokens
           SET revoked_at = NOW()
           WHERE family_id = $1`,
          [tokenRecord.family_id]
        );
        await client.query('COMMIT');

        const error = new Error('Refresh token reuse detected. Session revoked.');
        error.statusCode = 401;
        error.errors = [{ field: 'refreshToken', message: 'Session revoked due to token reuse' }];
        throw error;
      }

      // Check if already revoked or expired
      if (tokenRecord.revoked_at !== null || new Date() > new Date(tokenRecord.expires_at)) {
        await client.query('ROLLBACK');
        const error = new Error('Refresh token has expired or been revoked');
        error.statusCode = 401;
        error.errors = [{ field: 'refreshToken', message: 'Refresh token has expired or been revoked' }];
        throw error;
      }

      // Mark current token as used
      await client.query(
        'UPDATE refresh_tokens SET used_at = NOW() WHERE id = $1',
        [tokenRecord.id]
      );

      // Generate replacement refresh token within same family
      const { rawToken: newRawToken, expiresAt: newExpiresAt } = generateRefreshToken();
      const newTokenHash = hashToken(newRawToken);

      await client.query(
        `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [tokenRecord.user_id, tokenRecord.family_id, newTokenHash, newExpiresAt]
      );

      await client.query('COMMIT');

      const newAccessToken = generateAccessToken(tokenRecord.user_id);

      return {
        accessToken: newAccessToken,
        rawRefreshToken: newRawToken,
        userId: tokenRecord.user_id,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async logoutUser(rawRefreshToken) {
    if (!rawRefreshToken) return true;

    const tokenHash = hashToken(rawRefreshToken);
    const result = await pool.query(
      'SELECT family_id FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );

    if (result.rows.length > 0) {
      const familyId = result.rows[0].family_id;
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1',
        [familyId]
      );
    }

    return true;
  }

  async getUserProfile(userId) {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.errors = [{ field: 'user', message: 'User not found' }];
      throw error;
    }

    return result.rows[0];
  }
}

module.exports = new AuthService();
