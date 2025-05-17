const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     MessageQueue:
 *       type: object
 *       required:
 *         - user
 *       properties:
 *         _id:
 *           type: string
 *           description: 队列ID
 *         user:
 *           type: string
 *           description: 接收消息的用户ID
 *         messages:
 *           type: array
 *           items:
 *             type: object
 *           description: 等待接收的消息列表
 *         systemMessages:
 *           type: array
 *           items:
 *             type: object
 *           description: 等待接收的系统消息列表
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

const MessageQueueSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    messages: [
      {
        message: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Message',
          required: true
        },
        addedAt: {
          type: Date,
          default: Date.now
        },
        delivered: {
          type: Boolean,
          default: false
        }
      }
    ],
    systemMessages: [
      {
        type: {
          type: String,
          enum: ['system', 'friend_request', 'notification'],
          default: 'system'
        },
        content: {
          type: String,
          required: true
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        },
        addedAt: {
          type: Date,
          default: Date.now
        },
        delivered: {
          type: Boolean,
          default: false
        }
      }
    ],
    lastPolledAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// 添加消息到用户队列的静态方法
MessageQueueSchema.statics.addMessageToQueue = async function(userId, messageId) {
  try {
    // 找到用户的消息队列，如果不存在则创建
    const queue = await this.findOneAndUpdate(
      { user: userId },
      { 
        $push: { 
          messages: { 
            message: messageId,
            addedAt: new Date(),
            delivered: false 
          } 
        } 
      },
      { 
        new: true, 
        upsert: true 
      }
    );
    
    return queue;
  } catch (err) {
    console.error('添加消息到队列失败:', err);
    throw err;
  }
};

// 添加系统消息到用户队列
MessageQueueSchema.statics.addSystemMessageToQueue = async function(userId, systemMessage) {
  try {
    if (!systemMessage.content) {
      throw new Error('系统消息必须包含内容');
    }
    
    // 找到用户的消息队列，如果不存在则创建
    const queue = await this.findOneAndUpdate(
      { user: userId },
      { 
        $push: { 
          systemMessages: { 
            type: systemMessage.type || 'system',
            content: systemMessage.content,
            metadata: systemMessage.metadata || {},
            addedAt: new Date(),
            delivered: false 
          } 
        } 
      },
      { 
        new: true, 
        upsert: true 
      }
    );
    
    return queue;
  } catch (err) {
    console.error('添加系统消息到队列失败:', err);
    throw err;
  }
};

// 检索并标记用户队列中的消息为已发送
MessageQueueSchema.statics.getPendingMessages = async function(userId) {
  try {
    // 查找用户的消息队列
    const queue = await this.findOne({ user: userId })
      .populate({
        path: 'messages.message',
        populate: [
          { path: 'sender', select: 'username avatar status' },
          { path: 'group', select: 'name avatar' }
        ]
      });
    
    if (!queue) {
      return {
        messages: [],
        systemMessages: []
      };
    }
    
    // 获取未发送的普通消息
    const pendingMessages = queue.messages.filter(m => !m.delivered);
    
    // 获取未发送的系统消息
    const pendingSystemMessages = queue.systemMessages.filter(m => !m.delivered);
    
    // 标记普通消息为已发送
    if (pendingMessages.length > 0) {
      const messageIds = pendingMessages.map(m => m.message._id);
      
      await this.updateOne(
        { user: userId },
        { 
          $set: { 
            'messages.$[elem].delivered': true
          } 
        },
        { 
          arrayFilters: [{ 'elem.message': { $in: messageIds } }],
          multi: true 
        }
      );
    }
    
    // 标记系统消息为已发送
    if (pendingSystemMessages.length > 0) {
      const systemMessageIds = pendingSystemMessages.map(m => m._id);
      
      await this.updateOne(
        { user: userId },
        { 
          $set: { 
            'systemMessages.$[elem].delivered': true
          },
          lastPolledAt: new Date()
        },
        { 
          arrayFilters: [{ 'elem._id': { $in: systemMessageIds } }],
          multi: true 
        }
      );
    }
    
    return {
      messages: pendingMessages.map(m => m.message),
      systemMessages: pendingSystemMessages
    };
  } catch (err) {
    console.error('获取待处理消息失败:', err);
    throw err;
  }
};

// 定期清理已发送的旧消息
MessageQueueSchema.statics.cleanupDeliveredMessages = async function() {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 清理普通消息
    await this.updateMany(
      {},
      { 
        $pull: { 
          messages: { 
            delivered: true,
            addedAt: { $lt: oneDayAgo }
          } 
        } 
      }
    );
    
    // 清理系统消息
    await this.updateMany(
      {},
      { 
        $pull: { 
          systemMessages: { 
            delivered: true,
            addedAt: { $lt: oneDayAgo }
          } 
        } 
      }
    );
    
    return true;
  } catch (err) {
    console.error('清理已发送消息失败:', err);
    throw err;
  }
};

module.exports = mongoose.model('MessageQueue', MessageQueueSchema); 