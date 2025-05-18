/**
 * 定时任务处理函数 - 清理过期消息队列
 */

const { ObjectId } = require('mongodb');

// 连接MongoDB
async function connectToDatabase(env) {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(env.MONGODB_URI);
  
  try {
    await client.connect();
    return client.db('winuc-chat');
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    throw new Error('数据库连接失败');
  }
}

// 清理过期消息队列
async function cleanupExpiredMessages(env, ctx) {
  try {
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 设置过期时间（7天前）
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() - 7);
    
    // 查找并删除已送达的过期消息队列
    const result = await db.collection('messagequeue').deleteMany({
      delivered: true,
      createdAt: { $lt: expirationTime }
    });
    
    console.log(`已清理 ${result.deletedCount} 条过期消息队列记录`);
    
    // 清理超过30天的未读通知
    const notificationExpirationTime = new Date();
    notificationExpirationTime.setDate(notificationExpirationTime.getDate() - 30);
    
    const notificationResult = await db.collection('notifications').deleteMany({
      createdAt: { $lt: notificationExpirationTime }
    });
    
    console.log(`已清理 ${notificationResult.deletedCount} 条过期通知`);
    
    return {
      success: true,
      deletedMessages: result.deletedCount,
      deletedNotifications: notificationResult.deletedCount
    };
  } catch (error) {
    console.error('清理过期消息队列错误:', error);
    throw error;
  }
}

module.exports = { cleanupExpiredMessages }; 