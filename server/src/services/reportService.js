const { pool } = require('../config/db');
const {
  getDailyRange,
  getMonthToDateRange,
  getPreviousMonthRange,
} = require('../utils/reportDates');

class ReportService {
  async getSummaryForRange(userId, startDate, endDate) {
    const result = await pool.query(
      `SELECT 
         MAX(value) AS highest,
         MIN(value) AS lowest,
         ROUND(AVG(value)::numeric, 1) AS average,
         COUNT(id)::int AS total_readings
       FROM glucose_readings
       WHERE user_id = $1 AND reading_date >= $2 AND reading_date <= $3`,
      [userId, startDate, endDate]
    );

    const row = result.rows[0];
    const totalReadings = Number(row.total_readings) || 0;

    if (totalReadings === 0) {
      return {
        highest: null,
        lowest: null,
        average: null,
        total_readings: 0,
      };
    }

    return {
      highest: Number(row.highest),
      lowest: Number(row.lowest),
      average: parseFloat(row.average),
      total_readings: totalReadings,
    };
  }

  async getDailyReport(userId, dateStr) {
    const { startDate, endDate } = getDailyRange(dateStr);
    const summary = await this.getSummaryForRange(userId, startDate, endDate);

    const readingsResult = await pool.query(
      `SELECT 
         id, 
         slot, 
         value 
       FROM glucose_readings 
       WHERE user_id = $1 AND reading_date = $2
       ORDER BY 
         CASE slot
           WHEN 'MORNING_FASTING' THEN 1
           WHEN 'AFTER_BREAKFAST' THEN 2
           WHEN 'AFTER_LUNCH' THEN 3
           WHEN 'AFTER_DINNER' THEN 4
         END ASC`,
      [userId, dateStr]
    );

    return {
      report_type: 'daily',
      start_date: startDate,
      end_date: endDate,
      summary,
      readings: readingsResult.rows,
    };
  }

  async getMonthToDateReport(userId, dateStr) {
    const { startDate, endDate } = getMonthToDateRange(dateStr);
    const summary = await this.getSummaryForRange(userId, startDate, endDate);

    return {
      report_type: 'month_to_date',
      start_date: startDate,
      end_date: endDate,
      summary,
    };
  }

  async getMonthlyReport(userId, dateStr) {
    const { startDate, endDate } = getPreviousMonthRange(dateStr);
    const summary = await this.getSummaryForRange(userId, startDate, endDate);

    return {
      report_type: 'monthly',
      start_date: startDate,
      end_date: endDate,
      summary,
    };
  }
}

module.exports = new ReportService();
