const express = require('express');
const authController = require('../controllers/authController');
const { issueCsrfToken, csrfProtection } = require('../middlewares/csrf');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/csrf-token', issueCsrfToken);
router.post('/refresh', csrfProtection, authController.refresh);
router.post('/logout', csrfProtection, authController.logout);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
