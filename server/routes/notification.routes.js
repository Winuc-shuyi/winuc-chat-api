const express = require('express');
const router = express.Router();
const { Notification } = require('../models/Notification');
const { protect } = require('../middlewares/auth');
const mongoose = require('mongoose');

/**
 * @route GET /api/notifications
 * @desc 获取用户的通知列表
 * @access Private
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
 * @route GET /api/notifications/unread-count
 * @desc 获取未读通知数量
 * @access Private
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
 * @route PATCH /api/notifications/:id/mark-read
 * @desc 将单个通知标记为已读
 * @access Private
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
 * @route PATCH /api/notifications/mark-all-read
 * @desc 将所有通知标记为已读
 * @access Private
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
 * @route DELETE /api/notifications/:id
 * @desc 删除单个通知
 * @access Private
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
 * @route DELETE /api/notifications/clear-all
 * @desc 清空所有通知
 * @access Private
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