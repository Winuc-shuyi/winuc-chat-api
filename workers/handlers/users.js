/**
 * 用户管理API的处理函数
 */

const { ObjectId } = require('mongodb');

// CORS头信息
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 连接MongoDB
async function connectToDatabase(env) {
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

// 验证JWT令牌
async function verifyToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('未提供认证令牌');
  }
  
  const token = authHeader.split(' ')[1];
  const jwt = require('jsonwebtoken');
  
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // 获取用户信息
    const db = await connectToDatabase(env);
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(decoded.id) 
    });
    
    if (!user) {
      throw new Error('用户不存在');
    }
    
    return user;
  } catch (error) {
    console.error('令牌验证失败:', error);
    throw new Error('无效的认证令牌');
  }
}

// 获取用户列表
async function getUserList(request, env, ctx, currentUser) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 构建查询条件
    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 查询用户总数
    const total = await db.collection('users').countDocuments(query);
    
    // 查询用户列表
    const users = await db.collection('users').find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .project({ password: 0 }) // 排除密码字段
      .toArray();
    
    return new Response(JSON.stringify({
      success: true,
      message: '获取用户列表成功',
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
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

// 获取用户资料
async function getUserProfile(request, env, ctx, currentUser, userId) {
  try {
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 如果userId未指定，则返回当前用户的资料
    if (!userId) {
      return new Response(JSON.stringify({
        success: true,
        message: '获取个人资料成功',
        data: {
          user: {
            ...currentUser,
            password: undefined // 排除密码字段
          }
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 查询指定用户的资料
    const targetUser = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } } // 排除密码字段
    );
    
    if (!targetUser) {
      return new Response(JSON.stringify({
        success: false,
        message: '用户不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '获取用户资料成功',
      data: {
        user: targetUser
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('获取用户资料错误:', error);
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

// 更新用户资料
async function updateUserProfile(request, env, ctx, currentUser) {
  try {
    const data = await request.json();
    const { username, avatar, bio } = data;
    
    const updateData = {};
    
    // 只允许更新特定字段
    if (username !== undefined) updateData.username = username;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (bio !== undefined) updateData.bio = bio;
    
    // 更新时间
    updateData.updatedAt = new Date();
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 更新用户资料
    await db.collection('users').updateOne(
      { _id: currentUser._id },
      { $set: updateData }
    );
    
    // 获取更新后的用户资料
    const updatedUser = await db.collection('users').findOne(
      { _id: currentUser._id },
      { projection: { password: 0 } }
    );
    
    return new Response(JSON.stringify({
      success: true,
      message: '用户资料更新成功',
      data: {
        user: updatedUser
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('更新用户资料错误:', error);
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
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/users', '');
    
    // 验证用户认证
    const currentUser = await verifyToken(request, env);
    
    // 路由匹配
    if (path === '' || path === '/' && request.method === 'GET') {
      // 获取用户列表
      return getUserList(request, env, ctx, currentUser);
    } else if (path === '/profile' && request.method === 'GET') {
      // 获取当前用户资料
      return getUserProfile(request, env, ctx, currentUser);
    } else if (path === '/profile' && request.method === 'PUT') {
      // 更新当前用户资料
      return updateUserProfile(request, env, ctx, currentUser);
    } else if (path.startsWith('/profile/') && request.method === 'GET') {
      // 获取指定用户资料
      const userId = path.replace('/profile/', '');
      return getUserProfile(request, env, ctx, currentUser, userId);
    }
    
    // 未匹配的路由
    return new Response(JSON.stringify({
      success: false,
      message: '未找到用户API路由'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message || '认证失败'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

module.exports = { handleRequest }; 