/**
 * 性能监控中间件
 * 用于监控API性能并记录指标
 */

const { createPerformanceMonitor } = require('../utils/performance');

// 创建性能监控器实例
let performanceMonitor = null;

// 获取或创建性能监控器
function getPerformanceMonitor(env) {
  if (!performanceMonitor) {
    performanceMonitor = createPerformanceMonitor(env);
  }
  return performanceMonitor;
}

// 提取请求的路由标识
function getRouteIdentifier(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 对于路径中包含ID的情况，将ID部分替换为占位符
  // 例如 /api/users/123 -> /api/users/:id
  const normalizedPath = path.replace(/\/[a-f0-9]{24}(\/|$)/g, '/:id$1');
  
  return `${request.method} ${normalizedPath}`;
}

// 记录路径访问统计的简单实现
function recordPathStats(request) {
  // 在实际环境中，这里可以实现更复杂的路径统计逻辑
  // 例如记录每个API的访问次数、平均响应时间等
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 这里只是简单地输出日志，实际应用中可以存储到KV或其他存储中
  if (Math.random() < 0.01) { // 1%概率记录，降低日志频率
    console.log(`路径访问: ${path}`);
  }
}

// 计算响应大小的函数
async function getResponseSize(response) {
  // 克隆响应以免影响原始响应
  const clone = response.clone();
  
  try {
    const text = await clone.text();
    return text.length;
  } catch (error) {
    console.error('计算响应大小出错:', error);
    return 0;
  }
}

// 性能监控中间件主函数
async function performanceMiddleware(request, env, ctx, next) {
  // 获取性能监控器
  const monitor = getPerformanceMonitor(env);
  
  // 记录路径访问
  recordPathStats(request);
  
  // 获取路由标识
  const route = getRouteIdentifier(request);
  
  // 开始计时
  const timer = monitor.startTimer(route);
  
  try {
    // 处理请求
    const response = await next();
    
    // 记录响应时间
    const duration = monitor.endTimer(timer);
    
    // 记录响应大小
    if (Math.random() < 0.1) { // 10%概率记录，降低性能影响
      getResponseSize(response.clone()).then(size => {
        if (size > 100 * 1024) { // 响应大于100KB
          console.log(`大响应警告: ${route} - ${size} 字节`);
        }
      }).catch(err => {
        console.error('响应大小计算错误:', err);
      });
    }
    
    // 如果响应时间过长，记录慢请求日志
    if (duration > 1000) { // 超过1秒的请求
      console.warn(`慢请求警告: ${route} - ${duration}ms`);
    }
    
    // 添加服务器时间响应头
    const responseWithTiming = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Server-Timing': `total;dur=${duration}`
      }
    });
    
    return responseWithTiming;
  } catch (error) {
    // 错误情况下也记录响应时间
    const duration = monitor.endTimer(timer);
    console.error(`请求错误: ${route} - ${duration}ms - ${error.message}`);
    throw error;
  }
}

// 获取性能指标的API处理函数
async function handlePerformanceMetricsApi(request, env, ctx) {
  // 检查认证（在实际应用中应该使用更安全的认证方式）
  // 这里简单地使用API密钥验证
  const url = new URL(request.url);
  const apiKey = url.searchParams.get('apiKey');
  
  if (!apiKey || apiKey !== env.METRICS_API_KEY) {
    return new Response(JSON.stringify({
      success: false,
      message: '未授权访问'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 获取性能指标
  const monitor = getPerformanceMonitor(env);
  const metrics = monitor.getMetrics();
  
  // 返回指标数据
  return new Response(JSON.stringify({
    success: true,
    data: {
      metrics,
      timestamp: new Date().toISOString()
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// 重置性能指标的API处理函数
async function handleResetMetricsApi(request, env, ctx) {
  // 检查认证（与上面类似）
  const url = new URL(request.url);
  const apiKey = url.searchParams.get('apiKey');
  
  if (!apiKey || apiKey !== env.METRICS_API_KEY) {
    return new Response(JSON.stringify({
      success: false,
      message: '未授权访问'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // 重置性能指标
  const monitor = getPerformanceMonitor(env);
  monitor.resetMetrics();
  
  // 返回结果
  return new Response(JSON.stringify({
    success: true,
    message: '性能指标已重置',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

module.exports = {
  performanceMiddleware,
  handlePerformanceMetricsApi,
  handleResetMetricsApi,
  getRouteIdentifier
}; 