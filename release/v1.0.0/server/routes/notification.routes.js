const express = require('express');
const router = express.Router();
const { Notification } = require('../models/Notification');
const { protect } = require('../middlewares/auth');
const mongoose = require('mongoose');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: 通知管理API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: 通知ID
 *         recipient:
 *           type: string
 *           description: 接收者ID
 *         sender:
 *           type: object
 *           description: 发送者信息
 *           properties:
 *             _id:
 *               type: string
 *             username:
 *               type: string
 *             avatar:
 *               type: string
 *         type:
 *           type: string
 *           enum: [message, friend_request, friend_accepted, group_invite, group_join, system]
 *           description: 通知类型
 *         content:
 *           type: string
 *           description: 通知内容
 *         relatedId:
 *           type: string
 *           description: 相关联的ID（消息ID、好友请求ID等）
 *         isRead:
 *           type: boolean
 *           description: 是否已读
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *       example:
 *         _id: "60d21b4667d0d8992e610c85"
 *         recipient: "60d21b4667d0d8992e610c83"
 *         sender:
 *           _id: "60d21b4667d0d8992e610c84"
 *           username: "test_user"
 *           avatar: "https://example.com/avatar.png"
 *         type: "message"
 *         content: "您收到一条新消息"
 *         relatedId: "60d21b4667d0d8992e610c86"
 *         isRead: false
 *         createdAt: "2023-06-22T09:30:26.123Z"
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: 获取用户的通知列表
 *     description: 获取当前登录用户的通知列表，支持分页和已读/未读筛选
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页显示数量
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: 筛选已读/未读通知
 *     responses:
 *       200:
 *         description: 获取通知列表成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         pages:
 *                           type: integer
 *                           example: 3
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                     unreadCount:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: 服务器错误
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = { recipient: req.user._id };
    
    // 添加可选的读取状态过滤
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }
    
    // 获取通知总数（用于分页）
    const total = await Notification.countDocuments(filter);
    
    // 获取通知列表
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar')
      .exec();
    
    // 计算未读通知数量
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });
    
    return res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('获取通知列表失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取通知列表失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: 获取未读通知数量
 *     description: 获取当前登录用户的未读通知数量
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取未读通知数量成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: 服务器错误
 */
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });
    
    return res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('获取未读通知数量失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取未读通知数量失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/mark-read:
 *   patch:
 *     summary: 将单个通知标记为已读
 *     description: 将指定ID的通知标记为已读状态
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 通知ID
 *     responses:
 *       200:
 *         description: 标记成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     notification:
 *                       $ref: '#/components/schemas/Notification'
 *       400:
 *         description: 无效的通知ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: 通知不存在或无权限
 *       500:
 *         description: 服务器错误
 */
router.patch('/:id/mark-read', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: '无效的通知ID'
      });
    }
    
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在或无权限'
      });
    }
    
    return res.json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    console.error('标记通知已读失败:', error);
    return res.status(500).json({
      success: false,
      message: '标记通知已读失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: 将所有通知标记为已读
 *     description: 将当前用户的所有未读通知标记为已读状态
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 标记成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     modifiedCount:
 *                       type: integer
 *                       example: 10
 *                 message:
 *                   type: string
 *                   example: "已将10条通知标记为已读"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: 服务器错误
 */
router.patch('/mark-all-read', protect, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    
    return res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: `已将${result.modifiedCount}条通知标记为已读`
    });
  } catch (error) {
    console.error('标记所有通知已读失败:', error);
    return res.status(500).json({
      success: false,
      message: '标记所有通知已读失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: 删除单个通知
 *     description: 删除指定ID的通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 通知ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "通知已删除"
 *       400:
 *         description: 无效的通知ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: 通知不存在或无权限
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: '无效的通知ID'
      });
    }
    
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在或无权限'
      });
    }
    
    return res.json({
      success: true,
      message: '通知已删除'
    });
  } catch (error) {
    console.error('删除通知失败:', error);
    return res.status(500).json({
      success: false,
      message: '删除通知失败',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/notifications/clear-all:
 *   delete:
 *     summary: 清空所有通知
 *     description: 删除当前用户的所有通知
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 清空成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: integer
 *                       example: 25
 *                 message:
 *                   type: string
 *                   example: "已清空25条通知"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: 服务器错误
 */
router.delete('/clear-all', protect, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user._id
    });
    
    return res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount
      },
      message: `已清空${result.deletedCount}条通知`
    });
  } catch (error) {
    console.error('清空通知失败:', error);
    return res.status(500).json({
      success: false,
      message: '清空通知失败',
      error: error.message
    });
  }
});

module.exports = router; 