const { isValidDateFormat, isFutureDate } = require('../utils/date');

const VALID_SLOTS = [
  'MORNING_FASTING',
  'AFTER_BREAKFAST',
  'AFTER_LUNCH',
  'AFTER_DINNER',
];

function validateCreateReading(req, res, next) {
  const { reading_date, slot, value } = req.body;
  const errors = [];

  if (!reading_date || !isValidDateFormat(reading_date)) {
    errors.push({
      field: 'reading_date',
      message: 'Reading date must be a valid date in YYYY-MM-DD format',
    });
  } else if (isFutureDate(reading_date)) {
    errors.push({
      field: 'reading_date',
      message: 'Reading date cannot be in the future',
    });
  }

  if (!slot || !VALID_SLOTS.includes(slot)) {
    errors.push({
      field: 'slot',
      message: `Slot must be one of: ${VALID_SLOTS.join(', ')}`,
    });
  }

  if (value === undefined || value === null || !Number.isInteger(value) || value < 40 || value > 600) {
    errors.push({
      field: 'value',
      message: 'Glucose value must be a whole number between 40 and 600 mg/dL',
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

function validateUpdateReading(req, res, next) {
  const { reading_date, slot, value } = req.body;
  const errors = [];

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [
        {
          field: 'body',
          message: 'Update request body cannot be empty',
        },
      ],
    });
  }

  if (reading_date !== undefined) {
    if (!isValidDateFormat(reading_date)) {
      errors.push({
        field: 'reading_date',
        message: 'Reading date must be a valid date in YYYY-MM-DD format',
      });
    } else if (isFutureDate(reading_date)) {
      errors.push({
        field: 'reading_date',
        message: 'Reading date cannot be in the future',
      });
    }
  }

  if (slot !== undefined && !VALID_SLOTS.includes(slot)) {
    errors.push({
      field: 'slot',
      message: `Slot must be one of: ${VALID_SLOTS.join(', ')}`,
    });
  }

  if (value !== undefined) {
    if (!Number.isInteger(value) || value < 40 || value > 600) {
      errors.push({
        field: 'value',
        message: 'Glucose value must be a whole number between 40 and 600 mg/dL',
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

module.exports = {
  validateCreateReading,
  validateUpdateReading,
  VALID_SLOTS,
};
