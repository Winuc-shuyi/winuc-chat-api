const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middlewares/auth');
const crypto = require('crypto');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: 用户认证API
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 注册新用户
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: 用户注册成功
 *       400:
 *         description: 验证错误
 */
router.post(
  '/register',
  [
    body('username', '用户名不能为空').notEmpty().trim(),
    body('username', '用户名长度应为3-20个字符').isLength({ min: 3, max: 20 }),
    body('email', '请提供有效的电子邮箱').isEmail(),
    body('password', '密码至少需要6个字符').isLength({ min: 6 })
  ],
  async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      
      // 检查用户是否已存在
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名或电子邮箱已被使用'
        });
      }
      
      // 创建用户
      const user = await User.create({
        username,
        email,
        password
      });
      
      // 生成JWT令牌
      const token = user.getSignedJwtToken();
      
      res.status(201).json({
        success: true,
        message: '用户注册成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            status: user.status
          },
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 登录失败
 */
router.post(
  '/login',
  [
    body('email', '请提供有效的电子邮箱').isEmail(),
    body('password', '请提供密码').notEmpty()
  ],
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      // 检查用户是否存在
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '无效的凭据'
        });
      }
      
      // 检查密码是否匹配
      const isMatch = await user.matchPassword(password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: '无效的凭据'
        });
      }
      
      // 更新用户状态
      user.status = 'online';
      user.lastActive = Date.now();
      await user.save({ validateBeforeSave: false });
      
      // 生成JWT令牌
      const token = user.getSignedJwtToken();
      
      res.status(200).json({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            status: user.status
          },
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取用户信息成功
 *       401:
 *         description: 未授权
 */
router.get('/me', protect, async (req, res, next) => {
  try {
    // 用户信息从中间件获取
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到用户'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          status: user.status,
          friends: user.friends
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未授权
 */
router.post('/logout', protect, async (req, res, next) => {
  try {
    // 更新用户状态
    const user = req.user;
    user.status = 'offline';
    await user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: '登出成功'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: 验证JWT令牌
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 令牌有效
 *       401:
 *         description: 令牌无效或已过期
 */
router.get('/verify', protect, async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Token有效',
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
        bio: req.user.bio,
        status: req.user.status
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: 忘记密码请求重置
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: 密码重置请求已发送
 *       404:
 *         description: 用户不存在
 */
router.post(
  '/forgot-password',
  [
    body('email', '请提供有效的电子邮箱').isEmail()
  ],
  async (req, res, next) => {
    try {
      const { email } = req.body;
      
      // 查找用户
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '未找到该邮箱对应的用户'
        });
      }
      
      // 生成重置令牌
      const resetToken = crypto.randomBytes(20).toString('hex');
      
      // 加密令牌并存储
      user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      // 设置过期时间 (10分钟)
      user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
      
      await user.save({ validateBeforeSave: false });
      
      // 在实际应用中，这里应该发送重置邮件
      // 为了演示，我们直接返回重置令牌
      res.status(200).json({
        success: true,
        message: '密码重置令牌已生成',
        data: {
          resetToken
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/auth/reset-password/{resetToken}:
 *   put:
 *     summary: 使用重置令牌更新密码
 *     tags: [Auth]
 *     parameters:
 *       - name: resetToken
 *         in: path
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
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 密码重置成功
 *       400:
 *         description: 重置令牌无效或已过期
 */
router.put(
  '/reset-password/:resetToken',
  [
    body('password', '密码至少需要6个字符').isLength({ min: 6 })
  ],
  async (req, res, next) => {
    try {
      // 获取哈希令牌
      const resetToken = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex');
      
      // 查找用户
      const user = await User.findOne({
        resetPasswordToken: resetToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      
      if (!user) {
        return res.status(400).json({
          success: false,
          message: '无效或已过期的重置令牌'
        });
      }
      
      // 设置新密码
      user.password = req.body.password;
      
      // 清除重置字段
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      
      await user.save();
      
      // 生成新JWT
      const token = user.getSignedJwtToken();
      
      res.status(200).json({
        success: true,
        message: '密码重置成功',
        data: {
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: 更改当前用户密码
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       401:
 *         description: 当前密码错误
 */
router.put(
  '/change-password',
  [
    protect,
    body('currentPassword', '请提供当前密码').notEmpty(),
    body('newPassword', '新密码至少需要6个字符').isLength({ min: 6 })
  ],
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // 获取用户
      const user = await User.findById(req.user.id).select('+password');
      
      // 验证当前密码
      const isMatch = await user.matchPassword(currentPassword);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: '当前密码错误'
        });
      }
      
      // 更新密码
      user.password = newPassword;
      await user.save();
      
      // 生成新JWT
      const token = user.getSignedJwtToken();
      
      res.status(200).json({
        success: true,
        message: '密码修改成功',
        data: {
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router; 