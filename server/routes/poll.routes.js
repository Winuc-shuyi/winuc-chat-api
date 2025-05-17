const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const MessageQueue = require('../models/MessageQueue');
const PollSession = require('../models/PollSession');
const User = require('../models/User');
const PollManager = require('../utils/PollManager');
const { protect } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Polling
 *   description: 长轮询API，用于实时消息接收
 */

/**
 * @swagger
 * /api/poll/register:
 *   post:
 *     summary: 注册长轮询会话
 *     tags: [Polling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 会话注册成功
 *       401:
 *         description: 未授权
 */
router.post('/register', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sessionId = uuidv4(); // 生成唯一会话ID
    
    // 客户端信息
    const clientInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };
    
    // 注册会话
    await PollManager.registerSession(userId, sessionId, clientInfo);
    
    res.status(200).json({
      success: true,
      message: '长轮询会话注册成功',
      data: {
        sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时过期
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/poll/unregister:
 *   post:
 *     summary: 注销长轮询会话
 *     tags: [Polling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 会话注销成功
 *       401:
 *         description: 未授权
 */
router.post('/unregister', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空'
      });
    }
    
    // 注销会话
    await PollManager.unregisterSession(userId, sessionId);
    
    res.status(200).json({
      success: true,
      message: '长轮询会话注销成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/poll/messages:
 *   get:
 *     summary: 长轮询获取新消息
 *     tags: [Polling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         required: true
 *         description: 客户端会话ID
 *       - in: query
 *         name: timeout
 *         schema:
 *           type: integer
 *           default: 30000
 *         description: 长轮询超时时间（毫秒）
 *     responses:
 *       200:
 *         description: 获取新消息成功
 *       204:
 *         description: 没有新消息
 *       401:
 *         description: 未授权
 */
router.get('/messages', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sessionId = req.query.sessionId;
    const timeout = parseInt(req.query.timeout) || 30000; // 默认30秒超时
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空'
      });
    }
    
    // 更新会话活动时间
    await PollManager.updateSessionActivity(userId, sessionId);
    
    // 立即检查是否有新消息
    const pendingMessagesResult = await MessageQueue.getPendingMessages(userId);
    const pendingMessages = pendingMessagesResult.messages || [];
    const systemMessages = pendingMessagesResult.systemMessages || [];
    
    // 检查是否有状态变化通知
    const statusNotifications = PollManager.getStatusChangeNotifications(userId);
    
    // 如果有新消息、系统消息或状态变化通知，立即返回
    if (pendingMessages.length > 0 || systemMessages.length > 0 || statusNotifications.length > 0) {
      return res.status(200).json({
        success: true,
        timestamp: Date.now(),
        data: {
          messages: pendingMessages,
          systemMessages: systemMessages,
          notifications: statusNotifications
        }
      });
    }
    
    // 保存请求对象的引用
    let isResponseSent = false;
    
    // 设置超时处理
    PollManager.setPollTimeout(sessionId, () => {
      if (!isResponseSent) {
        isResponseSent = true;
        return res.status(204).send();
      }
    }, timeout);
    
    // 启动轮询检查
    const pollInterval = setInterval(async () => {
      if (isResponseSent) {
        clearInterval(pollInterval);
        return;
      }
      
      try {
        // 再次检查新消息
        const messagesResult = await MessageQueue.getPendingMessages(userId);
        const messages = messagesResult.messages || [];
        const systemMsgs = messagesResult.systemMessages || [];
        
        // 获取状态变化通知
        const notifications = PollManager.getStatusChangeNotifications(userId);
        
        if (messages.length > 0 || systemMsgs.length > 0 || notifications.length > 0) {
          clearInterval(pollInterval);
          isResponseSent = true;
          
          return res.status(200).json({
            success: true,
            timestamp: Date.now(),
            data: {
              messages: messages,
              systemMessages: systemMsgs,
              notifications: notifications
            }
          });
        }
      } catch (checkErr) {
        clearInterval(pollInterval);
        if (!isResponseSent) {
          isResponseSent = true;
          next(checkErr);
        }
      }
    }, 1000); // 每秒检查一次
    
    // 在连接关闭时清理资源
    req.on('close', () => {
      clearInterval(pollInterval);
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/poll/status:
 *   post:
 *     summary: 更新用户在线状态
 *     tags: [Polling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - sessionId
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, offline, away, busy]
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 状态更新成功
 *       400:
 *         description: 无效的状态
 *       401:
 *         description: 未授权
 */
router.post('/status', protect, async (req, res, next) => {
  try {
    const { status, sessionId } = req.body;
    const userId = req.user._id;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空'
      });
    }
    
    // 验证状态值
    const validStatuses = ['online', 'offline', 'away', 'busy'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
    }
    
    // 更新会话活动时间
    await PollManager.updateSessionActivity(userId, sessionId);
    
    // 设置用户状态
    await PollManager.setUserStatus(userId, status);
    
    res.status(200).json({
      success: true,
      message: '状态更新成功',
      data: {
        status
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/poll/ping:
 *   get:
 *     summary: 检查连接状态并保持心跳
 *     tags: [Polling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         required: true
 *         description: 客户端会话ID
 *     responses:
 *       200:
 *         description: 服务器正常
 *       401:
 *         description: 未授权
 */
router.get('/ping', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const sessionId = req.query.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '会话ID不能为空'
      });
    }
    
    // 更新会话活动时间
    await PollManager.updateSessionActivity(userId, sessionId);
    
    res.status(200).json({
      success: true,
      message: 'pong',
      timestamp: Date.now(),
      data: {
        onlineFriends: await getOnlineFriendsCount(userId)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/poll/online-friends:
 *   get:
 *     summary: 获取在线好友列表
 *     tags: [Polling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取在线好友成功
 *       401:
 *         description: 未授权
 */
router.get('/online-friends', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // 获取用户的好友列表
    const user = await User.findById(userId).select('friends');
    
    if (!user || !user.friends || user.friends.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: {
          friends: []
        }
      });
    }
    
    // 查询在线好友
    const onlineFriends = await User.find({
      _id: { $in: user.friends },
      status: { $in: ['online', 'away', 'busy'] },
      lastActive: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // 5分钟内活跃
    }).select('_id username avatar status lastActive');
    
    res.status(200).json({
      success: true,
      count: onlineFriends.length,
      data: {
        friends: onlineFriends
      }
    });
  } catch (err) {
    next(err);
  }
});

// 获取用户在线好友数量
async function getOnlineFriendsCount(userId) {
  try {
    const user = await User.findById(userId).select('friends');
    
    if (!user || !user.friends || user.friends.length === 0) {
      return 0;
    }
    
    const count = await User.countDocuments({
      _id: { $in: user.friends },
      status: { $in: ['online', 'away', 'busy'] },
      lastActive: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
    });
    
    return count;
  } catch (err) {
    console.error('获取在线好友数量失败:', err);
    return 0;
  }
}

module.exports = router; 