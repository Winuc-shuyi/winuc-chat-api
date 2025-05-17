/**
 * WinUC Chat API - CloudFlare Workers入口文件
 * 
 * 本文件用于在CloudFlare Workers上部署API服务
 */

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

// 处理API请求
async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  // 动态导入对应的处理模块
  let handler;
  try {
    if (path.startsWith('/auth')) {
      handler = require('./handlers/auth');
    } else if (path.startsWith('/messages')) {
      handler = require('./handlers/messages');
    } else if (path.startsWith('/poll')) {
      handler = require('./handlers/poll');
    } else if (path.startsWith('/users')) {
      handler = require('./handlers/users');
    } else if (path.startsWith('/friends')) {
      handler = require('./handlers/friends');
    } else if (path.startsWith('/groups')) {
      handler = require('./handlers/groups');
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
    
    // 调用处理函数
    return await handler.handleRequest(request, env, ctx);
  } catch (err) {
    console.error(`API处理错误: ${err.message}`);
    
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
      return env.ASSETS.fetch(new Request(new URL('/', url), request));
    }
  },
  
  // 定时任务处理函数
  async scheduled(event, env, ctx) {
    // 例如：定期清理过期消息队列
    try {
      const cleanupHandler = require('./handlers/cleanup');
      await cleanupHandler.cleanupExpiredMessages(env, ctx);
      console.log('成功执行消息队列清理');
    } catch (err) {
      console.error(`定时任务执行失败: ${err.message}`);
    }
  }
}; 