const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const MessageQueue = require('../models/MessageQueue');
const { Notification } = require('../models/Notification');
const { protect } = require('../middlewares/auth');
const mongoose = require('mongoose');

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: 消息管理API
 */

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: 发送私聊消息
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, file, emoji]
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: 消息发送成功
 *       400:
 *         description: 请求错误
 *       401:
 *         description: 未授权
 */
router.post('/send', protect, async (req, res, next) => {
  try {
    const { receiverId, content, type, metadata } = req.body;
    const senderId = req.user._id;
    
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: '接收者ID不能为空'
      });
    }
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }
    
    // 检查接收者是否存在
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: '接收者不存在'
      });
    }
    
    // 创建消息
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      content,
      type: type || 'text',
      metadata: metadata || {}
    });
    
    await message.save();
    
    // 将消息添加到接收者的消息队列
    await global.MessageQueue.addMessageToQueue(receiverId, message._id);
    
    // 创建消息通知
    await Notification.createMessageNotification(
      receiverId,
      senderId,
      message._id,
      content.length > 30 ? `${content.substring(0, 30)}...` : content
    );
    
    // 获取当前用户信息
    const sender = await User.findById(senderId).select('username avatar status');
    
    // 构建响应消息，包含发送者信息
    const messageResponse = {
      ...message.toObject(),
      sender: {
        _id: sender._id,
        username: sender.username,
        avatar: sender.avatar,
        status: sender.status
      }
    };
    
    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: {
        message: messageResponse
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/group/send:
 *   post:
 *     summary: 发送群组消息
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - content
 *             properties:
 *               groupId:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, file, emoji]
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: 消息发送成功
 *       400:
 *         description: 请求错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 群组不存在
 */
