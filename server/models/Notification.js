const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * 通知类型枚举
 * MESSAGE: 新消息通知
 * FRIEND_REQUEST: 好友请求通知
 * FRIEND_ACCEPTED: 好友请求接受通知
 * GROUP_INVITE: 群组邀请通知
 * GROUP_JOIN: 用户加入群组通知
 * SYSTEM: 系统通知
 */
const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  GROUP_INVITE: 'group_invite',
  GROUP_JOIN: 'group_join',
  SYSTEM: 'system'
};

const NotificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: Object.values(NOTIFICATION_TYPES),
    required: true
  },
  content: {
    type: String,
    required: true
  },
  relatedId: {
    type: Schema.Types.ObjectId,
    // 可以关联到消息、好友请求或群组ID
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// 索引创建
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1 });

// 静态方法：创建消息通知
NotificationSchema.statics.createMessageNotification = async function(recipientId, senderId, messageId, content) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: NOTIFICATION_TYPES.MESSAGE,
    content: content,
    relatedId: messageId
  });
};

// 静态方法：创建好友请求通知
NotificationSchema.statics.createFriendRequestNotification = async function(recipientId, senderId, requestId) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: NOTIFICATION_TYPES.FRIEND_REQUEST,
    content: '收到新的好友请求',
    relatedId: requestId
  });
};

// 静态方法：创建好友接受通知
NotificationSchema.statics.createFriendAcceptedNotification = async function(recipientId, senderId) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: NOTIFICATION_TYPES.FRIEND_ACCEPTED,
    content: '好友请求已被接受',
    relatedId: senderId
  });
};

// 静态方法：创建群组邀请通知
NotificationSchema.statics.createGroupInviteNotification = async function(recipientId, senderId, groupId, groupName) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: NOTIFICATION_TYPES.GROUP_INVITE,
    content: `您被邀请加入群组: ${groupName}`,
    relatedId: groupId
  });
};

// 静态方法：创建群组加入通知
NotificationSchema.statics.createGroupJoinNotification = async function(groupId, userId, groupName) {
  return this.create({
    recipient: userId,
    type: NOTIFICATION_TYPES.GROUP_JOIN,
    content: `您已成功加入群组: ${groupName}`,
    relatedId: groupId
  });
};

// 静态方法：创建系统通知
NotificationSchema.statics.createSystemNotification = async function(recipientId, content) {
  return this.create({
    recipient: recipientId,
    type: NOTIFICATION_TYPES.SYSTEM,
    content: content
  });
};

module.exports = {
  NOTIFICATION_TYPES,
  Notification: mongoose.model('Notification', NotificationSchema)
}; 