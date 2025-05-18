/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             token:
 *               type: string
 *               description: JWT认证令牌
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * 保护路由中间件 - 需要登录才能访问
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 * @returns {void}
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 从请求头中获取token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // 检查token是否存在
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未授权，请登录'
      });
    }
    
    try {
      // 验证token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'winuc_secret_key');
      
      // 查找用户
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '找不到该用户'
        });
      }
      
      // 更新用户最后活跃时间
      user.lastActive = Date.now();
      await user.save({ validateBeforeSave: false });
      
      // 添加用户到请求对象
      req.user = user;
      next();
    } catch (err) {
      let message = '未授权，令牌无效';
      
      // 提供更具体的错误信息
      if (err.name === 'TokenExpiredError') {
        message = '令牌已过期，请重新登录';
      } else if (err.name === 'JsonWebTokenError') {
        message = '令牌无效，请重新登录';
      }
      
      return res.status(401).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } catch (err) {
    console.error('认证中间件错误:', err);
    next(err);
  }
};

/**
 * 授权中间件 - 检查用户角色权限
 * @param {...string} roles - 允许访问的角色列表
 * @returns {Function} Express中间件函数
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权，请登录'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '禁止访问，没有足够的权限'
      });
    }
    
    next();
  };
};

/**
 * 检查群组权限中间件
 * @param {string} requiredRole - 所需的群组角色，默认为'admin'
 * @returns {Function} Express中间件函数
 */
exports.checkGroupPermission = (requiredRole = 'admin') => {
  return async (req, res, next) => {
    try {
      const groupId = req.params.groupId || req.body.groupId;
      const userId = req.user._id;
      
      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: '缺少群组ID'
        });
      }
      
      // 查找群组
      const Group = require('../models/Group');
      const group = await Group.findById(groupId);
      
      if (!group) {
        return res.status(404).json({
          success: false,
          message: '群组不存在'
        });
      }
      
      // 检查用户是否在群组中
      const memberInfo = group.members.find(
        member => member.user.toString() === userId.toString()
      );
      
      if (!memberInfo) {
        return res.status(403).json({
          success: false,
          message: '您不是该群组的成员'
        });
      }
      
      // 检查用户角色
      if (requiredRole === 'admin' && memberInfo.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '您没有管理员权限'
        });
      }
      
      // 添加群组和成员信息到请求对象
      req.group = group;
      req.memberInfo = memberInfo;
      next();
    } catch (err) {
      console.error('群组权限检查错误:', err);
      next(err);
    }
  };
}; 