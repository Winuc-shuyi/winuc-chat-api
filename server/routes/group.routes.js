const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middlewares/auth');
const mongoose = require('mongoose');

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: 群组管理API
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: 创建新群组
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               initialMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 群组创建成功
 *       400:
 *         description: 请求错误
 *       401:
 *         description: 未授权
 */
router.post('/', protect, async (req, res, next) => {
  try {
    const { name, description, isPublic, initialMembers } = req.body;
    const userId = req.user._id;
    
    // 创建新群组
    const group = new Group({
      name,
      description,
      creator: userId,
      isPublic: isPublic !== undefined ? isPublic : true
    });
    
    // 将创建者添加为管理员和成员（通过Schema的pre-save钩子自动添加）
    
    // 添加初始成员
    if (initialMembers && Array.isArray(initialMembers)) {
      // 先过滤掉无效ID和创建者本身
      const validMemberIds = initialMembers.filter(id => 
        mongoose.Types.ObjectId.isValid(id) && id !== userId.toString()
      );
      
      // 确认这些用户存在
      const users = await User.find({ _id: { $in: validMemberIds } });
      
      // 添加有效用户到成员列表
      users.forEach(user => {
        group.members.push({
          user: user._id,
          role: 'member',
          joinedAt: new Date()
        });
      });
    }
    
    await group.save();
    
    // 添加系统消息，通知成员被添加到群组
    const systemMessage = {
      type: 'system',
      content: `群组 "${group.name}" 已创建`,
      metadata: {
        type: 'group_created',
        groupId: group._id,
        groupName: group.name,
        creatorId: userId
      }
    };
    
    // 向所有成员发送系统消息
    group.members.forEach(async (member) => {
      await global.MessageQueue.addSystemMessageToQueue(
        member.user,
        systemMessage
      );
    });
    
    res.status(201).json({
      success: true,
      message: '群组创建成功',
      data: {
        group
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: 获取用户所在的所有群组
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取群组成功
 *       401:
 *         description: 未授权
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // 查找用户所在的所有群组
    const groups = await Group.find({
      'members.user': userId
    }).select('-__v');
    
    res.status(200).json({
      success: true,
      count: groups.length,
      data: {
        groups
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: 获取群组详情
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取群组详情成功
 *       401:
 *         description: 未授权
 *       404:
 *         description: 群组不存在
 */
router.get('/:groupId', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的群组ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId)
      .populate('creator', 'username avatar')
      .populate('admins', 'username avatar')
      .populate('members.user', 'username avatar status lastActive');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查用户是否是群组成员
    const isMember = group.isMember(userId);
    
    if (!isMember && !group.isPublic) {
      return res.status(403).json({
        success: false,
        message: '您不是该群组成员，无权查看'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        group,
        isMember,
        isAdmin: group.isAdmin(userId),
        isCreator: group.isCreator(userId)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     summary: 更新群组信息
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 群组更新成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权更新该群组
 *       404:
 *         description: 群组不存在
 */
router.put('/:groupId', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, description, avatar, isPublic } = req.body;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的群组ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查用户是否有权更新群组（仅创建者和管理员可更新）
    if (!group.isCreator(userId) && !group.isAdmin(userId)) {
      return res.status(403).json({
        success: false,
        message: '您不是群组的创建者或管理员，无权更新'
      });
    }
    
    // 更新群组信息
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (avatar) group.avatar = avatar;
    
    // 只有创建者可以修改公开状态
    if (isPublic !== undefined && group.isCreator(userId)) {
      group.isPublic = isPublic;
    }
    
    await group.save();
    
    res.status(200).json({
      success: true,
      message: '群组更新成功',
      data: {
        group
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   delete:
 *     summary: 删除群组
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 群组删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权删除该群组
 *       404:
 *         description: 群组不存在
 */
router.delete('/:groupId', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的群组ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查用户是否是群组创建者
    if (!group.isCreator(userId)) {
      return res.status(403).json({
        success: false,
        message: '只有群组创建者可以删除群组'
      });
    }
    
    // 删除群组消息
    await Message.deleteMany({ group: groupId });
    
    // 删除群组
    await group.remove();
    
    res.status(200).json({
      success: true,
      message: '群组已删除'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/members:
 *   post:
 *     summary: 添加成员到群组
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               nickname:
 *                 type: string
 *     responses:
 *       200:
 *         description: 成员添加成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权添加成员
 *       404:
 *         description: 群组或用户不存在
 */
router.post('/:groupId/members', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId, nickname } = req.body;
    const currentUserId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查用户是否有权添加成员
    if (!group.isCreator(currentUserId) && !group.isAdmin(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: '只有群组创建者或管理员可以添加成员'
      });
    }
    
    // 确认要添加的用户存在
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '要添加的用户不存在'
      });
    }
    
    // 检查是否已经是成员
    if (group.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: '该用户已经是群组成员'
      });
    }
    
    // 检查群组是否已满
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({
        success: false,
        message: '群组成员已达到上限'
      });
    }
    
    // 添加成员
    group.members.push({
      user: userId,
      nickname: nickname || '',
      role: 'member',
      joinedAt: new Date()
    });
    
    await group.save();
    
    // 向新成员发送系统消息
    const systemMessage = {
      type: 'system',
      content: `您已被添加到群组 "${group.name}"`,
      metadata: {
        type: 'added_to_group',
        groupId: group._id,
        groupName: group.name,
        addedBy: currentUserId
      }
    };
    
    await global.MessageQueue.addSystemMessageToQueue(userId, systemMessage);
    
    res.status(200).json({
      success: true,
      message: '成员添加成功',
      data: {
        group
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/join:
 *   post:
 *     summary: 加入群组
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功加入群组
 *       400:
 *         description: 无法加入群组
 *       401:
 *         description: 未授权
 *       404:
 *         description: 群组不存在
 */
router.post('/:groupId/join', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的群组ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查群组是否为公开群组
    if (!group.isPublic) {
      return res.status(403).json({
        success: false,
        message: '该群组不是公开群组，无法直接加入'
      });
    }
    
    // 检查是否已经是成员
    if (group.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: '您已经是该群组成员'
      });
    }
    
    // 检查群组是否已满
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({
        success: false,
        message: '群组成员已达到上限'
      });
    }
    
    // 加入群组
    group.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });
    
    await group.save();
    
    // 通知群组管理员
    const adminSystemMessage = {
      type: 'system',
      content: `用户 ${req.user.username} 加入了群组 "${group.name}"`,
      metadata: {
        type: 'user_joined_group',
        groupId: group._id,
        groupName: group.name,
        userId: userId,
        username: req.user.username
      }
    };
    
    // 向所有管理员发送通知
    for (const adminId of group.admins) {
      await global.MessageQueue.addSystemMessageToQueue(adminId, adminSystemMessage);
    }
    
    res.status(200).json({
      success: true,
      message: '成功加入群组',
      data: {
        group
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/leave:
 *   post:
 *     summary: 退出群组
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功退出群组
 *       400:
 *         description: 无法退出群组
 *       401:
 *         description: 未授权
 *       404:
 *         description: 群组不存在
 */
router.post('/:groupId/leave', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的群组ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查是否是群组成员
    if (!group.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: '您不是该群组成员'
      });
    }
    
    // 检查是否是群组创建者
    if (group.isCreator(userId)) {
      return res.status(400).json({
        success: false,
        message: '群组创建者不能退出群组，请先转让群组或解散群组'
      });
    }
    
    // 退出群组
    const memberIndex = group.members.findIndex(
      member => member.user.toString() === userId.toString()
    );
    
    if (memberIndex !== -1) {
      group.members.splice(memberIndex, 1);
    }
    
    // 如果是管理员，也要从管理员列表移除
    if (group.isAdmin(userId)) {
      const adminIndex = group.admins.findIndex(
        admin => admin.toString() === userId.toString()
      );
      
      if (adminIndex !== -1) {
        group.admins.splice(adminIndex, 1);
      }
    }
    
    await group.save();
    
    // 通知群组管理员
    const adminSystemMessage = {
      type: 'system',
      content: `用户 ${req.user.username} 退出了群组 "${group.name}"`,
      metadata: {
        type: 'user_left_group',
        groupId: group._id,
        groupName: group.name,
        userId: userId,
        username: req.user.username
      }
    };
    
    // 向所有管理员发送通知
    for (const adminId of group.admins) {
      await global.MessageQueue.addSystemMessageToQueue(adminId, adminSystemMessage);
    }
    
    res.status(200).json({
      success: true,
      message: '成功退出群组'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/members/{userId}:
 *   delete:
 *     summary: 从群组移除成员
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成员移除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权移除成员
 *       404:
 *         description: 群组或成员不存在
 */
router.delete('/:groupId/members/:userId', protect, async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查当前用户是否有权移除成员
    if (!group.isCreator(currentUserId) && !group.isAdmin(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: '只有群组创建者或管理员可以移除成员'
      });
    }
    
    // 检查要移除的用户是否是群组成员
    if (!group.isMember(userId)) {
      return res.status(404).json({
        success: false,
        message: '要移除的用户不是群组成员'
      });
    }
    
    // 检查是否正在尝试移除创建者
    if (group.isCreator(userId)) {
      return res.status(400).json({
        success: false,
        message: '不能移除群组创建者'
      });
    }
    
    // 检查管理员是否在尝试移除另一个管理员（只有创建者可以移除管理员）
    if (group.isAdmin(userId) && !group.isCreator(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: '只有群组创建者可以移除管理员'
      });
    }
    
    // 移除成员
    const memberIndex = group.members.findIndex(
      member => member.user.toString() === userId.toString()
    );
    
    if (memberIndex !== -1) {
      group.members.splice(memberIndex, 1);
    }
    
    // 如果是管理员，也要从管理员列表移除
    if (group.isAdmin(userId)) {
      const adminIndex = group.admins.findIndex(
        admin => admin.toString() === userId.toString()
      );
      
      if (adminIndex !== -1) {
        group.admins.splice(adminIndex, 1);
      }
    }
    
    await group.save();
    
    // 向被移除成员发送系统消息
    const systemMessage = {
      type: 'system',
      content: `您已被移出群组 "${group.name}"`,
      metadata: {
        type: 'removed_from_group',
        groupId: group._id,
        groupName: group.name,
        removedBy: currentUserId
      }
    };
    
    await global.MessageQueue.addSystemMessageToQueue(userId, systemMessage);
    
    res.status(200).json({
      success: true,
      message: '成员移除成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/admins/{userId}:
 *   post:
 *     summary: 设置群组管理员
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 管理员设置成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权设置管理员
 *       404:
 *         description: 群组或成员不存在
 */
router.post('/:groupId/admins/:userId', protect, async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查当前用户是否是群组创建者（只有创建者可以设置管理员）
    if (!group.isCreator(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: '只有群组创建者可以设置管理员'
      });
    }
    
    // 检查要设置的用户是否是群组成员
    if (!group.isMember(userId)) {
      return res.status(404).json({
        success: false,
        message: '要设置为管理员的用户不是群组成员'
      });
    }
    
    // 检查是否已经是管理员
    if (group.isAdmin(userId)) {
      return res.status(400).json({
        success: false,
        message: '该用户已经是管理员'
      });
    }
    
    // 添加为管理员
    group.admins.push(userId);
    
    // 更新成员角色
    const memberIndex = group.members.findIndex(
      member => member.user.toString() === userId.toString()
    );
    
    if (memberIndex !== -1) {
      group.members[memberIndex].role = 'admin';
    }
    
    await group.save();
    
    // 向新管理员发送系统消息
    const systemMessage = {
      type: 'system',
      content: `您已被设为群组 "${group.name}" 的管理员`,
      metadata: {
        type: 'promoted_to_admin',
        groupId: group._id,
        groupName: group.name,
        promotedBy: currentUserId
      }
    };
    
    await global.MessageQueue.addSystemMessageToQueue(userId, systemMessage);
    
    res.status(200).json({
      success: true,
      message: '管理员设置成功',
      data: {
        group
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/admins/{userId}:
 *   delete:
 *     summary: 移除群组管理员
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 管理员移除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权移除管理员
 *       404:
 *         description: 群组或管理员不存在
 */
router.delete('/:groupId/admins/:userId', protect, async (req, res, next) => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID'
      });
    }
    
    // 查找群组
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: '群组不存在'
      });
    }
    
    // 检查当前用户是否是群组创建者（只有创建者可以移除管理员）
    if (!group.isCreator(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: '只有群组创建者可以移除管理员'
      });
    }
    
    // 检查要移除的用户是否是管理员
    if (!group.isAdmin(userId)) {
      return res.status(404).json({
        success: false,
        message: '要移除的用户不是管理员'
      });
    }
    
    // 检查是否正在尝试移除创建者的管理员权限
    if (group.isCreator(userId)) {
      return res.status(400).json({
        success: false,
        message: '不能移除创建者的管理员权限'
      });
    }
    
    // 从管理员列表移除
    const adminIndex = group.admins.findIndex(
      admin => admin.toString() === userId.toString()
    );
    
    if (adminIndex !== -1) {
      group.admins.splice(adminIndex, 1);
    }
    
    // 更新成员角色
    const memberIndex = group.members.findIndex(
      member => member.user.toString() === userId.toString()
    );
    
    if (memberIndex !== -1) {
      group.members[memberIndex].role = 'member';
    }
    
    await group.save();
    
    // 向被移除的管理员发送系统消息
    const systemMessage = {
      type: 'system',
      content: `您已被取消群组 "${group.name}" 的管理员身份`,
      metadata: {
        type: 'demoted_from_admin',
        groupId: group._id,
        groupName: group.name,
        demotedBy: currentUserId
      }
    };
    
    await global.MessageQueue.addSystemMessageToQueue(userId, systemMessage);
    
    res.status(200).json({
      success: true,
      message: '管理员移除成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/groups/search:
 *   get:
 *     summary: 搜索群组
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 搜索成功
 *       401:
 *         description: 未授权
 */
router.get('/search', protect, async (req, res, next) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词'
      });
    }
    
    // 只搜索公开群组
    const groups = await Group.find({
      name: { $regex: keyword, $options: 'i' },
      isPublic: true
    }).limit(20);
    
    res.status(200).json({
      success: true,
      count: groups.length,
      data: {
        groups
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;