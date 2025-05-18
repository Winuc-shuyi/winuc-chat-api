const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       required:
 *         - name
 *         - creator
 *       properties:
 *         _id:
 *           type: string
 *           description: 群组ID
 *         name:
 *           type: string
 *           description: 群组名称
 *         description:
 *           type: string
 *           description: 群组描述
 *         avatar:
 *           type: string
 *           description: 群组头像URL
 *         creator:
 *           type: string
 *           description: 创建者ID
 *         admins:
 *           type: array
 *           items:
 *             type: string
 *           description: 管理员ID列表
 *         members:
 *           type: array
 *           items:
 *             type: object
 *           description: 成员列表
 *         isPublic:
 *           type: boolean
 *           description: 是否为公开群组
 *         maxMembers:
 *           type: number
 *           description: 最大成员数量
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, '请提供群组名称'],
      trim: true,
      minlength: [2, '群组名称至少需要2个字符'],
      maxlength: [30, '群组名称不能超过30个字符']
    },
    description: {
      type: String,
      default: '这是一个群组',
      maxlength: [200, '群组描述不能超过200个字符']
    },
    avatar: {
      type: String,
      default: 'https://ui-avatars.com/api/?name=Group&background=random'
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        nickname: {
          type: String,
          default: ''
        },
        role: {
          type: String,
          enum: ['creator', 'admin', 'member'],
          default: 'member'
        },
        joinedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    isPublic: {
      type: Boolean,
      default: true
    },
    maxMembers: {
      type: Number,
      default: 100,
      max: [500, '群组最大成员数不能超过500人']
    }
  },
  {
    timestamps: true
  }
);

// 确保创建者也是管理员和成员
GroupSchema.pre('save', function(next) {
  if (this.isNew) {
    // 如果创建者不在管理员列表中，则添加
    if (!this.admins.includes(this.creator)) {
      this.admins.push(this.creator);
    }
    
    // 如果创建者不在成员列表中，则添加
    const isCreatorMember = this.members.some(member => 
      member.user.toString() === this.creator.toString()
    );
    
    if (!isCreatorMember) {
      this.members.push({
        user: this.creator,
        role: 'creator',
        joinedAt: new Date()
      });
    }
  }
  next();
});

// 获取群组成员数量的虚拟属性
GroupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// 检查用户是否是群组成员
GroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// 检查用户是否是群组管理员
GroupSchema.methods.isAdmin = function(userId) {
  return this.admins.some(admin => admin.toString() === userId.toString());
};

// 检查用户是否是群组创建者
GroupSchema.methods.isCreator = function(userId) {
  return this.creator.toString() === userId.toString();
};

// 获取成员角色
GroupSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

module.exports = mongoose.model('Group', GroupSchema); 