/**
 * 认证相关API的处理函数
 */

// CORS头信息
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 连接MongoDB
async function connectToDatabase(env) {
  // 使用环境变量中的MongoDB URI
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(env.MONGODB_URI);
  
  try {
    await client.connect();
    return client.db('winuc-chat');
  } catch (error) {
    console.error('MongoDB连接失败:', error);
    throw new Error('数据库连接失败');
  }
}

// 处理用户登录
async function handleLogin(request, env, ctx) {
  try {
    const data = await request.json();
    const { email, password } = data;
    
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        message: '请提供电子邮箱和密码'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 连接数据库
    const db = await connectToDatabase(env);
    const usersCollection = db.collection('users');
    
    // 查找用户
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        message: '用户不存在'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 验证密码
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return new Response(JSON.stringify({
        success: false,
        message: '密码错误'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 生成JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN || '24h' }
    );
    
    // 更新用户最后活动时间
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastActive: new Date() } }
    );
    
    // 移除密码字段
    delete user.password;
    
    return new Response(JSON.stringify({
      success: true,
      message: '登录成功',
      data: {
        token,
        user
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('登录处理错误:', error);
    return new Response(JSON.stringify({
      success: false,
      message: '服务器错误',
      error: env.ENVIRONMENT === 'development' ? error.message : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// API请求入口函数
async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/auth', '');
  
  // 根据路径和HTTP方法处理不同请求
  if (path === '/login' && request.method === 'POST') {
    return handleLogin(request, env, ctx);
  } 
  
  // 其他认证相关路由可以继续添加...
  
  // 未匹配的路由
  return new Response(JSON.stringify({
    success: false,
    message: '未找到认证API路由'
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

module.exports = { handleRequest }; 