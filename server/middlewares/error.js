/**
 * 自定义错误处理中间件
 */

// 错误响应助手
const errorResponse = (res, message, statusCode, error = undefined) => {
  const response = {
    success: false,
    message
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error(err);

  let error = { ...err };
  error.message = err.message;

  // Mongoose 错误处理
  // 无效的 ObjectId
  if (err.name === 'CastError') {
    const message = '资源不存在';
    return errorResponse(res, message, 404);
  }

  // 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} 已存在，请使用其他值`;
    return errorResponse(res, message, 400);
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return errorResponse(res, message, 400);
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, '无效的令牌', 401);
  }

  // JWT 过期
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, '令牌已过期', 401);
  }

  // 默认服务器错误
  return errorResponse(
    res,
    error.message || '服务器内部错误',
    error.statusCode || 500,
    process.env.NODE_ENV === 'development' ? err : undefined
  );
};

module.exports = errorHandler; 