/**
 * 安全工具模块
 * 提供安全相关的功能，如请求限流、CSRF保护、XSS过滤等
 */

const { ObjectId } = require('mongodb');

// 创建请求限流器
function createRateLimiter(window = 60 * 1000, maxRequests = 100) {
  const clients = new Map();
  
  return async function rateLimit(request, env, ctx) {
    // 获取客户端IP
    const clientIp = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    'unknown';
    
    // 当前时间戳
    const now = Date.now();
    
    // 获取或创建客户端记录
    if (!clients.has(clientIp)) {
      clients.set(clientIp, {
        requests: [],
        blocked: false,
        blockedUntil: 0
      });
    }
    
    const client = clients.get(clientIp);
    
    // 检查客户端是否被封禁
    if (client.blocked && now < client.blockedUntil) {
      const retryAfter = Math.ceil((client.blockedUntil - now) / 1000);
      return {
        limited: true,
        retryAfter,
        response: new Response(JSON.stringify({
          success: false,
          message: '请求频率过高，请稍后再试',
          retryAfter
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter)
          }
        })
      };
    }
    
    // 清理过期的请求记录
    client.requests = client.requests.filter(timestamp => now - timestamp < window);
    
    // 检查请求频率
    if (client.requests.length >= maxRequests) {
      // 超过限制，封禁10分钟
      client.blocked = true;
      client.blockedUntil = now + 10 * 60 * 1000;
      
      const retryAfter = 600; // 10分钟
      return {
        limited: true,
        retryAfter,
        response: new Response(JSON.stringify({
          success: false,
          message: '请求频率过高，已被临时限制访问',
          retryAfter
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter)
          }
        })
      };
    }
    
    // 记录本次请求
    client.requests.push(now);
    
    // 每隔一段时间清理过期客户端记录
    if (Math.random() < 0.01) { // 1%的概率执行清理
      for (const [ip, data] of clients.entries()) {
        if (now - Math.max(...data.requests, 0) > window * 2 && !data.blocked) {
          clients.delete(ip);
        }
      }
    }
    
    return { limited: false };
  };
}

// 防范XSS攻击，过滤输入内容中的潜在危险字符
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // 基本HTML转义
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 递归处理对象中的所有字符串属性
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// 添加安全相关的HTTP头
function addSecurityHeaders(headers = {}) {
  return {
    ...headers,
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline';",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };
}

// 验证并转换MongoDB ObjectId
function validateObjectId(id) {
  try {
    if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)) {
      return new ObjectId(id);
    }
    return null;
  } catch (e) {
    return null;
  }
}

// 简单的MongoDB注入防护
function escapeMongoQuery(query) {
  if (typeof query !== 'object' || query === null) return query;
  
  const result = {};
  
  for (const [key, value] of Object.entries(query)) {
    // 递归处理嵌套对象
    if (typeof value === 'object' && value !== null) {
      result[key] = escapeMongoQuery(value);
    } 
    // 特殊处理正则表达式（可能用于模糊查询）
    else if (typeof value === 'string' && key.includes('$regex')) {
      // 移除可能导致正则注入的字符
      result[key] = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } 
    // 处理普通值
    else {
      result[key] = value;
    }
  }
  
  return result;
}

module.exports = {
  createRateLimiter,
  sanitizeInput,
  sanitizeObject,
  addSecurityHeaders,
  validateObjectId,
  escapeMongoQuery
}; 