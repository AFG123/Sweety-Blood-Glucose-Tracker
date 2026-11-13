const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const { pool } = require('../config/db');
const { hashPassword } = require('../utils/password');
const { getTodayIST } = require('../utils/date');
const { getPreviousMonthRange } = require('../utils/reportDates');

async function seedDatabase() {
  console.log('\n======================================================');
  console.log('            SWEETY - DATABASE SEED SCRIPT             ');
  console.log('======================================================\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const demoEmail = 'demo@sweety.com';
    const demoPassword = 'Password123';
    const demoName = 'Demo Patient';

    // 1. Check or create demo user
    let userResult = await client.query('SELECT id FROM users WHERE email = $1', [demoEmail]);
    let userId;

    if (userResult.rows.length === 0) {
      const passwordHash = await hashPassword(demoPassword);
      const insertUser = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [demoName, demoEmail, passwordHash]
      );
      userId = insertUser.rows[0].id;
      console.log(`✓ Created demo user: ${demoEmail}`);
    } else {
      userId = userResult.rows[0].id;
      console.log(`✓ Existing demo user found (ID: ${userId})`);
      // Clean previous readings for fresh demo data
      await client.query('DELETE FROM glucose_readings WHERE user_id = $1', [userId]);
      console.log('✓ Cleared previous readings for fresh seed');
    }

    // 2. Prepare dates
    const today = getTodayIST(); // e.g. 2026-11-13

    // Helper to calculate offset days in YYYY-MM-DD
    const getOffsetDate = (baseDateStr, daysOffset) => {
      const [y, m, d] = baseDateStr.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d + daysOffset));
      return date.toISOString().slice(0, 10);
    };

    const yesterday = getOffsetDate(today, -1);
    const threeDaysAgo = getOffsetDate(today, -3);
    const firstOfCurrentMonth = `${today.slice(0, 7)}-01`;

    // Previous month dates
    const { startDate: prevMonthStart, endDate: prevMonthEnd } = getPreviousMonthRange(today);
    const prevMonthMid = getOffsetDate(prevMonthStart, 14); // 15th of prev month
    const prevMonthEarly = getOffsetDate(prevMonthStart, 5); // 6th of prev month

    // 3. Define sample readings
    const sampleReadings = [
      // Today (3 slots logged, leaving After Dinner available for testing)
      { date: today, slot: 'MORNING_FASTING', value: 95 },
      { date: today, slot: 'AFTER_BREAKFAST', value: 135 },
      { date: today, slot: 'AFTER_LUNCH', value: 150 },

      // Yesterday (all 4 slots)
      { date: yesterday, slot: 'MORNING_FASTING', value: 92 },
      { date: yesterday, slot: 'AFTER_BREAKFAST', value: 140 },
      { date: yesterday, slot: 'AFTER_LUNCH', value: 158 },
      { date: yesterday, slot: 'AFTER_DINNER', value: 145 },

      // 3 days ago (all 4 slots)
      { date: threeDaysAgo, slot: 'MORNING_FASTING', value: 88 },
      { date: threeDaysAgo, slot: 'AFTER_BREAKFAST', value: 130 },
      { date: threeDaysAgo, slot: 'AFTER_LUNCH', value: 162 },
      { date: threeDaysAgo, slot: 'AFTER_DINNER', value: 138 },

      // 1st of Current Month (if different from today/yesterday)
      ...(firstOfCurrentMonth !== today && firstOfCurrentMonth !== yesterday && firstOfCurrentMonth !== threeDaysAgo
        ? [
            { date: firstOfCurrentMonth, slot: 'MORNING_FASTING', value: 90 },
            { date: firstOfCurrentMonth, slot: 'AFTER_BREAKFAST', value: 138 },
            { date: firstOfCurrentMonth, slot: 'AFTER_LUNCH', value: 152 },
            { date: firstOfCurrentMonth, slot: 'AFTER_DINNER', value: 142 },
          ]
        : []),

      // Previous Calendar Month (rich data for Monthly Report)
      { date: prevMonthEarly, slot: 'MORNING_FASTING', value: 96 },
      { date: prevMonthEarly, slot: 'AFTER_BREAKFAST', value: 142 },
      { date: prevMonthEarly, slot: 'AFTER_LUNCH', value: 168 },
      { date: prevMonthEarly, slot: 'AFTER_DINNER', value: 155 },

      { date: prevMonthMid, slot: 'MORNING_FASTING', value: 102 },
      { date: prevMonthMid, slot: 'AFTER_BREAKFAST', value: 148 },
      { date: prevMonthMid, slot: 'AFTER_LUNCH', value: 175 },
      { date: prevMonthMid, slot: 'AFTER_DINNER', value: 160 },

      { date: prevMonthEnd, slot: 'MORNING_FASTING', value: 94 },
      { date: prevMonthEnd, slot: 'AFTER_BREAKFAST', value: 136 },
      { date: prevMonthEnd, slot: 'AFTER_LUNCH', value: 154 },
      { date: prevMonthEnd, slot: 'AFTER_DINNER', value: 148 },
    ];

    // Filter duplicates just in case dates overlap
    const uniqueMap = new Map();
    sampleReadings.forEach((r) => {
      const key = `${r.date}_${r.slot}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, r);
    });
    const uniqueReadings = Array.from(uniqueMap.values());

    for (const r of uniqueReadings) {
      await client.query(
        `INSERT INTO glucose_readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4)`,
        [userId, r.date, r.slot, r.value]
      );
    }

    await client.query('COMMIT');

    console.log(`✓ Inserted ${uniqueReadings.length} realistic sample glucose readings across:`);
    console.log(`   - Today (${today}): 3 slots logged (After Dinner free to test)`);
    console.log(`   - Earlier this month (${firstOfCurrentMonth} to ${yesterday})`);
    console.log(`   - Previous calendar month (${prevMonthStart} to ${prevMonthEnd})`);
    console.log('\n======================================================');
    console.log('              DEMO LOGIN CREDENTIALS                  ');
    console.log('======================================================');
    console.log(`Email:    ${demoEmail}`);
    console.log(`Password: ${demoPassword}`);
    console.log('======================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed script failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
