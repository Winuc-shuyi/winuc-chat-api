/**
 * 性能优化工具模块
 * 提供性能监控和优化功能
 */

// 简单的API性能监控
function createPerformanceMonitor(env) {
  const metrics = new Map();
  
  return {
    // 开始监控某个接口的性能
    startTimer: (route) => {
      return {
        route,
        startTime: Date.now()
      };
    },
    
    // 结束某个接口的性能监控并记录
    endTimer: (timer) => {
      const { route, startTime } = timer;
      const duration = Date.now() - startTime;
      
      if (!metrics.has(route)) {
        metrics.set(route, {
          count: 0,
          totalDuration: 0,
          min: Infinity,
          max: 0,
          recent: []
        });
      }
      
      const metric = metrics.get(route);
      metric.count++;
      metric.totalDuration += duration;
      metric.min = Math.min(metric.min, duration);
      metric.max = Math.max(metric.max, duration);
      
      // 保留最近10次请求的响应时间
      metric.recent.push(duration);
      if (metric.recent.length > 10) {
        metric.recent.shift();
      }
      
      // 每100次请求记录一次日志
      if (metric.count % 100 === 0) {
        const avg = metric.totalDuration / metric.count;
        console.log(`性能指标 [${route}] - 平均: ${avg.toFixed(2)}ms, 最小: ${metric.min}ms, 最大: ${metric.max}ms, 总请求: ${metric.count}`);
      }
      
      return duration;
    },
    
    // 获取所有性能指标
    getMetrics: () => {
      const result = {};
      
      for (const [route, data] of metrics.entries()) {
        result[route] = {
          count: data.count,
          avgDuration: data.totalDuration / data.count,
          minDuration: data.min,
          maxDuration: data.max,
          recentAvg: data.recent.reduce((sum, val) => sum + val, 0) / data.recent.length
        };
      }
      
      return result;
    },
    
    // 重置性能指标
    resetMetrics: () => {
      metrics.clear();
    }
  };
}

// 批量处理优化
async function batchProcess(items, processFn, batchSize = 20) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
  }
  
  return results;
}

// 带有指数退避的重试函数
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 3000,
    factor = 2,
    retryCondition = (err) => true
  } = options;
  
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      retries++;
      console.log(`操作失败，第 ${retries} 次重试，延迟 ${delay}ms`);
      
      // 等待延迟时间
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 指数增加延迟时间，但不超过最大延迟
      delay = Math.min(delay * factor, maxDelay);
    }
  }
}

// 简单的查询优化器
function optimizeQuery(query = {}, options = {}) {
  const optimized = { ...query };
  
  // 限制分页大小，防止过大的查询
  if (options.maxLimit && optimized.limit) {
    optimized.limit = Math.min(optimized.limit, options.maxLimit);
  }
  
  // 确保有合理的默认限制
  if (!optimized.limit && options.defaultLimit) {
    optimized.limit = options.defaultLimit;
  }
  
  // 对于大的skip值使用查询ID的方式优化
  if (optimized.skip && optimized.skip > (options.skipThreshold || 1000)) {
    console.log('Skip值过大，建议使用基于ID的分页方式代替Skip方式');
  }
  
  // 确保查询使用索引
  if (options.ensureIndex && options.ensureIndex.length > 0) {
    let hasIndexField = false;
    
    for (const field of options.ensureIndex) {
      if (optimized[field] !== undefined) {
        hasIndexField = true;
        break;
      }
    }
    
    if (!hasIndexField) {
      console.warn('查询可能未使用索引，考虑添加以下字段之一:', options.ensureIndex);
    }
  }
  
  return optimized;
}

// 数据库连接池
function createConnectionPool(env, options = {}) {
  const {
    maxConnections = 10,
    idleTimeoutMs = 30000
  } = options;
  
  const pool = {
    connections: [],
    inUse: new Set(),
    connectionCount: 0,
    
    // 获取连接
    async getConnection() {
      // 查找空闲连接
      for (const conn of this.connections) {
        if (!this.inUse.has(conn.id)) {
          this.inUse.add(conn.id);
          conn.lastUsed = Date.now();
          return conn.client;
        }
      }
      
      // 如果没有空闲连接且未达到最大连接数，创建新连接
      if (this.connectionCount < maxConnections) {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(env.MONGODB_URI);
        
        try {
          await client.connect();
          const id = ++this.connectionCount;
          const conn = { id, client, lastUsed: Date.now() };
          
          this.connections.push(conn);
          this.inUse.add(id);
          
          return client;
        } catch (error) {
          console.error('创建数据库连接失败:', error);
          throw error;
        }
      }
      
      // 达到最大连接数，等待空闲连接
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('获取数据库连接超时'));
        }, 5000);
        
        const checkInterval = setInterval(() => {
          for (const conn of this.connections) {
            if (!this.inUse.has(conn.id)) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              
              this.inUse.add(conn.id);
              conn.lastUsed = Date.now();
              resolve(conn.client);
              return;
            }
          }
        }, 100);
      });
    },
    
    // 释放连接
    releaseConnection(client) {
      for (const conn of this.connections) {
        if (conn.client === client) {
          this.inUse.delete(conn.id);
          conn.lastUsed = Date.now();
          return;
        }
      }
    },
    
    // 清理空闲连接
    cleanIdleConnections() {
      const now = Date.now();
      
      this.connections = this.connections.filter(conn => {
        // 如果连接在使用中或未超时，保留
        if (this.inUse.has(conn.id) || now - conn.lastUsed < idleTimeoutMs) {
          return true;
        }
        
        // 关闭空闲连接
        try {
          conn.client.close();
          this.connectionCount--;
        } catch (error) {
          console.error('关闭空闲连接失败:', error);
        }
        
        return false;
      });
    },
    
    // 启动定期清理
    startCleaner() {
      setInterval(() => this.cleanIdleConnections(), idleTimeoutMs);
    }
  };
  
  // 自动启动清理器
  pool.startCleaner();
  
  return pool;
}

module.exports = {
  createPerformanceMonitor,
  batchProcess,
  retryWithBackoff,
  optimizeQuery,
  createConnectionPool
}; 