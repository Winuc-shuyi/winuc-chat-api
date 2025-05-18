const User = require('../models/User');
const PollSession = require('../models/PollSession');
const MessageQueue = require('../models/MessageQueue');

// 用于缓存活跃用户的内存映射
const activeUsers = new Map();
// 存储用户状态变化通知的映射
const statusChangeNotifications = new Map();
// 存储轮询计时器
const pollTimers = new Map();

/**
 * 长轮询管理器
 */
const PollManager = {
  /**
   * 注册新的轮询会话
   * @param {string} userId 用户ID
   * @param {string} sessionId 会话ID
   * @param {object} clientInfo 客户端信息
   * @returns {Promise<boolean>} 是否成功
   */
  async registerSession(userId, sessionId, clientInfo = {}) {
    try {
      await PollSession.findOneAndUpdate(
        { sessionId },
        {
          user: userId,
          clientInfo,
          lastActivity: new Date(),
          active: true
        },
        { upsert: true, new: true }
      );
      
      // 更新内存中的活跃用户映射
      if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
      }
      activeUsers.get(userId).add(sessionId);
      
      // 更新用户状态为在线
      await User.findByIdAndUpdate(
        userId,
        { status: 'online', lastActive: new Date() },
        { new: true }
      );
      
      // 触发用户上线通知
      await this.notifyStatusChange(userId, 'online');
      
      return true;
    } catch (err) {
      console.error('注册轮询会话失败:', err);
      return false;
    }
  },
  
  /**
   * 注销轮询会话
   * @param {string} userId 用户ID
   * @param {string} sessionId 会话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async unregisterSession(userId, sessionId) {
    try {
      await PollSession.findOneAndUpdate(
        { sessionId },
        { active: false },
        { new: true }
      );
      
      // 从内存中移除
      if (activeUsers.has(userId)) {
        activeUsers.get(userId).delete(sessionId);
        
        // 如果该用户没有活跃会话了，设置为离线
        if (activeUsers.get(userId).size === 0) {
          activeUsers.delete(userId);
          
          // 更新用户状态为离线
          await User.findByIdAndUpdate(
            userId,
            { status: 'offline', lastActive: new Date() },
            { new: true }
          );
          
          // 触发用户下线通知
          await this.notifyStatusChange(userId, 'offline');
        }
      }
      
      // 清除轮询计时器
      if (pollTimers.has(sessionId)) {
        clearTimeout(pollTimers.get(sessionId));
        pollTimers.delete(sessionId);
      }
      
      return true;
    } catch (err) {
      console.error('注销轮询会话失败:', err);
      return false;
    }
  },
  
  /**
   * 更新会话活动时间
   * @param {string} userId 用户ID
   * @param {string} sessionId 会话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async updateSessionActivity(userId, sessionId) {
    try {
      await PollSession.updateActivity(sessionId, userId);
      
      // 更新用户最后活跃时间
      await User.findByIdAndUpdate(
        userId, 
        { lastActive: new Date() },
        { new: true }
      );
      
      return true;
    } catch (err) {
      console.error('更新会话活动时间失败:', err);
      return false;
    }
  },
  
  /**
   * 通知用户状态变化
   * @param {string} userId 用户ID
   * @param {string} status 新状态
   * @returns {Promise<void>}
   */
  async notifyStatusChange(userId, status) {
    try {
      // 获取该用户的所有好友
      const user = await User.findById(userId).select('friends');
      
      if (!user || !user.friends || user.friends.length === 0) {
        return;
      }
      
      // 为每个好友创建状态变化通知
      for (const friendId of user.friends) {
        // 将状态变化添加到通知队列
        if (!statusChangeNotifications.has(friendId.toString())) {
          statusChangeNotifications.set(friendId.toString(), []);
        }
        
        statusChangeNotifications.get(friendId.toString()).push({
          type: 'status_change',
          userId: userId,
          status: status,
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error('通知用户状态变化失败:', err);
    }
  },
  
  /**
   * 获取用户的状态变化通知
   * @param {string} userId 用户ID
   * @returns {Array} 通知列表
   */
  getStatusChangeNotifications(userId) {
    const notifications = statusChangeNotifications.get(userId) || [];
    
    // 清空该用户的通知队列
    if (statusChangeNotifications.has(userId)) {
      statusChangeNotifications.set(userId, []);
    }
    
    return notifications;
  },
  
  /**
   * 获取用户是否在线
   * @param {string} userId 用户ID
   * @returns {boolean} 是否在线
   */
  isUserOnline(userId) {
    return activeUsers.has(userId) && activeUsers.get(userId).size > 0;
  },
  
  /**
   * 设置轮询超时定时器
   * @param {string} sessionId 会话ID
   * @param {Function} callback 回调函数
   * @param {number} timeout 超时时间(ms)
   * @returns {void}
   */
  setPollTimeout(sessionId, callback, timeout) {
    // 清除之前的计时器（如果有）
    if (pollTimers.has(sessionId)) {
      clearTimeout(pollTimers.get(sessionId));
    }
    
    // 设置新的计时器
    const timer = setTimeout(() => {
      callback();
      pollTimers.delete(sessionId);
    }, timeout);
    
    pollTimers.set(sessionId, timer);
  },
  
  /**
   * 清理过期会话
   * @returns {Promise<number>} 清理的会话数量
   */
  async cleanupExpiredSessions() {
    try {
      return await PollSession.cleanupExpiredSessions();
    } catch (err) {
      console.error('清理过期会话失败:', err);
      return 0;
    }
  },
  
  /**
   * 用户主动设置状态
   * @param {string} userId 用户ID
   * @param {string} status 新状态
   * @returns {Promise<boolean>} 是否成功
   */
  async setUserStatus(userId, status) {
    try {
      const validStatuses = ['online', 'offline', 'away', 'busy'];
      if (!validStatuses.includes(status)) {
        return false;
      }
      
      await User.findByIdAndUpdate(
        userId,
        { status, lastActive: new Date() },
        { new: true }
      );
      
      // 发送状态变化通知
      await this.notifyStatusChange(userId, status);
      
      return true;
    } catch (err) {
      console.error('设置用户状态失败:', err);
      return false;
    }
  }
};

module.exports = PollManager; 