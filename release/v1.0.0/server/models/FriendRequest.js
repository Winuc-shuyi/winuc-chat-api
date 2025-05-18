const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     FriendRequest:
 *       type: object
 *       required:
 *         - sender
 *         - receiver
 *       properties:
 *         _id:
 *           type: string
 *           description: 请求ID
 *         sender:
 *           type: string
 *           description: 发送请求的用户ID
 *         receiver:
 *           type: string
 *           description: 接收请求的用户ID
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *           description: 请求状态
 *         message:
 *           type: string
 *           description: 验证消息
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

const FriendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    message: {
      type: String,
      default: '请求添加您为好友',
      maxlength: [100, '验证消息不能超过100个字符']
    }
  },
  {
    timestamps: true
  }
);

// 确保每对用户之间只有一个未处理的好友请求
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model('FriendRequest', FriendRequestSchema); 