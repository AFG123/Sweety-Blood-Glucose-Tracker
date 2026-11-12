const readingService = require('../services/readingService');

class ReadingController {
  async createReading(req, res, next) {
    try {
      const reading = await readingService.createReading(req.user.id, req.body);

      return res.status(201).json({
        success: true,
        message: 'Reading created successfully',
        data: {
          reading,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getAllReadings(req, res, next) {
    try {
      const readings = await readingService.getAllReadings(req.user.id);

      return res.status(200).json({
        success: true,
        data: {
          readings,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateReading(req, res, next) {
    try {
      const readingId = parseInt(req.params.id, 10);

      if (isNaN(readingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reading ID',
          errors: [{ field: 'id', message: 'Reading ID must be a valid integer' }],
        });
      }

      const reading = await readingService.updateReading(req.user.id, readingId, req.body);

      return res.status(200).json({
        success: true,
        message: 'Reading updated successfully',
        data: {
          reading,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteReading(req, res, next) {
    try {
      const readingId = parseInt(req.params.id, 10);

      if (isNaN(readingId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reading ID',
          errors: [{ field: 'id', message: 'Reading ID must be a valid integer' }],
        });
      }

      await readingService.deleteReading(req.user.id, readingId);

      // 204 No Content for successful deletion
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReadingController();
