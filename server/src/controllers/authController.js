const authService = require('../services/authService');
const { validatePassword } = require('../utils/password');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const errors = [];

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Name cannot be empty and must contain non-whitespace characters' });
      }

      if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        errors.push({ field: 'email', message: 'A valid email format is required' });
      }

      if (!password || !validatePassword(password)) {
        errors.push({
          field: 'password',
          message: 'Password must be 8-12 characters and contain at least one uppercase letter, one lowercase letter, and one number',
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }

      const result = await authService.registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      setAuthCookies(res, result.accessToken, result.rawRefreshToken);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: result.user,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const errors = [];

      if (!email || typeof email !== 'string' || email.trim().length === 0) {
        errors.push({ field: 'email', message: 'Email cannot be empty' });
      } else if (!EMAIL_REGEX.test(email.trim())) {
        errors.push({ field: 'email', message: 'A valid email format is required' });
      }

      if (!password || typeof password !== 'string' || password.length === 0) {
        errors.push({ field: 'password', message: 'Password cannot be empty' });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }

      const result = await authService.loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      setAuthCookies(res, result.accessToken, result.rawRefreshToken);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const rawRefreshToken = req.cookies ? req.cookies.refreshToken : null;

      if (!rawRefreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: [{ field: 'refreshToken', message: 'Missing refresh token cookie' }],
        });
      }

      const result = await authService.rotateRefreshToken(rawRefreshToken);

      setAuthCookies(res, result.accessToken, result.rawRefreshToken);

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
      });
    } catch (err) {
      clearAuthCookies(res);
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const rawRefreshToken = req.cookies ? req.cookies.refreshToken : null;

      if (rawRefreshToken) {
        await authService.logoutUser(rawRefreshToken);
      }

      clearAuthCookies(res);

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      clearAuthCookies(res);
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getUserProfile(req.user.id);

      return res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
