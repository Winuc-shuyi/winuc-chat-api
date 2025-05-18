const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: 用户ID
 *         username:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           description: 电子邮箱
 *         password:
 *           type: string
 *           description: 密码（加密存储）
 *         avatar:
 *           type: string
 *           description: 头像URL
 *         bio:
 *           type: string
 *           description: 个人简介
 *         status:
 *           type: string
 *           enum: [online, offline, away, busy]
 *           description: 用户状态
 *         friends:
 *           type: array
 *           items:
 *             type: object
 *           description: 好友列表
 *         friendGroups:
 *           type: array
 *           items:
 *             type: object
 *           description: 好友分组
 *         resetPasswordToken:
 *           type: string
 *           description: 密码重置令牌
 *         resetPasswordExpire:
 *           type: string
 *           format: date-time
 *           description: 密码重置令牌过期时间
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '请提供用户名'],
      unique: true,
      trim: true,
      minlength: [3, '用户名至少需要3个字符'],
      maxlength: [20, '用户名不能超过20个字符']
    },
    email: {
      type: String,
      required: [true, '请提供电子邮箱'],
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        '请提供有效的电子邮箱'
      ]
    },
    password: {
      type: String,
      required: [true, '请提供密码'],
      minlength: [6, '密码至少需要6个字符'],
      select: false // 查询时默认不返回密码
    },
    avatar: {
      type: String,
      default: 'https://ui-avatars.com/api/?name=User&background=random'
    },
    bio: {
      type: String,
      default: '这个用户很懒，还没有写自我介绍'
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'away', 'busy'],
      default: 'offline'
    },
    friends: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        nickname: {
          type: String,
          default: ''
        },
        groupId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FriendGroup',
          default: null
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    friendGroups: [
      {
        name: {
          type: String,
          required: true
        },
        description: {
          type: String,
          default: ''
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    lastActive: {
      type: Date,
      default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  {
    timestamps: true
  }
);

// 保存前加密密码
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 比较密码
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 生成JWT令牌
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET || 'winuc_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// 创建默认好友分组
UserSchema.pre('save', function(next) {
  // 如果是新用户或没有好友分组
  if (this.isNew || !this.friendGroups || this.friendGroups.length === 0) {
    // 创建默认好友分组
    this.friendGroups = [
      {
        name: '我的好友',
        description: '默认好友分组'
      }
    ];
  }
  next();
});

// 检查用户是否是好友
UserSchema.methods.isFriend = function(userId) {
  return this.friends.some(friend => friend.user.toString() === userId.toString());
};

// 获取好友的备注名
UserSchema.methods.getFriendNickname = function(userId) {
  const friend = this.friends.find(f => f.user.toString() === userId.toString());
  return friend ? friend.nickname || null : null;
};

module.exports = mongoose.model('User', UserSchema); 