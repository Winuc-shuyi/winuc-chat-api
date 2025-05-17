const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const { protect } = require('../middlewares/auth');
const mongoose = require('mongoose');
const MessageQueue = require('../models/MessageQueue');

/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: 好友管理API
 */

/**
 * @swagger
 * /api/friends:
 *   get:
 *     summary: 获取好友列表
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取好友列表成功
 *       401:
 *         description: 未授权
 */
router.get('/', protect, async (req, res, next) => {
  try {
    // 从用户对象中获取好友列表并填充好友信息
    const user = await User.findById(req.user._id)
      .populate({
        path: 'friends.user',
        select: 'username email avatar bio status lastActive'
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 为每个好友分组整理数据
    const groupedFriends = {};
    
    // 先把所有分组作为键添加到对象中
    user.friendGroups.forEach(group => {
      groupedFriends[group._id] = {
        groupId: group._id,
        groupName: group.name,
        groupDescription: group.description,
        friends: []
      };
    });
    
    // 添加未分组好友的默认分组
    groupedFriends['default'] = {
      groupId: 'default',
      groupName: '未分组',
      groupDescription: '未分配分组的好友',
      friends: []
    };
    
    // 将好友根据分组放入对应分组中
    user.friends.forEach(friend => {
      const friendData = {
        id: friend.user._id,
        username: friend.user.username,
        nickname: friend.nickname || friend.user.username,
        email: friend.user.email,
        avatar: friend.user.avatar,
        bio: friend.user.bio,
        status: friend.user.status,
        lastActive: friend.user.lastActive,
        addedAt: friend.addedAt
      };
      
      if (friend.groupId && groupedFriends[friend.groupId]) {
        groupedFriends[friend.groupId].friends.push(friendData);
      } else {
        groupedFriends['default'].friends.push(friendData);
      }
    });
    
    // 转换为数组格式
    const friendGroups = Object.values(groupedFriends);
    
    res.status(200).json({
      success: true,
      data: {
        friendGroups
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/list:
 *   get:
 *     summary: 获取好友列表(扁平结构)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取好友列表成功
 *       401:
 *         description: 未授权
 */
router.get('/list', protect, async (req, res, next) => {
  try {
    // 从用户对象中获取好友列表并填充好友信息
    const user = await User.findById(req.user._id)
      .populate({
        path: 'friends.user',
        select: 'username email avatar bio status lastActive'
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 将好友列表整理为扁平结构
    const friends = user.friends.map(friend => ({
      id: friend.user._id,
      username: friend.user.username,
      nickname: friend.nickname || friend.user.username,
      email: friend.user.email,
      avatar: friend.user.avatar,
      bio: friend.user.bio,
      status: friend.user.status,
      lastActive: friend.user.lastActive,
      groupId: friend.groupId || 'default',
      addedAt: friend.addedAt
    }));
    
    res.status(200).json({
      success: true,
      count: friends.length,
      data: {
        friends
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/add/{userId}:
 *   post:
 *     summary: 直接添加好友（无需请求）
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 好友添加成功
 *       400:
 *         description: 好友已存在
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 */
router.post('/add/:userId', protect, async (req, res, next) => {
  try {
    const friendId = req.params.userId;
    const userId = req.user._id;
    
    // 确保不能添加自己为好友
    if (friendId === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: '不能添加自己为好友'
      });
    }
    
    // 检查要添加的好友是否存在
    const friend = await User.findById(friendId);
    
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查好友是否已存在
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否已经是好友
    const alreadyFriends = user.friends.some(
      friend => friend.user.toString() === friendId
    );
    
    if (alreadyFriends) {
      return res.status(400).json({
        success: false,
        message: '该用户已是您的好友'
      });
    }
    
    // 添加好友到当前用户
    user.friends.push({
      user: friendId,
      nickname: '',
      groupId: user.friendGroups[0]._id, // 默认分组
      addedAt: new Date()
    });
    
    await user.save();
    
    // 添加当前用户到好友的好友列表
    friend.friends.push({
      user: userId,
      nickname: '',
      groupId: friend.friendGroups[0]._id, // 默认分组
      addedAt: new Date()
    });
    
    await friend.save();
    
    res.status(200).json({
      success: true,
      message: '好友添加成功',
      data: {
        friend: {
          id: friend._id,
          username: friend.username,
          email: friend.email,
          avatar: friend.avatar,
          bio: friend.bio,
          status: friend.status
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/remove/{userId}:
 *   delete:
 *     summary: 删除好友
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 好友删除成功
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在或不是好友
 */
router.delete('/remove/:userId', protect, async (req, res, next) => {
  try {
    const friendId = req.params.userId;
    const userId = req.user._id;
    
    // 查找当前用户
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否是好友
    const friendIndex = user.friends.findIndex(
      friend => friend.user.toString() === friendId
    );
    
    if (friendIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '该用户不是您的好友'
      });
    }
    
    // 移除好友
    user.friends.splice(friendIndex, 1);
    await user.save();
    
    // 同时从对方的好友列表中移除当前用户
    const friend = await User.findById(friendId);
    if (friend) {
      const currentUserIndex = friend.friends.findIndex(
        f => f.user.toString() === userId.toString()
      );
      
      if (currentUserIndex !== -1) {
        friend.friends.splice(currentUserIndex, 1);
        await friend.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: '好友删除成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/check/{userId}:
 *   get:
 *     summary: 检查用户是否为好友
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 检查成功
 *       401:
 *         description: 未授权
 */
router.get('/check/:userId', protect, async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const userId = req.user._id;
    
    // 查找当前用户
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否是好友
    const isFriend = user.friends.some(
      friend => friend.user.toString() === targetUserId
    );
    
    // 如果是好友，获取更多信息
    let friendData = null;
    
    if (isFriend) {
      const friendInfo = user.friends.find(
        friend => friend.user.toString() === targetUserId
      );
      
      // 获取好友的基本信息
      const friendUser = await User.findById(targetUserId)
        .select('username email avatar bio status lastActive');
      
      if (friendUser) {
        friendData = {
          id: friendUser._id,
          username: friendUser.username,
          nickname: friendInfo.nickname || friendUser.username,
          email: friendUser.email,
          avatar: friendUser.avatar,
          bio: friendUser.bio,
          status: friendUser.status,
          lastActive: friendUser.lastActive,
          groupId: friendInfo.groupId,
          addedAt: friendInfo.addedAt
        };
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        isFriend,
        friend: friendData
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/request:
 *   post:
 *     summary: 发送好友请求
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *             properties:
 *               receiverId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: 好友请求发送成功
 *       400:
 *         description: 无法发送请求
 *       401:
 *         description: 未授权
 */
router.post('/request', protect, async (req, res, next) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user._id;
    
    // 验证接收者ID
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: '接收者ID不能为空'
      });
    }
    
    // 确保不能给自己发送好友请求
    if (receiverId === senderId.toString()) {
      return res.status(400).json({
        success: false,
        message: '不能向自己发送好友请求'
      });
    }
    
    // 检查接收者是否存在
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: '接收者不存在'
      });
    }
    
    // 检查是否已经是好友
    const sender = await User.findById(senderId);
    if (sender.friends.some(friend => friend.user.toString() === receiverId)) {
      return res.status(400).json({
        success: false,
        message: '该用户已经是您的好友'
      });
    }
    
    // 检查是否已经有一个待处理的请求
    const existingRequest = await FriendRequest.findOne({
      sender: senderId,
      receiver: receiverId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: '您已经向该用户发送过好友请求，请等待对方处理'
      });
    }
    
    // 创建好友请求
    const friendRequest = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId,
      message: message || '请求添加您为好友'
    });
    
    // 向接收方发送通知消息
    const notificationMessage = {
      type: 'system',
      content: `${sender.username} 向您发送了好友请求: "${friendRequest.message}"`,
      metadata: {
        type: 'friend_request',
        requestId: friendRequest._id,
        senderId: senderId,
        senderName: sender.username
      }
    };
    
    // 创建系统消息
    const systemMessage = await global.MessageQueue.addSystemMessageToQueue(
      receiverId,
      notificationMessage
    );
    
    res.status(200).json({
      success: true,
      message: '好友请求发送成功',
      data: {
        request: friendRequest
      }
    });
  } catch (err) {
    if (err.code === 11000) { // 重复键错误
      return res.status(400).json({
        success: false,
        message: '已经存在一个未处理的好友请求'
      });
    }
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/requests/pending:
 *   get:
 *     summary: 获取待处理的好友请求
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未授权
 */
router.get('/requests/pending', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // 获取接收到的待处理请求
    const receivedRequests = await FriendRequest.find({
      receiver: userId,
      status: 'pending'
    }).populate('sender', 'username email avatar status');
    
    // 获取发送出去的待处理请求
    const sentRequests = await FriendRequest.find({
      sender: userId,
      status: 'pending'
    }).populate('receiver', 'username email avatar status');
    
    res.status(200).json({
      success: true,
      data: {
        received: receivedRequests,
        sent: sentRequests
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/request/{requestId}/accept:
 *   put:
 *     summary: 接受好友请求
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 好友请求接受成功
 *       400:
 *         description: 无效请求
 *       401:
 *         description: 未授权
 *       404:
 *         description: 请求不存在
 */
router.put('/request/:requestId/accept', protect, async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;
    
    // 查找好友请求
    const request = await FriendRequest.findById(requestId)
      .populate('sender', 'username email avatar status')
      .populate('receiver', 'username email avatar status');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '好友请求不存在'
      });
    }
    
    // 确保当前用户是请求的接收者
    if (request.receiver._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '您无权处理此请求'
      });
    }
    
    // 确保请求状态为待处理
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该请求已被处理'
      });
    }
    
    // 更新请求状态为已接受
    request.status = 'accepted';
    await request.save();
    
    // 添加对方为好友（双向）
    const currentUser = await User.findById(userId);
    const sender = await User.findById(request.sender._id);
    
    // 检查是否已经是好友
    const alreadyFriends = currentUser.friends.some(
      friend => friend.user.toString() === sender._id.toString()
    );
    
    if (!alreadyFriends) {
      // 为接收者添加发送者为好友
      currentUser.friends.push({
        user: sender._id,
        nickname: '',
        groupId: currentUser.friendGroups[0]._id // 默认分组
      });
      await currentUser.save();
      
      // 为发送者添加接收者为好友
      sender.friends.push({
        user: currentUser._id,
        nickname: '',
        groupId: sender.friendGroups[0]._id // 默认分组
      });
      await sender.save();
    }
    
    // 向发送方发送通知
    const notificationMessage = {
      type: 'system',
      content: `${currentUser.username} 接受了您的好友请求`,
      metadata: {
        type: 'friend_request_accepted',
        requestId: request._id,
        receiverId: currentUser._id,
        receiverName: currentUser.username
      }
    };
    
    // 创建系统消息
    const systemMessage = await global.MessageQueue.addSystemMessageToQueue(
      sender._id,
      notificationMessage
    );
    
    res.status(200).json({
      success: true,
      message: '好友请求已接受',
      data: {
        request,
        friend: {
          id: sender._id,
          username: sender.username,
          email: sender.email,
          avatar: sender.avatar,
          status: sender.status
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/request/{requestId}/reject:
 *   put:
 *     summary: 拒绝好友请求
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 好友请求拒绝成功
 *       400:
 *         description: 无效请求
 *       401:
 *         description: 未授权
 *       404:
 *         description: 请求不存在
 */
router.put('/request/:requestId/reject', protect, async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;
    
    // 查找好友请求
    const request = await FriendRequest.findById(requestId)
      .populate('sender', 'username');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: '好友请求不存在'
      });
    }
    
    // 确保当前用户是请求的接收者
    if (request.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: '您无权处理此请求'
      });
    }
    
    // 确保请求状态为待处理
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该请求已被处理'
      });
    }
    
    // 更新请求状态为已拒绝
    request.status = 'rejected';
    await request.save();
    
    // 向发送方发送通知
    const currentUser = await User.findById(userId);
    const notificationMessage = {
      type: 'system',
      content: `${currentUser.username} 拒绝了您的好友请求`,
      metadata: {
        type: 'friend_request_rejected',
        requestId: request._id,
        receiverId: currentUser._id,
        receiverName: currentUser.username
      }
    };
    
    // 创建系统消息
    const systemMessage = await global.MessageQueue.addSystemMessageToQueue(
      request.sender,
      notificationMessage
    );
    
    res.status(200).json({
      success: true,
      message: '好友请求已拒绝'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/search:
 *   get:
 *     summary: 搜索用户
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词(用户名或邮箱)
 *     responses:
 *       200:
 *         description: 搜索成功
 *       401:
 *         description: 未授权
 */
router.get('/search', protect, async (req, res, next) => {
  try {
    const { keyword } = req.query;
    const userId = req.user._id;
    
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空'
      });
    }
    
    // 构建搜索条件
    const searchCondition = {
      $or: [
        { username: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } }
      ],
      _id: { $ne: userId } // 排除自己
    };
    
    // 搜索用户
    const users = await User.find(searchCondition)
      .select('username email avatar bio status lastActive')
      .limit(20); // 限制返回数量
    
    // 查询当前用户，获取好友列表
    const currentUser = await User.findById(userId);
    
    // 为每个用户添加关系标识
    const usersWithRelation = await Promise.all(users.map(async (user) => {
      // 检查是否是好友
      const isFriend = currentUser.friends.some(friend => 
        friend.user.toString() === user._id.toString()
      );
      
      // 检查是否有待处理的好友请求
      const pendingRequest = await FriendRequest.findOne({
        $or: [
          { sender: userId, receiver: user._id, status: 'pending' },
          { sender: user._id, receiver: userId, status: 'pending' }
        ]
      });
      
      let relation = 'none';
      let requestId = null;
      let requestDirection = null;
      
      if (isFriend) {
        relation = 'friend';
      } else if (pendingRequest) {
        relation = 'pending';
        requestId = pendingRequest._id;
        requestDirection = pendingRequest.sender.toString() === userId.toString() ? 'sent' : 'received';
      }
      
      return {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
        lastActive: user.lastActive,
        relation,
        requestId,
        requestDirection
      };
    }));
    
    res.status(200).json({
      success: true,
      count: usersWithRelation.length,
      data: {
        users: usersWithRelation
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/groups:
 *   get:
 *     summary: 获取好友分组
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未授权
 */
router.get('/groups', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // 获取用户的好友分组
    const user = await User.findById(userId).select('friendGroups');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      count: user.friendGroups.length,
      data: {
        groups: user.friendGroups
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/groups:
 *   post:
 *     summary: 创建好友分组
 *     tags: [Friends]
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
 *     responses:
 *       201:
 *         description: 分组创建成功
 *       400:
 *         description: 请求错误
 *       401:
 *         description: 未授权
 */
router.post('/groups', protect, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userId = req.user._id;
    
    // 验证分组名称
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '分组名称不能为空'
      });
    }
    
    // 获取用户
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查分组名称是否已存在
    const groupExists = user.friendGroups.some(group => group.name === name);
    if (groupExists) {
      return res.status(400).json({
        success: false,
        message: '分组名称已存在'
      });
    }
    
    // 创建新分组
    const newGroup = {
      name,
      description: description || '',
      createdAt: new Date()
    };
    
    user.friendGroups.push(newGroup);
    await user.save();
    
    // 获取刚刚创建的分组
    const createdGroup = user.friendGroups[user.friendGroups.length - 1];
    
    res.status(201).json({
      success: true,
      message: '好友分组创建成功',
      data: {
        group: createdGroup
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/groups/{groupId}:
 *   put:
 *     summary: 更新好友分组
 *     tags: [Friends]
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
 *     responses:
 *       200:
 *         description: 分组更新成功
 *       400:
 *         description: 请求错误
 *       401:
 *         description: 未授权
 */
router.put('/groups/:groupId', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的分组ID'
      });
    }
    
    // 获取用户
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 查找分组
    const groupIndex = user.friendGroups.findIndex(
      group => group._id.toString() === groupId
    );
    
    if (groupIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '分组不存在'
      });
    }
    
    // 如果提供了名称，检查是否与其他分组重名
    if (name) {
      const nameExists = user.friendGroups.some(
        (group, index) => index !== groupIndex && group.name === name
      );
      
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: '分组名称已存在'
        });
      }
      
      user.friendGroups[groupIndex].name = name;
    }
    
    // 更新描述
    if (description !== undefined) {
      user.friendGroups[groupIndex].description = description;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '好友分组更新成功',
      data: {
        group: user.friendGroups[groupIndex]
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/groups/{groupId}:
 *   delete:
 *     summary: 删除好友分组
 *     tags: [Friends]
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
 *         description: 分组删除成功
 *       400:
 *         description: 请求错误
 *       401:
 *         description: 未授权
 */
router.delete('/groups/:groupId', protect, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        success: false,
        message: '无效的分组ID'
      });
    }
    
    // 获取用户
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 确保分组存在
    const groupIndex = user.friendGroups.findIndex(
      group => group._id.toString() === groupId
    );
    
    if (groupIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '分组不存在'
      });
    }
    
    // 确保不是删除默认分组
    if (groupIndex === 0) {
      return res.status(400).json({
        success: false,
        message: '不能删除默认分组'
      });
    }
    
    // 将该分组下的好友移到默认分组
    const defaultGroupId = user.friendGroups[0]._id;
    
    user.friends.forEach(friend => {
      if (friend.groupId && friend.groupId.toString() === groupId) {
        friend.groupId = defaultGroupId;
      }
    });
    
    // 删除分组
    user.friendGroups.splice(groupIndex, 1);
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '好友分组删除成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/friends/{friendId}/update:
 *   put:
 *     summary: 更新好友信息（昵称、分组）
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
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
 *               nickname:
 *                 type: string
 *               groupId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 好友信息更新成功
 *       400:
 *         description: 请求错误
 *       401:
 *         description: 未授权
 */
router.put('/:friendId/update', protect, async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const { nickname, groupId } = req.body;
    const userId = req.user._id;
    
    // 获取用户
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 确保好友存在
    const friendIndex = user.friends.findIndex(
      friend => friend.user.toString() === friendId
    );
    
    if (friendIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '好友不存在'
      });
    }
    
    // 如果提供了分组ID，确保分组存在
    if (groupId) {
      const groupExists = user.friendGroups.some(
        group => group._id.toString() === groupId
      );
      
      if (!groupExists) {
        return res.status(404).json({
          success: false,
          message: '分组不存在'
        });
      }
      
      user.friends[friendIndex].groupId = groupId;
    }
    
    // 更新昵称
    if (nickname !== undefined) {
      user.friends[friendIndex].nickname = nickname;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '好友信息更新成功',
      data: {
        friend: user.friends[friendIndex]
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 