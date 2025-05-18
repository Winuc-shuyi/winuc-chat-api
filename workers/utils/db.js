/**
 * 数据库工具模块
 * 提供优化的数据库连接和索引管理功能
 */

const { MongoClient, ObjectId } = require('mongodb');
const { retryWithBackoff } = require('./performance');
const { validateObjectId, escapeMongoQuery } = require('./security');

// 创建一个带连接缓存和重试机制的数据库连接函数
// 这是比连接池更轻量级的方式，适合Serverless环境
async function createDbConnection(env) {
  // 保存最近的数据库连接
  let dbClient = null;
  let dbInstance = null;
  let lastUsed = 0;
  
  // 连接空闲超时时间（毫秒）
  const idleTimeout = 60000; // 1分钟
  
  // 定期检查并关闭空闲连接
  const cleanup = () => {
    if (dbClient && Date.now() - lastUsed > idleTimeout) {
      console.log('关闭空闲数据库连接');
      dbClient.close().catch(err => console.error('关闭数据库连接出错:', err));
      dbClient = null;
      dbInstance = null;
    }
  };
  
  // 设置定期清理
  setInterval(cleanup, idleTimeout);
  
  // 返回获取数据库连接的函数
  return async function getDb() {
    // 如果已经有连接，直接使用
    if (dbClient && dbInstance) {
      lastUsed = Date.now();
      return dbInstance;
    }
    
    // 创建新连接，带重试机制
    try {
      const client = await retryWithBackoff(
        async () => {
          const newClient = new MongoClient(env.MONGODB_URI);
          await newClient.connect();
          return newClient;
        },
        {
          maxRetries: 3,
          initialDelay: 200,
          maxDelay: 2000
        }
      );
      
      dbClient = client;
      dbInstance = client.db('winuc-chat');
      lastUsed = Date.now();
      
      return dbInstance;
    } catch (error) {
      console.error('数据库连接失败:', error);
      throw new Error('数据库连接失败');
    }
  };
}

// 确保创建所有必要的索引
async function ensureIndexes(db) {
  try {
    // 用户集合索引
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
      { key: { lastActive: 1 } }
    ]);
    
    // 消息集合索引
    await db.collection('messages').createIndexes([
      { key: { sender: 1 } },
      { key: { receiver: 1 } },
      { key: { createdAt: -1 } },
      { key: { sender: 1, receiver: 1, createdAt: -1 } },
      { key: { isRead: 1 } }
    ]);
    
    // 群组消息索引
    await db.collection('groupMessages').createIndexes([
      { key: { groupId: 1, createdAt: -1 } },
      { key: { sender: 1 } }
    ]);
    
    // 群组索引
    await db.collection('groups').createIndexes([
      { key: { 'members.userId': 1 } },
      { key: { createdBy: 1 } },
      { key: { name: 'text', description: 'text' } } // 文本搜索索引
    ]);
    
    // 好友关系索引
    await db.collection('friendships').createIndexes([
      { key: { user1: 1, user2: 1 }, unique: true },
      { key: { user1: 1, status: 1 } },
      { key: { user2: 1, status: 1 } }
    ]);
    
    // 消息队列索引
    await db.collection('messagequeue').createIndexes([
      { key: { userId: 1, delivered: 1, createdAt: 1 } },
      { key: { delivered: 1, createdAt: 1 } } // 用于清理过期消息
    ]);
    
    // 通知索引
    await db.collection('notifications').createIndexes([
      { key: { recipient: 1, isRead: 1, createdAt: -1 } },
      { key: { createdAt: 1 } } // 用于清理过期通知
    ]);
    
    console.log('所有索引创建成功');
    return true;
  } catch (error) {
    console.error('创建索引失败:', error);
    return false;
  }
}

// 优化的数据库查询
async function optimizedFind(collection, query, options = {}) {
  // 安全检查：验证ObjectId类型字段
  const safeQuery = { ...query };
  
  for (const [key, value] of Object.entries(safeQuery)) {
    if (key === '_id' || key.endsWith('Id')) {
      if (typeof value === 'string') {
        safeQuery[key] = validateObjectId(value);
      }
    }
  }
  
  // 防止MongoDB注入
  const escapedQuery = escapeMongoQuery(safeQuery);
  
  // 设置合理的默认值和限制
  const safeOptions = {
    ...options,
    limit: options.limit || 50,
    projection: options.projection || {}
  };
  
  // 默认排除密码字段
  if (collection === 'users' && !safeOptions.projection.password) {
    safeOptions.projection.password = 0;
  }
  
  return await collection.find(escapedQuery, safeOptions).toArray();
}

// 优化的聚合查询
async function optimizedAggregate(collection, pipeline, options = {}) {
  // 检查并安全处理管道中的查询条件
  const safePipeline = pipeline.map(stage => {
    // 如果是匹配阶段，处理其中的查询
    if (stage.$match) {
      return {
        $match: escapeMongoQuery(stage.$match)
      };
    }
    return stage;
  });
  
  // 添加默认限制，防止返回过多数据
  if (!safePipeline.some(stage => stage.$limit)) {
    safePipeline.push({ $limit: options.limit || 100 });
  }
  
  return await collection.aggregate(safePipeline, options).toArray();
}

// 事务包装器
async function withTransaction(db, operations) {
  const session = db.client.startSession();
  
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operations(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createDbConnection,
  ensureIndexes,
  optimizedFind,
  optimizedAggregate,
  withTransaction,
  ObjectId
}; 