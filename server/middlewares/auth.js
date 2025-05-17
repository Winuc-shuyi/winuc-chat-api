const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由：需要登录
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
      return res.status(401).json({
        success: false,
        message: '未授权，令牌无效',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } catch (err) {
    next(err);
  }
};

// 授权：检查角色
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

// 检查群组权限
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
      next(err);
    }
  };
}; 