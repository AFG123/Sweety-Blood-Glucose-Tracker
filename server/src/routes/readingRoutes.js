const express = require('express');
const readingController = require('../controllers/readingController');
const { requireAuth } = require('../middlewares/auth');
const { csrfProtection } = require('../middlewares/csrf');
const {
  validateCreateReading,
  validateUpdateReading,
} = require('../middlewares/readingValidation');

const router = express.Router();

// All reading endpoints require user authentication
router.use(requireAuth);

router.post('/', csrfProtection, validateCreateReading, readingController.createReading);
router.get('/', readingController.getAllReadings);
router.patch('/:id', csrfProtection, validateUpdateReading, readingController.updateReading);
router.delete('/:id', csrfProtection, readingController.deleteReading);

module.exports = router;
