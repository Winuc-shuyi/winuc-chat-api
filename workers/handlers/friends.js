/**
 * 好友关系管理API的处理函数
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

// 获取好友列表
async function getFriendsList(request, env, ctx, currentUser) {
  try {
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 查询好友关系
    const friendships = await db.collection('friendships').find({
      $or: [
        { user1: currentUser._id },
        { user2: currentUser._id }
      ],
      status: 'accepted'
    }).toArray();
    
    // 提取好友ID
    const friendIds = friendships.map(friendship => {
      return friendship.user1.equals(currentUser._id) ? 
        friendship.user2 : friendship.user1;
    });
    
    // 查询好友信息
    const friends = await db.collection('users').find({
      _id: { $in: friendIds }
    }, {
      projection: { password: 0 }
    }).toArray();
    
    return new Response(JSON.stringify({
      success: true,
      message: '获取好友列表成功',
      data: {
        friends
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('获取好友列表错误:', error);
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

// 发送好友请求
async function sendFriendRequest(request, env, ctx, currentUser) {
  try {
    const data = await request.json();
    const { userId } = data;
    
    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        message: '请提供用户ID'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const targetId = new ObjectId(userId);
    
    // 不能添加自己为好友
    if (currentUser._id.equals(targetId)) {
      return new Response(JSON.stringify({
        success: false,
        message: '不能添加自己为好友'
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
    
    // 验证目标用户存在
    const targetUser = await db.collection('users').findOne({ _id: targetId });
    
    if (!targetUser) {
      return new Response(JSON.stringify({
        success: false,
        message: '目标用户不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 检查是否已经是好友或有待处理的请求
    const existingFriendship = await db.collection('friendships').findOne({
      $or: [
        { user1: currentUser._id, user2: targetId },
        { user1: targetId, user2: currentUser._id }
      ]
    });
    
    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return new Response(JSON.stringify({
          success: false,
          message: '已经是好友了'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } else if (existingFriendship.status === 'pending') {
        if (existingFriendship.user1.equals(currentUser._id)) {
          return new Response(JSON.stringify({
            success: false,
            message: '已发送过好友请求，等待对方接受'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } else {
          // 对方已经发送了请求给当前用户
          return new Response(JSON.stringify({
            success: false,
            message: '对方已经发送了好友请求给您，请直接接受'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
      }
    }
    
    // 创建好友关系记录
    const friendship = {
      user1: currentUser._id,
      user2: targetId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('friendships').insertOne(friendship);
    
    // 添加通知
    await db.collection('notifications').insertOne({
      recipient: targetId,
      sender: currentUser._id,
      type: 'friend_request',
      content: `${currentUser.username} 向您发送了好友请求`,
      isRead: false,
      createdAt: new Date()
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: '好友请求已发送',
      data: {
        friendship
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('发送好友请求错误:', error);
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

// 接受或拒绝好友请求
async function respondToFriendRequest(request, env, ctx, currentUser) {
  try {
    const data = await request.json();
    const { userId, accept } = data;
    
    if (!userId || accept === undefined) {
      return new Response(JSON.stringify({
        success: false,
        message: '请提供用户ID和操作类型'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const targetId = new ObjectId(userId);
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 查找待处理的好友请求
    const friendship = await db.collection('friendships').findOne({
      user1: targetId,
      user2: currentUser._id,
      status: 'pending'
    });
    
    if (!friendship) {
      return new Response(JSON.stringify({
        success: false,
        message: '没有找到来自该用户的好友请求'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 获取发送请求的用户信息
    const requester = await db.collection('users').findOne(
      { _id: targetId },
      { projection: { password: 0 } }
    );
    
    // 处理好友请求
    if (accept) {
      // 接受请求
      await db.collection('friendships').updateOne(
        { _id: friendship._id },
        { 
          $set: { 
            status: 'accepted',
            updatedAt: new Date()
          } 
        }
      );
      
      // 添加通知
      await db.collection('notifications').insertOne({
        recipient: targetId,
        sender: currentUser._id,
        type: 'friend_accepted',
        content: `${currentUser.username} 接受了您的好友请求`,
        isRead: false,
        createdAt: new Date()
      });
      
      return new Response(JSON.stringify({
        success: true,
        message: '已接受好友请求',
        data: {
          friend: requester
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } else {
      // 拒绝请求
      await db.collection('friendships').deleteOne({ _id: friendship._id });
      
      return new Response(JSON.stringify({
        success: true,
        message: '已拒绝好友请求'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  } catch (error) {
    console.error('处理好友请求错误:', error);
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

// 删除好友
async function removeFriend(request, env, ctx, currentUser, friendId) {
  try {
    const targetId = new ObjectId(friendId);
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 验证好友关系存在
    const friendship = await db.collection('friendships').findOne({
      $or: [
        { user1: currentUser._id, user2: targetId },
        { user1: targetId, user2: currentUser._id }
      ],
      status: 'accepted'
    });
    
    if (!friendship) {
      return new Response(JSON.stringify({
        success: false,
        message: '好友关系不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 删除好友关系
    await db.collection('friendships').deleteOne({ _id: friendship._id });
    
    return new Response(JSON.stringify({
      success: true,
      message: '好友删除成功'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('删除好友错误:', error);
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
    const path = url.pathname.replace('/api/friends', '');
    
    // 验证用户认证
    const currentUser = await verifyToken(request, env);
    
    // 路由匹配
    if ((path === '' || path === '/') && request.method === 'GET') {
      // 获取好友列表
      return getFriendsList(request, env, ctx, currentUser);
    } else if (path === '/request' && request.method === 'POST') {
      // 发送好友请求
      return sendFriendRequest(request, env, ctx, currentUser);
    } else if (path === '/respond' && request.method === 'POST') {
      // 响应好友请求
      return respondToFriendRequest(request, env, ctx, currentUser);
    } else if (path.startsWith('/remove/') && request.method === 'DELETE') {
      // 删除好友
      const friendId = path.replace('/remove/', '');
      return removeFriend(request, env, ctx, currentUser, friendId);
    }
    
    // 未匹配的路由
    return new Response(JSON.stringify({
      success: false,
      message: '未找到好友API路由'
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