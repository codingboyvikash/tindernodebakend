const { validationResult } = require('express-validator');
const AppError = require('../utils/appError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map((err) => extractedErrors.push({ [err.path || err.param]: err.msg }));

  return res.status(400).json({
    status: 'fail',
    errors: extractedErrors,
    message: 'Validation failed',
  });
};

module.exports = validate;
