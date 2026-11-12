const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const CSRF_COOKIE_NAME = '_csrf';

function generateCsrfPair() {
  const token = crypto.randomBytes(32).toString('hex');
  const secret = process.env.CSRF_SECRET || 'fallback_dev_csrf_secret_32_characters';
  const signature = crypto.createHmac('sha256', secret).update(token).digest('hex');
  return { token, signature };
}

function verifyCsrfToken(token, signature) {
  if (!token || !signature) return false;
  const secret = process.env.CSRF_SECRET || 'fallback_dev_csrf_secret_32_characters';
  const expectedSignature = crypto.createHmac('sha256', secret).update(token).digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

function issueCsrfToken(req, res) {
  const { token, signature } = generateCsrfPair();

  res.cookie(CSRF_COOKIE_NAME, signature, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    data: { csrfToken: token },
  });
}

function csrfProtection(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Allow unauthenticated registration and login without CSRF
  // since no authenticated session cookie is being consumed
  if (req.path === '/api/v1/auth/register' || req.path === '/api/v1/auth/login') {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'];
  const storedSignature = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;

  if (!clientToken || !storedSignature || !verifyCsrfToken(clientToken, storedSignature)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
      errors: [
        {
          field: 'csrfToken',
          message: 'A valid X-CSRF-Token header and CSRF cookie are required for this action',
        },
      ],
    });
  }

  next();
}

module.exports = {
  issueCsrfToken,
  csrfProtection,
  generateCsrfPair,
  verifyCsrfToken,
};
