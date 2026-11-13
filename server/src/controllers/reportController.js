const reportService = require('../services/reportService');
const { isValidDateFormat } = require('../utils/date');

function validateDateParam(req, res) {
  const { date } = req.query;

  if (!date || !isValidDateFormat(date)) {
    res.status(400).json({
      success: false,
      message: 'Invalid or missing date parameter',
      errors: [
        {
          field: 'date',
          message: "Query parameter 'date' is required and must be a valid date in YYYY-MM-DD format",
        },
      ],
    });
    return null;
  }

  return date;
}

class ReportController {
  async getDailyReport(req, res, next) {
    try {
      const date = validateDateParam(req, res);
      if (!date) return;

      const report = await reportService.getDailyReport(req.user.id, date);

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMonthToDateReport(req, res, next) {
    try {
      const date = validateDateParam(req, res);
      if (!date) return;

      const report = await reportService.getMonthToDateReport(req.user.id, date);

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMonthlyReport(req, res, next) {
    try {
      const date = validateDateParam(req, res);
      if (!date) return;

      const report = await reportService.getMonthlyReport(req.user.id, date);

      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();
