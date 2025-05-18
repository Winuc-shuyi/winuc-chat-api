/**
 * 安全中间件
 * 处理与请求安全相关的逻辑，如请求限流、验证等
 */

const { createRateLimiter, addSecurityHeaders } = require('../utils/security');

// 创建全局限流器
const globalRateLimiter = createRateLimiter(60 * 1000, 120); // 默认每分钟120个请求

// 敏感API特定限流器
const authRateLimiter = createRateLimiter(60 * 1000, 30); // 身份验证接口每分钟30次
const messageRateLimiter = createRateLimiter(60 * 1000, 60); // 消息发送接口每分钟60次

// 中间件：限制请求频率
async function rateLimitMiddleware(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 根据路径使用不同的限流器
  let limiter = globalRateLimiter;
  
  if (path.includes('/api/auth')) {
    limiter = authRateLimiter;
  } else if (path.includes('/api/messages/send') || path.includes('/messages$')) {
    limiter = messageRateLimiter;
  }
  
  // 执行限流检查
  const result = await limiter(request, env, ctx);
  
  if (result.limited) {
    return result.response;
  }
  
  return null;
}

// 中间件：添加安全相关的HTTP头
function securityHeadersMiddleware(response) {
  const headers = Object.fromEntries(response.headers.entries());
  const secureHeaders = addSecurityHeaders(headers);
  
  // 创建新的响应对象，添加安全头
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: secureHeaders
  });
}

// 解析JWT Token
function parseToken(request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
}

// 简单的恶意请求检测
function detectMaliciousRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const searchParams = url.search;
  
  // 检测SQL注入尝试
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i
  ];
  
  // 检测XSS尝试
  const xssPatterns = [
    /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/i,
    /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)/i
  ];
  
  // 合并所有模式
  const patterns = [...sqlInjectionPatterns, ...xssPatterns];
  
  // 检查URL路径和查询参数
  const testString = `${path}${searchParams}`;
  
  for (const pattern of patterns) {
    if (pattern.test(testString)) {
      return true;
    }
  }
  
  return false;
}

// 主安全中间件函数
async function securityMiddleware(request, env, ctx, next) {
  // 检测恶意请求
  if (detectMaliciousRequest(request)) {
    return new Response(JSON.stringify({
      success: false,
      message: '检测到潜在的恶意请求'
    }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 请求频率限制
  const limitResult = await rateLimitMiddleware(request, env, ctx);
  if (limitResult) {
    return limitResult;
  }
  
  // 继续处理请求
  const response = await next();
  
  // 添加安全头
  return securityHeadersMiddleware(response);
}

module.exports = {
  securityMiddleware,
  rateLimitMiddleware,
  securityHeadersMiddleware,
  parseToken,
  detectMaliciousRequest
}; 