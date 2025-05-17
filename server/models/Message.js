const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       required:
 *         - sender
 *         - content
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: 消息ID
 *         sender:
 *           type: string
 *           description: 发送者用户ID
 *         receiver:
 *           type: string
 *           description: 接收者用户ID (私聊消息)
 *         group:
 *           type: string
 *           description: 接收消息的群组ID (群组消息)
 *         content:
 *           type: string
 *           description: 消息内容
 *         type:
 *           type: string
 *           enum: [text, image, file, system, emoji]
 *           description: 消息类型
 *         metadata:
 *           type: object
 *           description: 消息元数据，根据消息类型不同而不同
 *         isRead:
 *           type: boolean
 *           description: 消息是否已读
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

const MessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, '消息内容不能超过1000个字符']
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system', 'emoji'],
      default: 'text'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// 消息必须有接收者或群组ID
MessageSchema.pre('save', function(next) {
  if (!this.receiver && !this.group) {
    const error = new Error('消息必须指定接收者或群组');
    return next(error);
  }
  
  // 如果是群组消息，确保接收者为空
  if (this.group && this.receiver) {
    this.receiver = undefined;
  }
  
  next();
});

// 创建索引
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ group: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, isRead: 1 });

module.exports = mongoose.model('Message', MessageSchema);