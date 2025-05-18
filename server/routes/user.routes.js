const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 用户管理API
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     description: 获取系统中的用户列表，支持分页和搜索
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页显示数量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词，检索用户名和邮箱
 *     responses:
 *       200:
 *         description: 获取用户列表成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 成功获取用户列表
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         pages:
 *                           type: integer
 *                           example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const startIndex = (page - 1) * limit;
    
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 排除当前用户
    query._id = { $ne: req.user._id };
    
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('username email avatar bio status lastActive')
      .skip(startIndex)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      message: '成功获取用户列表',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: 获取特定用户信息
 *     description: 根据用户ID获取用户详细信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 获取用户信息成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 成功获取用户信息
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('username email avatar bio status lastActive');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到该用户'
      });
    }
    
    res.status(200).json({
      success: true,
      message: '成功获取用户信息',
      data: {
        user
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: 更新用户个人资料
 *     description: 更新当前登录用户的个人资料信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               avatar:
 *                 type: string
 *                 description: 头像URL
 *               bio:
 *                 type: string
 *                 description: 个人简介
 *     responses:
 *       200:
 *         description: 更新用户资料成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 个人资料更新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: 请求错误
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/profile', protect, async (req, res, next) => {
    try {
    const { username, avatar, bio } = req.body;
    const updateFields = {};
      
    // 验证用户名唯一性
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ username });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '该用户名已被使用'
        });
      }
      
      updateFields.username = username;
    }
    
    if (avatar) updateFields.avatar = avatar;
    if (bio) updateFields.bio = bio;
      
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    ).select('username email avatar bio status');
      
      res.status(200).json({
        success: true,
        message: '个人资料更新成功',
        data: {
        user
        }
      });
    } catch (err) {
      next(err);
    }
});

/**
 * @swagger
 * /api/users/status:
 *   put:
 *     summary: 更新用户状态
 *     description: 更新当前登录用户的在线状态
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [online, offline, away, busy]
 *                 description: 用户状态
 *     responses:
 *       200:
 *         description: 更新用户状态成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 状态更新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: online
 *       400:
 *         description: 无效的状态值
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.put('/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!status || !['online', 'offline', 'away', 'busy'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '状态值无效'
      });
    }
    
    await User.findByIdAndUpdate(req.user._id, { status });
    
    res.status(200).json({
      success: true,
      message: '状态更新成功',
      data: {
        status
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: 搜索用户
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         required: true
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 搜索成功
 *       401:
 *         description: 未授权
 */
router.get('/search', protect, async (req, res, next) => {
  try {
    const keyword = req.query.keyword;
    
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: '请提供搜索关键词'
      });
    }
    
    // 使用正则表达式进行模糊搜索
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // 排除当前用户
        {
          $or: [
            { username: { $regex: keyword, $options: 'i' } },
            { email: { $regex: keyword, $options: 'i' } }
          ]
        }
      ]
    }).select('username email avatar bio status lastActive');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: {
        users
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 