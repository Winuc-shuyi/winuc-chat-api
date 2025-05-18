/**
 * 缓存中间件
 * 处理API响应的缓存逻辑，提高访问性能
 */

const { getCache, setCache } = require('../utils/cache');

// 判断请求是否可缓存
function isCacheable(request) {
  // 只缓存GET请求
  if (request.method !== 'GET') {
    return false;
  }
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 不缓存认证相关API
  if (path.includes('/api/auth')) {
    return false;
  }
  
  // 不缓存长轮询请求
  if (path.includes('/api/poll')) {
    return false;
  }
  
  // 不缓存带认证的请求
  if (request.headers.has('Authorization')) {
    return false;
  }
  
  // 下面是可以缓存的路径
  const cacheablePaths = [
    '/api/users', // 用户列表
    '/api/groups', // 公开群组列表
  ];
  
  return cacheablePaths.some(cachePath => path.startsWith(cachePath));
}

// 生成缓存键
function generateCacheKey(request) {
  const url = new URL(request.url);
  return `cache:${url.pathname}${url.search}`;
}

// 缓存过期时间（秒）
function getCacheTTL(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 不同类型的API可以设置不同的缓存过期时间
  if (path.includes('/api/users')) {
    return 300; // 用户列表缓存5分钟
  }
  
  if (path.includes('/api/groups')) {
    return 600; // 群组列表缓存10分钟
  }
  
  // 默认缓存时间
  return 60; // 默认1分钟
}

// 缓存中间件主函数
async function cacheMiddleware(request, env, ctx, next) {
  // 检查是否可缓存
  if (!isCacheable(request)) {
    return await next();
  }
  
  // 生成缓存键
  const cacheKey = generateCacheKey(request);
  
  // 尝试从缓存获取响应
  const cachedResponse = await getCache(env, cacheKey);
  
  if (cachedResponse) {
    // 返回带缓存标记的响应
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      headers: {
        ...cachedResponse.headers,
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=60'
      }
    });
  }
  
  // 缓存未命中，执行后续中间件和API处理
  const response = await next();
  
  // 只缓存成功的响应
  if (response.status === 200 || response.status === 304) {
    // 克隆响应以便可以同时缓存和返回
    const clonedResponse = response.clone();
    
    // 读取响应体
    const body = await clonedResponse.text();
    
    // 收集响应头
    const headers = {};
    for (const [key, value] of clonedResponse.headers.entries()) {
      headers[key] = value;
    }
    
    // 构建要缓存的对象
    const responseToCache = {
      body,
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers
    };
    
    // 异步存储到缓存（不阻塞响应）
    const ttl = getCacheTTL(request);
    setCache(env, cacheKey, responseToCache, ttl).catch(err => {
      console.error(`缓存响应失败(${cacheKey}):`, err);
    });
    
    // 返回带缓存未命中标记的响应
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...headers,
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${ttl}`
      }
    });
  }
  
  // 返回原始响应
  return response;
}

module.exports = {
  cacheMiddleware,
  isCacheable,
  generateCacheKey,
  getCacheTTL
}; 