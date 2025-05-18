/**
 * WinUC Chat API - CloudFlare Workers入口文件
 * 
 * 本文件用于在CloudFlare Workers上部署API服务
 * 包含了各种性能优化与安全加固措施
 */

// 引入工具与中间件
const { securityMiddleware } = require('./middleware/security');
const { cacheMiddleware } = require('./middleware/cache');
const { performanceMiddleware, handlePerformanceMetricsApi, handleResetMetricsApi } = require('./middleware/performance');
const { ensureIndexes } = require('./utils/db');

// 处理跨域请求的中间件
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 处理OPTIONS请求（预检请求）
function handleOptions(request) {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}

// 应用中间件函数
async function applyMiddlewares(request, env, ctx, handlers) {
  let currentHandler = async () => {
    // 如果没有找到合适的处理函数，返回404
    return new Response(JSON.stringify({
      success: false,
      message: '未找到API路由'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };
  
  // 从后向前包装处理函数
  for (let i = handlers.length - 1; i >= 0; i--) {
    const nextHandler = currentHandler;
    const currentMiddleware = handlers[i];
    
    currentHandler = async () => {
      return await currentMiddleware(request, env, ctx, nextHandler);
    };
  }
  
  // 执行完整的中间件链
  return await currentHandler();
}

// 处理API请求
async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  // 性能指标API路由
  if (path === '/metrics' && request.method === 'GET') {
    return await handlePerformanceMetricsApi(request, env, ctx);
  }
  
  if (path === '/metrics/reset' && request.method === 'POST') {
    return await handleResetMetricsApi(request, env, ctx);
  }
  
  // 动态导入对应的处理模块
  let handler;
  let handlerModule = null;
  
  try {
    if (path.startsWith('/auth')) {
      handlerModule = require('./handlers/auth');
    } else if (path.startsWith('/messages')) {
      handlerModule = require('./handlers/messages');
    } else if (path.startsWith('/poll')) {
      handlerModule = require('./handlers/poll');
    } else if (path.startsWith('/users')) {
      handlerModule = require('./handlers/users');
    } else if (path.startsWith('/friends')) {
      handlerModule = require('./handlers/friends');
    } else if (path.startsWith('/groups')) {
      handlerModule = require('./handlers/groups');
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: '未找到API路由'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    handler = async () => await handlerModule.handleRequest(request, env, ctx);
    
    // 应用中间件
    const middlewares = [
      performanceMiddleware, // 性能监控中间件
      securityMiddleware,    // 安全中间件
      cacheMiddleware,       // 缓存中间件
    ];
    
    // 执行中间件链和处理函数
    return await applyMiddlewares(request, env, ctx, [...middlewares, handler]);
  } catch (err) {
    console.error(`API处理错误: ${err.message}`, err.stack);
    
    return new Response(JSON.stringify({
      success: false,
      message: '服务器内部错误',
      error: env.ENVIRONMENT === 'development' ? err.message : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// 启动时进行初始化
async function initialize(env) {
  try {
    // 创建必要的索引
    const { createDbConnection } = require('./utils/db');
    const getDb = await createDbConnection(env);
    const db = await getDb();
    await ensureIndexes(db);
    
    console.log('服务初始化完成');
  } catch (error) {
    console.error('服务初始化错误:', error);
  }
}

// Worker入口函数
export default {
  async fetch(request, env, ctx) {
    // 处理跨域预检请求
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    const url = new URL(request.url);
    
    // 处理API请求
    if (url.pathname.startsWith('/api')) {
      return handleApiRequest(request, env, ctx);
    }
    
    // 处理静态资源请求（前端）
    try {
      // 使用内置的静态资源处理
      // 注意：需在wrangler.toml中配置[site]
      return env.ASSETS.fetch(request);
    } catch (err) {
      // 如果静态资源处理失败，返回前端入口文件（用于SPA路由）
      try {
        return env.ASSETS.fetch(new Request(new URL('/', url), request));
      } catch (error) {
        return new Response('服务不可用', { status: 503 });
      }
    }
  },
  
  // 定时任务处理函数
  async scheduled(event, env, ctx) {
    console.log(`执行定时任务: ${event.cron}`);
    
    // 针对不同的cron表达式执行不同的任务
    try {
      if (event.cron === '0 */12 * * *') {
        // 每12小时执行一次的任务
        const cleanupHandler = require('./handlers/cleanup');
        const result = await cleanupHandler.cleanupExpiredMessages(env, ctx);
        console.log('消息队列清理结果:', result);
      }
    } catch (err) {
      console.error(`定时任务执行失败: ${err.message}`, err.stack);
    }
  },
  
  // 自定义初始化函数
  async startup(env) {
    await initialize(env);
  }
}; 