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
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取用户列表成功
 *       401:
 *         description: 未授权
 */
router.get('/', protect, async (req, res, next) => {
  try {
    // 简单分页
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 不返回当前用户
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username email avatar bio status lastActive')
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments({ _id: { $ne: req.user._id } });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: {
        users,
        pagination: {
          total,
          page,
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
 *     summary: 获取单个用户信息
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 获取用户信息成功
 *       401:
 *         description: 未授权
 *       404:
 *         description: 用户不存在
 */
router.get('/:id', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username email avatar bio status lastActive');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.status(200).json({
      success: true,
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
 *               avatar:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: 个人资料更新成功
 *       400:
 *         description: 请求错误
 *       401:
 *         description: 未授权
 */
router.put(
  '/profile',
  protect,
  [
    body('bio', '个人简介不能超过200个字符').optional().isLength({ max: 200 })
  ],
  async (req, res, next) => {
    try {
      const { avatar, bio } = req.body;
      
      // 查找用户
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      // 更新资料
      if (avatar) user.avatar = avatar;
      if (bio) user.bio = bio;
      
      await user.save();
      
      res.status(200).json({
        success: true,
        message: '个人资料更新成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            status: user.status
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

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