router.post('/group/send', protect, async (req, res, next) => {
  try {
    const { groupId, content, type, metadata } = req.body;
    const senderId = req.user._id;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: '群组ID不能为空'
      });
    }
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }
    
    // 检查群组是否存在
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查发送者是否是群组成员
    if (!group.isMember(senderId)) {
      return res.status(403).json({
        success: false,
        message: '您不是该群组成员，无法发送消息'
      });
    }
    
    // 创建消息
    const message = new Message({
      sender: senderId,
      group: groupId,
      content,
      type: type || 'text',
      metadata: metadata || {}
    });
    
    await message.save();
    
    // 将消息添加到所有群组成员的消息队列（除了发送者）
    for (const member of group.members) {
      if (member.user.toString() !== senderId.toString()) {
        await global.MessageQueue.addMessageToQueue(member.user, message._id);
        
        // 为每个群组成员创建消息通知
        await Notification.createMessageNotification(
          member.user,
          senderId,
          message._id,
          `[群组: ${group.name}] ${content.length > 20 ? content.substring(0, 20) + '...' : content}`
        );
      }
    }
    
    // 获取当前用户信息
    const sender = await User.findById(senderId).select('username avatar status');
    
    // 构建响应消息，包含发送者信息
    const messageResponse = {
      ...message.toObject(),
      sender: {
        _id: sender._id,
        username: sender.username,
        avatar: sender.avatar,
        status: sender.status
      }
    };
    
    res.status(201).json({
      success: true,
      message: '群组消息发送成功',
      data: {
        message: messageResponse
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/history/{userId}:
 *   get:
 *     summary: 获取与指定用户的消息历史
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: 获取消息历史成功
 *       401:
 *         description: 未授权
 */
router.get('/history/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }
    
    // 获取双向消息历史（当前用户发送和接收的消息）
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
      .sort({ createdAt: -1 }) // 最新消息在前
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar _id status')  // 确保包含_id字段
      .populate('receiver', 'username avatar _id status');
    
    // 更新接收到的消息状态为已读
    await Message.updateMany(
      { sender: userId, receiver: currentUserId, isRead: false },
      { isRead: true }
    );
    
    // 确保每条消息的发送者信息完整
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      
      // 如果发送者信息不完整，添加必要字段
      if (messageObj.sender && !messageObj.sender._id) {
        messageObj.sender._id = message.sender;
      }
      
      return messageObj;
    });
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: {
        messages: processedMessages.reverse() // 返回时按时间正序排列
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/history/{userId}/time-range:
 *   get:
 *     summary: 根据时间范围获取与指定用户的消息历史
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 获取消息历史成功
 *       401:
 *         description: 未授权
 */
router.get('/history/:userId/time-range', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '必须提供开始和结束时间'
      });
    }
    
    // 验证日期格式
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: '无效的日期格式'
      });
    }
    
    // 获取指定时间范围内的双向消息历史
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ],
      createdAt: {
        $gte: startDateTime,
        $lte: endDateTime
      }
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar');
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: {
        messages
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/history/{userId}/before/{messageId}:
 *   get:
 *     summary: 获取指定消息之前的历史消息（用于分页加载）
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 获取历史消息成功
 *       401:
 *         description: 未授权
 */
router.get('/history/:userId/before/:messageId', protect, async (req, res, next) => {
  try {
    const { userId, messageId } = req.params;
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }
    
    // 获取参考消息的创建时间
    const referenceMessage = await Message.findById(messageId);
    if (!referenceMessage) {
      return res.status(404).json({
        success: false,
        message: '参考消息不存在'
      });
    }
    
    // 获取更早的消息
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ],
      createdAt: { $lt: referenceMessage.createdAt }
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username avatar _id status')
      .populate('receiver', 'username avatar _id status');
    
    // 确保每条消息的发送者信息完整
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      
      // 如果发送者信息不完整，添加必要字段
      if (messageObj.sender && !messageObj.sender._id) {
        messageObj.sender._id = message.sender;
      }
      
      return messageObj;
    });
    
    res.status(200).json({
      success: true,
      count: processedMessages.length,
      data: {
        messages: processedMessages.reverse()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/group/history/{groupId}:
 *   get:
 *     summary: 获取群组的消息历史
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: 获取群组消息历史成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权访问群组消息
 *       404:
 *         description: 群组不存在
 */
router.get('/group/history/:groupId', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的群组ID'
      });
    }
    
    // 检查群组是否存在
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查当前用户是否是群组成员
    if (!group.isMember(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: '您不是该群组成员，无法查看消息历史'
      });
    }
    
    // 获取群组消息历史
    const messages = await Message.find({ group: groupId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar _id status')  // 确保包含_id字段
      .select('-receiver');
    
    // 确保每条消息的发送者信息完整
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      
      // 如果发送者信息不完整，添加必要字段
      if (messageObj.sender && !messageObj.sender._id) {
        messageObj.sender._id = message.sender;
      }
      
      return messageObj;
    });
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: {
        messages: processedMessages.reverse()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/group/history/{groupId}/time-range:
 *   get:
 *     summary: 根据时间范围获取群组的消息历史
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 获取群组消息历史成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权访问群组消息
 *       404:
 *         description: 群组不存在
 */
router.get('/group/history/:groupId/time-range', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的群组ID'
      });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '必须提供开始和结束时间'
      });
    }
    
    // 验证日期格式
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: '无效的日期格式'
      });
    }
    
    // 检查群组是否存在
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查用户是否是群组成员
    if (!group.isMember(userId)) {
      return res.status(403).json({
        success: false,
        message: '您不是该群组成员，无法查看消息历史'
      });
    }
    
    // 获取指定时间范围内的群组消息
    const messages = await Message.find({
      group: groupId,
      createdAt: {
        $gte: startDateTime,
        $lte: endDateTime
      }
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate('sender', 'username avatar');
    
    res.status(200).json({
      success: true,
      count: messages.length,
      data: {
        messages
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/group/history/{groupId}/before/{messageId}:
 *   get:
 *     summary: 获取指定群组消息之前的历史消息（用于分页加载）
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 获取群组历史消息成功
 *       401:
 *         description: 未授权
 */
router.get('/group/history/:groupId/before/:messageId', protect, async (req, res, next) => {
  try {
    const { groupId, messageId } = req.params;
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }
    
    // 检查群组是否存在
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查当前用户是否是群组成员
    if (!group.isMember(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: '您不是该群组成员，无法查看消息历史'
      });
    }
    
    // 获取参考消息的创建时间
    const referenceMessage = await Message.findById(messageId);
    if (!referenceMessage) {
      return res.status(404).json({
        success: false,
        message: '参考消息不存在'
      });
    }
    
    // 获取更早的消息
    const messages = await Message.find({
      group: groupId,
      createdAt: { $lt: referenceMessage.createdAt }
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username avatar _id status')
      .select('-receiver');
    
    // 确保每条消息的发送者信息完整
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      
      // 如果发送者信息不完整，添加必要字段
      if (messageObj.sender && !messageObj.sender._id) {
        messageObj.sender._id = message.sender;
      }
      
      return messageObj;
    });
    
    res.status(200).json({
      success: true,
      count: processedMessages.length,
      data: {
        messages: processedMessages.reverse()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/recent:
 *   get:
 *     summary: 获取最近聊天列表
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取最近聊天列表成功
 *       401:
 *         description: 未授权
 */
router.get('/recent', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // 获取用户参与的所有私聊最后一条消息
    const privateChats = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: mongoose.Types.ObjectId(userId) },
            { receiver: mongoose.Types.ObjectId(userId) }
          ],
          group: { $exists: false }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', mongoose.Types.ObjectId(userId)] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);
    
    // 获取用户参与的所有群聊最后一条消息
    const groupChats = await Message.aggregate([
      {
        $match: {
          group: { $exists: true, $ne: null }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$group',
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);
    
    // 填充用户和群组信息
    const populatedPrivateChats = await User.populate(privateChats, {
      path: '_id',
      select: 'username email avatar status lastActive'
    });
    
    // 填充发送者信息
    await User.populate(populatedPrivateChats, {
      path: 'lastMessage.sender',
      select: 'username avatar'
    });
    
    await User.populate(populatedPrivateChats, {
      path: 'lastMessage.receiver',
      select: 'username avatar'
    });
    
    // 填充群组信息
    const populatedGroupChats = await Group.populate(groupChats, {
      path: '_id',
      select: 'name description avatar memberCount'
    });
    
    // 仅保留用户所在的群组
    const userGroups = await Group.find({
      'members.user': userId
    }).select('_id');
    
    const userGroupIds = userGroups.map(g => g._id.toString());
    
    const filteredGroupChats = populatedGroupChats.filter(
      chat => userGroupIds.includes(chat._id._id.toString())
    );
    
    // 填充群组消息发送者信息
    await User.populate(filteredGroupChats, {
      path: 'lastMessage.sender',
      select: 'username avatar'
    });
    
    // 格式化结果
    const formattedPrivateChats = populatedPrivateChats.map(chat => ({
      id: chat._id._id,
      type: 'private',
      user: {
        id: chat._id._id,
        username: chat._id.username,
        avatar: chat._id.avatar,
        status: chat._id.status,
        lastActive: chat._id.lastActive
      },
      lastMessage: {
        id: chat.lastMessage._id,
        content: chat.lastMessage.content,
        sender: {
          id: chat.lastMessage.sender._id,
          username: chat.lastMessage.sender.username,
          avatar: chat.lastMessage.sender.avatar
        },
        createdAt: chat.lastMessage.createdAt,
        type: chat.lastMessage.type
      },
      unreadCount: chat.unreadCount
    }));
    
    const formattedGroupChats = filteredGroupChats.map(chat => ({
      id: chat._id._id,
      type: 'group',
      group: {
        id: chat._id._id,
        name: chat._id.name,
        avatar: chat._id.avatar,
        memberCount: chat._id.memberCount || 0
      },
      lastMessage: {
        id: chat.lastMessage._id,
        content: chat.lastMessage.content,
        sender: {
          id: chat.lastMessage.sender._id,
          username: chat.lastMessage.sender.username,
          avatar: chat.lastMessage.sender.avatar
        },
        createdAt: chat.lastMessage.createdAt,
        type: chat.lastMessage.type
      },
      unreadCount: 0 // 暂不支持群组消息已读状态
    }));
    
    // 合并并按最后消息时间排序
    const recentChats = [...formattedPrivateChats, ...formattedGroupChats].sort(
      (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );
    
    res.status(200).json({
      success: true,
      count: recentChats.length,
      data: {
        chats: recentChats
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/unread:
 *   get:
 *     summary: 获取未读消息数量
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取未读消息数量成功
 *       401:
 *         description: 未授权
 */
router.get('/unread', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // 获取私聊未读消息数量
    const unreadCount = await Message.countDocuments({
      receiver: userId,
      isRead: false
    });
    
    res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/messages/{messageId}/read:
 *   put:
 *     summary: 标记消息为已读
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 标记消息为已读成功
 *       401:
 *         description: 未授权
 *       404:
 *         description: 消息不存在
 */
router.put('/:messageId/read', protect, async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        success: false,
        message: '无效的消息ID'
      });
    }
    
    // 查找消息
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: '消息不存在'
      });
    }
    
    // 检查用户是否是消息接收者
    if (message.receiver && message.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '您不是该消息的接收者'
      });
    }
    
    // 标记为已读
    message.isRead = true;
    await message.save();
    
    res.status(200).json({
      success: true,
      message: '消息已标记为已读'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 