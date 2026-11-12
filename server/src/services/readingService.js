const { pool } = require('../config/db');

class ReadingService {
  async createReading(userId, { reading_date, slot, value }) {
    const existing = await pool.query(
      `SELECT id FROM glucose_readings 
       WHERE user_id = $1 AND reading_date = $2 AND slot = $3`,
      [userId, reading_date, slot]
    );

    if (existing.rows.length > 0) {
      const error = new Error(`A reading for slot '${slot}' on date '${reading_date}' already exists`);
      error.statusCode = 409;
      error.errors = [
        {
          field: 'slot',
          message: `A reading for slot '${slot}' on date '${reading_date}' already exists`,
        },
      ];
      throw error;
    }

    try {
      const result = await pool.query(
        `INSERT INTO glucose_readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4)
         RETURNING 
           id, 
           user_id, 
           TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date, 
           slot, 
           value, 
           created_at, 
           updated_at`,
        [userId, reading_date, slot, value]
      );

      return result.rows[0];
    } catch (dbError) {
      // Catch unique constraint violation in case of concurrent requests
      if (dbError.code === '23505') {
        const error = new Error(`A reading for slot '${slot}' on date '${reading_date}' already exists`);
        error.statusCode = 409;
        error.errors = [
          {
            field: 'slot',
            message: `A reading for slot '${slot}' on date '${reading_date}' already exists`,
          },
        ];
        throw error;
      }
      throw dbError;
    }
  }

  async getAllReadings(userId) {
    const result = await pool.query(
      `SELECT 
         id,
         TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
         slot,
         value
       FROM glucose_readings
       WHERE user_id = $1
       ORDER BY 
         reading_date DESC,
         CASE slot
           WHEN 'MORNING_FASTING' THEN 1
           WHEN 'AFTER_BREAKFAST' THEN 2
           WHEN 'AFTER_LUNCH' THEN 3
           WHEN 'AFTER_DINNER' THEN 4
         END ASC`,
      [userId]
    );

    return result.rows;
  }

  async updateReading(userId, readingId, updateData) {
    const existing = await pool.query(
      `SELECT 
         id, 
         user_id, 
         TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date, 
         slot, 
         value
       FROM glucose_readings
       WHERE id = $1 AND user_id = $2`,
      [readingId, userId]
    );

    if (existing.rows.length === 0) {
      const error = new Error('Reading not found');
      error.statusCode = 404;
      error.errors = [{ field: 'reading', message: 'Reading not found' }];
      throw error;
    }

    const current = existing.rows[0];
    const newDate = updateData.reading_date || current.reading_date;
    const newSlot = updateData.slot || current.slot;
    const newValue = updateData.value !== undefined ? updateData.value : current.value;

    // Check conflict if date or slot is modified
    if (newDate !== current.reading_date || newSlot !== current.slot) {
      const conflict = await pool.query(
        `SELECT id FROM glucose_readings
         WHERE user_id = $1 AND reading_date = $2 AND slot = $3 AND id != $4`,
        [userId, newDate, newSlot, readingId]
      );

      if (conflict.rows.length > 0) {
        const error = new Error(`A reading for slot '${newSlot}' on date '${newDate}' already exists`);
        error.statusCode = 409;
        error.errors = [
          {
            field: 'slot',
            message: `A reading for slot '${newSlot}' on date '${newDate}' already exists`,
          },
        ];
        throw error;
      }
    }

    try {
      const result = await pool.query(
        `UPDATE glucose_readings
         SET 
           reading_date = $1,
           slot = $2,
           value = $3,
           updated_at = NOW()
         WHERE id = $4 AND user_id = $5
         RETURNING 
           id, 
           TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date, 
           slot, 
           value`,
        [newDate, newSlot, newValue, readingId, userId]
      );

      return result.rows[0];
    } catch (dbError) {
      if (dbError.code === '23505') {
        const error = new Error(`A reading for slot '${newSlot}' on date '${newDate}' already exists`);
        error.statusCode = 409;
        error.errors = [
          {
            field: 'slot',
            message: `A reading for slot '${newSlot}' on date '${newDate}' already exists`,
          },
        ];
        throw error;
      }
      throw dbError;
    }
  }

  async deleteReading(userId, readingId) {
    const result = await pool.query(
      'DELETE FROM glucose_readings WHERE id = $1 AND user_id = $2 RETURNING id',
      [readingId, userId]
    );

    if (result.rows.length === 0) {
      const error = new Error('Reading not found');
      error.statusCode = 404;
      error.errors = [{ field: 'reading', message: 'Reading not found' }];
      throw error;
    }

    return true;
  }
}

module.exports = new ReadingService();
