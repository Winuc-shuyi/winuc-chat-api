/**
 * 消息相关API的处理函数
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

// 发送私聊消息
async function sendPrivateMessage(request, env, ctx, currentUser) {
  try {
    const data = await request.json();
    const { content, receiver } = data;
    
    if (!content || !receiver) {
      return new Response(JSON.stringify({
        success: false,
        message: '请提供消息内容和接收者ID'
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
    
    // 验证接收者存在
    const receiverUser = await db.collection('users').findOne({ 
      _id: new ObjectId(receiver) 
    });
    
    if (!receiverUser) {
      return new Response(JSON.stringify({
        success: false,
        message: '接收者不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 创建消息对象
    const message = {
      sender: currentUser._id,
      receiver: receiverUser._id,
      content,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 保存消息
    const result = await db.collection('messages').insertOne(message);
    
    // 将消息添加到消息队列
    await db.collection('messagequeue').insertOne({
      userId: receiverUser._id,
      messageId: result.insertedId,
      type: 'private',
      delivered: false,
      createdAt: new Date()
    });
    
    // 添加通知
    await db.collection('notifications').insertOne({
      recipient: receiverUser._id,
      sender: currentUser._id,
      type: 'message',
      content: `您收到来自 ${currentUser.username} 的新消息`,
      relatedId: result.insertedId,
      isRead: false,
      createdAt: new Date()
    });
    
    // 查询完整的消息对象（包含发送者信息）
    const fullMessage = await db.collection('messages').aggregate([
      { $match: { _id: result.insertedId } },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      { $unwind: '$sender' },
      {
        $project: {
          'sender.password': 0
        }
      }
    ]).next();
    
    return new Response(JSON.stringify({
      success: true,
      message: '消息发送成功',
      data: {
        message: fullMessage
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('发送消息错误:', error);
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

// 获取私聊历史消息
async function getPrivateMessages(request, env, ctx, currentUser, userId) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 验证对方用户存在
    const otherUser = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });
    
    if (!otherUser) {
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
    
    // 查询消息历史
    const messages = await db.collection('messages').aggregate([
      {
        $match: {
          $or: [
            { sender: currentUser._id, receiver: otherUser._id },
            { sender: otherUser._id, receiver: currentUser._id }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      { $unwind: '$sender' },
      {
        $project: {
          'sender.password': 0
        }
      },
      { $sort: { createdAt: 1 } } // 返回时按时间正序排列
    ]).toArray();
    
    // 更新未读消息状态
    await db.collection('messages').updateMany(
      {
        sender: otherUser._id,
        receiver: currentUser._id,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );
    
    // 获取消息总数
    const total = await db.collection('messages').countDocuments({
      $or: [
        { sender: currentUser._id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: currentUser._id }
      ]
    });
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit
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
    console.error('获取消息历史错误:', error);
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
    // 验证用户认证
    const currentUser = await verifyToken(request, env);
    
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/messages', '');
    
    // 处理不同的路由
    if (path === '/send' && request.method === 'POST') {
      return sendPrivateMessage(request, env, ctx, currentUser);
    } else if (path.startsWith('/private/') && request.method === 'GET') {
      const userId = path.split('/').pop();
      return getPrivateMessages(request, env, ctx, currentUser, userId);
    }
    
    // 其他消息相关路由可以继续添加...
    
    // 未匹配的路由
    return new Response(JSON.stringify({
      success: false,
      message: '未找到消息API路由'
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
      message: error.message || '未授权访问'
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