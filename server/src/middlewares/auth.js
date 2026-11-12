const { verifyAccessToken } = require('../utils/tokens');

function requireAuth(req, res, next) {
  const token = req.cookies ? req.cookies.accessToken : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: [
        {
          field: 'authorization',
          message: 'Missing access token',
        },
      ],
    });
  }

  const payload = verifyAccessToken(token);

  if (!payload || !payload.userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: [
        {
          field: 'authorization',
          message: 'Invalid or expired access token',
        },
      ],
    });
  }

  // Derive authenticated identity strictly from verified token
  req.user = { id: payload.userId };
  next();
}

module.exports = {
  requireAuth,
};
