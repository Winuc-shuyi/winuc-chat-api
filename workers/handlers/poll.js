/**
 * 长轮询API的处理函数
 * 实现实时消息接收机制
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

// 处理长轮询请求
async function handlePoll(request, env, ctx, currentUser) {
  try {
    const url = new URL(request.url);
    const timeout = parseInt(url.searchParams.get('timeout') || '30000'); // 默认30秒
    const lastMessageTime = url.searchParams.get('lastMessageTime') 
      ? new Date(url.searchParams.get('lastMessageTime')) 
      : new Date(0);
    
    // 设置最大超时时间为60秒
    const maxTimeout = 60000;
    const actualTimeout = Math.min(timeout, maxTimeout);
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 检查消息队列中是否有新消息
    const checkMessages = async () => {
      const messageQueue = await db.collection('messagequeue').find({
        userId: currentUser._id,
        delivered: false,
        createdAt: { $gt: lastMessageTime }
      }).toArray();
      
      if (messageQueue.length > 0) {
        // 获取所有消息ID
        const messageIds = messageQueue.map(item => item.messageId);
        
        // 查询完整消息内容
        const messages = await db.collection('messages').aggregate([
          { $match: { _id: { $in: messageIds } } },
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
        ]).toArray();
        
        // 标记消息为已发送
        await db.collection('messagequeue').updateMany(
          { _id: { $in: messageQueue.map(item => item._id) } },
          { $set: { delivered: true } }
        );
        
        // 返回消息
        return {
          success: true,
          message: '收到新消息',
          data: {
            messages,
            timestamp: new Date()
          }
        };
      }
      
      return null;
    };
    
    // 立即检查一次
    let result = await checkMessages();
    
    // 如果没有立即可用的消息，则使用周期性检查
    if (!result) {
      // 设置结束时间
      const endTime = Date.now() + actualTimeout;
      
      // 轮询间隔（毫秒）
      const pollInterval = 2000;
      
      return new Response(
        new ReadableStream({
          async pull(controller) {
            while (Date.now() < endTime) {
              result = await checkMessages();
              
              if (result) {
                // 找到新消息，返回结果
                const encoder = new TextEncoder();
                controller.enqueue(encoder.encode(JSON.stringify(result)));
                controller.close();
                return;
              }
              
              // 等待一段时间后再次检查
              await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            
            // 超时，返回空结果
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(JSON.stringify({
              success: true,
              message: '轮询超时，没有新消息',
              data: {
                messages: [],
                timestamp: new Date()
              }
            })));
            controller.close();
          }
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    
    // 有立即可用的消息，直接返回
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('长轮询处理错误:', error);
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
    const path = url.pathname.replace('/api/poll', '');
    
    // 验证用户认证
    const currentUser = await verifyToken(request, env);
    
    // 只处理长轮询请求
    if (path === '' || path === '/' && request.method === 'GET') {
      return handlePoll(request, env, ctx, currentUser);
    }
    
    // 未匹配的路由
    return new Response(JSON.stringify({
      success: false,
      message: '未找到长轮询API路由'
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