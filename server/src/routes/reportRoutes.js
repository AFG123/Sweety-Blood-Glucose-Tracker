const express = require('express');
const reportController = require('../controllers/reportController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

// All report endpoints require authentication
router.use(requireAuth);

router.get('/daily', reportController.getDailyReport);
router.get('/month-to-date', reportController.getMonthToDateReport);
router.get('/monthly', reportController.getMonthlyReport);

module.exports = router;
