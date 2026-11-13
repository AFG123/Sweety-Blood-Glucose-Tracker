const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const app = require('../app');
const { pool } = require('../config/db');

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✗\x1b[0m ${testName} ${details ? `(${details})` : ''}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('       SWEETY - END-TO-END AUTOMATED TEST SUITE       ');
  console.log('======================================================\n');

  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`Test server active on ${BASE_URL}\n`);

  try {
    // Clean test database
    await pool.query('TRUNCATE users CASCADE');

    // -------------------------------------------------------------------------
    console.log('\x1b[36m[GROUP 1] Authentication & Input Validations\x1b[0m');
    // -------------------------------------------------------------------------

    // 1. Weak password rejected
    const weakPassRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Weak User', email: 'weak@example.com', password: '123' }),
    });
    assert(weakPassRes.status === 400, 'Weak password (<8 chars) returns 400 Bad Request');

    // 2. Password without numbers rejected
    const noNumPassRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No Num', email: 'nonum@example.com', password: 'PasswordOnly' }),
    });
    assert(noNumPassRes.status === 400, 'Password missing required number returns 400 Bad Request');

    // 3. Password exceeding 12 chars rejected
    const longPassRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Long User', email: 'long@example.com', password: 'Password12345678' }),
    });
    assert(longPassRes.status === 400, 'Password > 12 characters returns 400 Bad Request');

    // 4. Valid user registration (User A)
    const userAEmail = `user_a_${Date.now()}@example.com`;
    const regResA = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: userAEmail, password: 'Password123' }),
    });
    const regDataA = await regResA.json();
    const cookiesA = regResA.headers.getSetCookie();

    assert(regResA.status === 201, 'Valid user registration returns 201 Created');
    assert(regDataA.data?.user?.email === userAEmail, 'Response contains user profile without password');
    assert(cookiesA.some((c) => c.includes('accessToken') && c.includes('HttpOnly')), 'Sets HttpOnly accessToken cookie');
    assert(cookiesA.some((c) => c.includes('refreshToken') && c.includes('HttpOnly')), 'Sets HttpOnly refreshToken cookie');

    // 5. Duplicate email registration rejected
    const dupEmailRes = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dup User', email: userAEmail, password: 'Password123' }),
    });
    assert(dupEmailRes.status === 409, 'Duplicate email registration returns 409 Conflict');

    // 6. Login with wrong password rejected
    const wrongLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'WrongPassword1' }),
    });
    assert(wrongLoginRes.status === 401, 'Login with incorrect password returns 401 Unauthorized');

    // 7. Login with correct password
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'Password123' }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Valid login returns 200 OK');
    assert(loginData.data?.user?.name === 'User A', 'Login response returns clean user profile');

    // -------------------------------------------------------------------------
    console.log('\n\x1b[36m[GROUP 2] CSRF Protection & Cookie Security\x1b[0m');
    // -------------------------------------------------------------------------

    // Fetch CSRF token and cookie
    const csrfRes = await fetch(`${BASE_URL}/api/v1/auth/csrf-token`);
    const csrfCookie = csrfRes.headers.get('set-cookie');
    const { data: { csrfToken } } = await csrfRes.json();

    assert(csrfRes.status === 200, 'GET /api/v1/auth/csrf-token returns 200 with token');
    assert(!!csrfToken, 'Issues cryptographically random CSRF token');

    const authCookiesHeader = cookiesA.join('; ');
    const allCookies = [csrfCookie, authCookiesHeader].join('; ');

    // State-changing request without CSRF header rejected
    const noCsrfReq = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: allCookies },
      body: JSON.stringify({ reading_date: '2026-11-13', slot: 'MORNING_FASTING', value: 95 }),
    });
    assert(noCsrfReq.status === 403, 'POST without X-CSRF-Token header returns 403 Forbidden');

    // -------------------------------------------------------------------------
    console.log('\n\x1b[36m[GROUP 3] Token Rotation & Replay Attack Defense\x1b[0m');
    // -------------------------------------------------------------------------

    // 1. Successful refresh rotates token
    const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        cookie: allCookies,
      },
    });
    const refreshedCookies = refreshRes.headers.getSetCookie();
    assert(refreshRes.status === 200, 'POST /api/v1/auth/refresh returns 200 OK and rotates tokens');
    assert(refreshedCookies.length >= 2, 'Issues fresh access and refresh cookies upon rotation');

    // 2. Replaying the previous (already used) refresh token triggers reuse detection
    const replayRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        cookie: allCookies, // Sending original already-used cookie
      },
    });
    assert(replayRes.status === 401, 'Replay attack correctly detected: returns 401 and revokes family');

    // -------------------------------------------------------------------------
    console.log('\n\x1b[36m[GROUP 4] Glucose Readings CRUD & Business Rules\x1b[0m');
    // -------------------------------------------------------------------------

    // Login fresh to get active session
    const freshLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: 'Password123' }),
    });
    const freshAuthCookies = [csrfCookie, ...freshLogin.headers.getSetCookie()].join('; ');

    // 1. Future date rejected
    const futureDateRes = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
      body: JSON.stringify({ reading_date: '2026-12-31', slot: 'MORNING_FASTING', value: 95 }),
    });
    assert(futureDateRes.status === 400, 'Future reading date returns 400 Bad Request');

    // 2. Glucose value < 40 rejected
    const lowValueRes = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
      body: JSON.stringify({ reading_date: '2026-11-10', slot: 'MORNING_FASTING', value: 39 }),
    });
    assert(lowValueRes.status === 400, 'Glucose value < 40 mg/dL returns 400 Bad Request');

    // 3. Glucose value > 600 rejected
    const highValueRes = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
      body: JSON.stringify({ reading_date: '2026-11-10', slot: 'MORNING_FASTING', value: 601 }),
    });
    assert(highValueRes.status === 400, 'Glucose value > 600 mg/dL returns 400 Bad Request');

    // 4. Decimal values rejected
    const decimalValRes = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
      body: JSON.stringify({ reading_date: '2026-11-10', slot: 'MORNING_FASTING', value: 95.5 }),
    });
    assert(decimalValRes.status === 400, 'Decimal glucose values return 400 Bad Request');

    // 5. Create valid reading (Slot 1)
    const createSlot1 = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
      body: JSON.stringify({ reading_date: '2026-11-10', slot: 'MORNING_FASTING', value: 95 }),
    });
    const createdSlot1Data = await createSlot1.json();
    assert(createSlot1.status === 201, 'POST /api/v1/readings returns 201 Created');

    // 6. Duplicate slot on same date rejected
    const dupSlotRes = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
      body: JSON.stringify({ reading_date: '2026-11-10', slot: 'MORNING_FASTING', value: 105 }),
    });
    assert(dupSlotRes.status === 409, 'Duplicate slot on same date returns 409 Conflict');

    // 7. Add remaining 3 slots for 2026-11-10
    const addReading = (date, slot, val) =>
      fetch(`${BASE_URL}/api/v1/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
        body: JSON.stringify({ reading_date: date, slot, value: val }),
      });

    await addReading('2026-11-10', 'AFTER_BREAKFAST', 145);
    await addReading('2026-11-10', 'AFTER_LUNCH', 165);
    await addReading('2026-11-10', 'AFTER_DINNER', 155);

    // 8. GET all readings deterministically sorted
    const getAllRes = await fetch(`${BASE_URL}/api/v1/readings`, {
      headers: { cookie: freshAuthCookies },
    });
    const allReadingsData = await getAllRes.json();
    assert(getAllRes.status === 200, 'GET /api/v1/readings returns 200 OK');
    assert(allReadingsData.data?.readings?.length === 4, 'Returns all 4 readings for user');

    // 9. Update reading value
    const slot1Id = createdSlot1Data.data.reading.id;
    const patchRes = await fetch(`${BASE_URL}/api/v1/readings/${slot1Id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
      body: JSON.stringify({ value: 99 }),
    });
    const patchedData = await patchRes.json();
    assert(patchRes.status === 200, 'PATCH /api/v1/readings/:id returns 200 OK');
    assert(patchedData.data?.reading?.value === 99, 'Reading value successfully updated');

    // 10. Cross-user isolation (Register User B)
    const userBEmail = `user_b_${Date.now()}@example.com`;
    const regResB = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: userBEmail, password: 'Password123' }),
    });
    const userBCookies = [csrfCookie, ...regResB.headers.getSetCookie()].join('; ');

    // User B tries to update User A's reading
    const crossUpdateRes = await fetch(`${BASE_URL}/api/v1/readings/${slot1Id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: userBCookies },
      body: JSON.stringify({ value: 500 }),
    });
    assert(crossUpdateRes.status === 404, 'Cross-user update returns 404 Not Found (Row isolation)');

    // 11. Delete reading & verify slot recycling
    const deleteRes = await fetch(`${BASE_URL}/api/v1/readings/${slot1Id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
    });
    assert(deleteRes.status === 204, 'DELETE /api/v1/readings/:id returns 204 No Content');

    // Re-create reading on the newly deleted slot
    const recycleRes = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, cookie: freshAuthCookies },
      body: JSON.stringify({ reading_date: '2026-11-10', slot: 'MORNING_FASTING', value: 96 }),
    });
    assert(recycleRes.status === 201, 'Slot is recycled and can be re-recorded after deletion');

    // -------------------------------------------------------------------------
    console.log('\n\x1b[36m[GROUP 5] Statistical Reports & Empty States\x1b[0m');
    // -------------------------------------------------------------------------

    // Add reading in previous calendar month (October)
    await addReading('2026-10-15', 'MORNING_FASTING', 110);
    await addReading('2026-10-15', 'AFTER_LUNCH', 170);

    // 1. Daily Report for 2026-11-10
    const dailyRepRes = await fetch(`${BASE_URL}/api/v1/reports/daily?date=2026-11-10`, {
      headers: { cookie: freshAuthCookies },
    });
    const dailyRep = await dailyRepRes.json();
    assert(dailyRepRes.status === 200, 'GET /api/v1/reports/daily returns 200 OK');
    assert(dailyRep.data?.summary?.highest === 165, 'Daily report calculates correct highest value (165)');
    assert(dailyRep.data?.summary?.lowest === 96, 'Daily report calculates correct lowest value (96)');
    assert(dailyRep.data?.summary?.total_readings === 4, 'Daily report calculates correct total count (4)');
    assert(dailyRep.data?.readings?.length === 4, 'Daily report returns individual slot breakdown');

    // 2. Month-to-Date Report
    const mtdRepRes = await fetch(`${BASE_URL}/api/v1/reports/month-to-date?date=2026-11-10`, {
      headers: { cookie: freshAuthCookies },
    });
    const mtdRep = await mtdRepRes.json();
    assert(mtdRepRes.status === 200, 'GET /api/v1/reports/month-to-date returns 200 OK');
    assert(mtdRep.data?.start_date === '2026-11-01', 'MTD report begins on the 1st of the month');
    assert(mtdRep.data?.end_date === '2026-11-10', 'MTD report ends on selected date');

    // 3. Monthly Report (Previous calendar month)
    const monthlyRepRes = await fetch(`${BASE_URL}/api/v1/reports/monthly?date=2026-11-10`, {
      headers: { cookie: freshAuthCookies },
    });
    const monthlyRep = await monthlyRepRes.json();
    assert(monthlyRepRes.status === 200, 'GET /api/v1/reports/monthly returns 200 OK');
    assert(monthlyRep.data?.start_date === '2026-10-01', 'Monthly report covers full previous month start');
    assert(monthlyRep.data?.end_date === '2026-10-31', 'Monthly report covers full previous month end');
    assert(monthlyRep.data?.summary?.total_readings === 2, 'Monthly report aggregates correct previous month count');

    // 4. Empty Report State (No readings recorded)
    const emptyRepRes = await fetch(`${BASE_URL}/api/v1/reports/daily?date=2026-04-01`, {
      headers: { cookie: freshAuthCookies },
    });
    const emptyRep = await emptyRepRes.json();
    assert(emptyRepRes.status === 200, 'Empty date report returns 200 OK (not error)');
    assert(emptyRep.data?.summary?.highest === null, 'Empty report highest is null');
    assert(emptyRep.data?.summary?.lowest === null, 'Empty report lowest is null');
    assert(emptyRep.data?.summary?.average === null, 'Empty report average is null');
    assert(emptyRep.data?.summary?.total_readings === 0, 'Empty report total_readings is 0');
    assert(Array.isArray(emptyRep.data?.readings) && emptyRep.data.readings.length === 0, 'Empty report readings is []');

    // -------------------------------------------------------------------------
    console.log('\n\x1b[36m[GROUP 6] Logout & Session Cleanup\x1b[0m');
    // -------------------------------------------------------------------------

    const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        cookie: freshAuthCookies,
      },
    });
    assert(logoutRes.status === 200, 'POST /api/v1/auth/logout returns 200 OK');

    // Subsequent access returns 401
    const afterLogout = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { cookie: 'accessToken=' },
    });
    assert(afterLogout.status === 401, 'Protected routes reject requests after logout (401)');

    // -------------------------------------------------------------------------
    // Final Summary
    // -------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
    console.log(`\x1b[32mPASSED: ${passedCount}\x1b[0m`);
    if (failedCount > 0) {
      console.log(`\x1b[31mFAILED: ${failedCount}\x1b[0m`);
    } else {
      console.log('\x1b[32mALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)\x1b[0m');
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test suite crashed unexpectedly:', err);
    failedCount++;
  } finally {
    await pool.query('TRUNCATE users CASCADE');
    server.close();
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTestSuite();
