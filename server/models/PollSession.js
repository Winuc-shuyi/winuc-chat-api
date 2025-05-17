const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     PollSession:
 *       type: object
 *       required:
 *         - user
 *         - sessionId
 *       properties:
 *         _id:
 *           type: string
 *           description: 会话ID
 *         user:
 *           type: string
 *           description: 用户ID
 *         sessionId:
 *           type: string
 *           description: 客户端会话ID
 *         lastActivity:
 *           type: string
 *           format: date-time
 *           description: 最后活动时间
 *         clientInfo:
 *           type: object
 *           properties:
 *             userAgent:
 *               type: string
 *             ip:
 *               type: string
 *           description: 客户端信息
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

const PollSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sessionId: {
      type: String,
      required: true,
      unique: true
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    clientInfo: {
      userAgent: String,
      ip: String
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// 索引以提高查询性能
PollSessionSchema.index({ user: 1 });
PollSessionSchema.index({ sessionId: 1 });
PollSessionSchema.index({ lastActivity: 1 });

// 更新活动时间
PollSessionSchema.statics.updateActivity = async function(sessionId, userId) {
  try {
    await this.findOneAndUpdate(
      { sessionId, user: userId },
      { lastActivity: new Date() },
      { new: true, upsert: true }
    );
    return true;
  } catch (err) {
    console.error('更新会话活动时间失败:', err);
    return false;
  }
};

// 获取用户的所有活动会话
PollSessionSchema.statics.getUserActiveSessions = async function(userId) {
  try {
    // 找出最近30分钟活动的会话
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const sessions = await this.find({
      user: userId,
      lastActivity: { $gt: thirtyMinutesAgo },
      active: true
    });
    
    return sessions;
  } catch (err) {
    console.error('获取用户活动会话失败:', err);
    return [];
  }
};

// 清理过期会话
PollSessionSchema.statics.cleanupExpiredSessions = async function() {
  try {
    // 清理超过1小时未活动的会话
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const result = await this.updateMany(
      { lastActivity: { $lt: oneHourAgo } },
      { active: false }
    );
    
    return result.nModified;
  } catch (err) {
    console.error('清理过期会话失败:', err);
    return 0;
  }
};

module.exports = mongoose.model('PollSession', PollSessionSchema); 