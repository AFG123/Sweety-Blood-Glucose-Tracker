function errorHandler(err, req, res, next) {
  // Handle invalid JSON body syntax errors from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload in request body',
      errors: [
        {
          field: 'body',
          message: 'The request body must be valid JSON',
        },
      ],
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (statusCode === 500) {
    console.error('Unhandled server error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [
      {
        field: 'server',
        message: statusCode === 500 ? 'An unexpected server error occurred' : message,
      },
    ],
  });
}

module.exports = {
  errorHandler,
};
