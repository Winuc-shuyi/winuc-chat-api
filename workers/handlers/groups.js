/**
 * 群组功能API的处理函数
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

// 创建群组
async function createGroup(request, env, ctx, currentUser) {
  try {
    const data = await request.json();
    const { name, description } = data;
    
    if (!name) {
      return new Response(JSON.stringify({
        success: false,
        message: '请提供群组名称'
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
    
    // 创建群组
    const group = {
      name,
      description: description || '',
      avatar: '', // 默认头像为空
      createdBy: currentUser._id,
      members: [
        { 
          userId: currentUser._id, 
          role: 'admin',  // 创建者默认为管理员
          joinedAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('groups').insertOne(group);
    
    // 获取完整的群组信息
    const createdGroup = await db.collection('groups').findOne({ _id: result.insertedId });
    
    return new Response(JSON.stringify({
      success: true,
      message: '群组创建成功',
      data: {
        group: createdGroup
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('创建群组错误:', error);
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

// 获取群组列表
async function getGroupList(request, env, ctx, currentUser) {
  try {
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 查找当前用户参与的所有群组
    const groups = await db.collection('groups').find({
      'members.userId': currentUser._id
    }).toArray();
    
    return new Response(JSON.stringify({
      success: true,
      message: '获取群组列表成功',
      data: {
        groups
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('获取群组列表错误:', error);
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

// 获取群组详情
async function getGroupDetail(request, env, ctx, currentUser, groupId) {
  try {
    const targetId = new ObjectId(groupId);
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 查找群组
    const group = await db.collection('groups').findOne({ _id: targetId });
    
    if (!group) {
      return new Response(JSON.stringify({
        success: false,
        message: '群组不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 验证用户是否是群组成员
    const isMember = group.members.some(member => 
      member.userId.equals(currentUser._id)
    );
    
    if (!isMember) {
      return new Response(JSON.stringify({
        success: false,
        message: '您不是该群组的成员'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 获取成员详细信息
    const memberIds = group.members.map(member => member.userId);
    const memberDetails = await db.collection('users').find(
      { _id: { $in: memberIds } },
      { projection: { password: 0 } }
    ).toArray();
    
    // 合并成员信息
    const membersWithDetails = group.members.map(member => {
      const userDetail = memberDetails.find(user => 
        user._id.equals(member.userId)
      );
      
      return {
        ...member,
        user: userDetail
      };
    });
    
    // 返回带成员详情的群组信息
    const groupWithDetails = {
      ...group,
      members: membersWithDetails
    };
    
    return new Response(JSON.stringify({
      success: true,
      message: '获取群组详情成功',
      data: {
        group: groupWithDetails
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('获取群组详情错误:', error);
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

// 发送群组消息
async function sendGroupMessage(request, env, ctx, currentUser, groupId) {
  try {
    const data = await request.json();
    const { content } = data;
    
    if (!content) {
      return new Response(JSON.stringify({
        success: false,
        message: '请提供消息内容'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const targetId = new ObjectId(groupId);
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 查找群组
    const group = await db.collection('groups').findOne({ _id: targetId });
    
    if (!group) {
      return new Response(JSON.stringify({
        success: false,
        message: '群组不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 验证用户是否是群组成员
    const isMember = group.members.some(member => 
      member.userId.equals(currentUser._id)
    );
    
    if (!isMember) {
      return new Response(JSON.stringify({
        success: false,
        message: '您不是该群组的成员，无法发送消息'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 创建消息
    const message = {
      sender: currentUser._id,
      groupId: targetId,
      content,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 保存消息
    const result = await db.collection('groupMessages').insertOne(message);
    
    // 向群组成员添加消息队列（除了发送者）
    const otherMembers = group.members
      .filter(member => !member.userId.equals(currentUser._id))
      .map(member => member.userId);
    
    if (otherMembers.length > 0) {
      const queueItems = otherMembers.map(userId => ({
        userId,
        messageId: result.insertedId,
        type: 'group',
        delivered: false,
        createdAt: new Date()
      }));
      
      await db.collection('messagequeue').insertMany(queueItems);
      
      // 添加通知
      const notifications = otherMembers.map(userId => ({
        recipient: userId,
        sender: currentUser._id,
        type: 'group_message',
        content: `${currentUser.username} 在群组 ${group.name} 中发送了新消息`,
        relatedId: result.insertedId,
        groupId: targetId,
        isRead: false,
        createdAt: new Date()
      }));
      
      await db.collection('notifications').insertMany(notifications);
    }
    
    // 查询完整的消息对象（包含发送者信息）
    const fullMessage = await db.collection('groupMessages').aggregate([
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
      message: '群组消息发送成功',
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
    console.error('发送群组消息错误:', error);
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

// 邀请用户加入群组
async function inviteToGroup(request, env, ctx, currentUser, groupId) {
  try {
    const data = await request.json();
    const { userIds } = data;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: '请提供有效的用户ID列表'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const targetId = new ObjectId(groupId);
    
    // 连接数据库
    const db = await connectToDatabase(env);
    
    // 查找群组
    const group = await db.collection('groups').findOne({ _id: targetId });
    
    if (!group) {
      return new Response(JSON.stringify({
        success: false,
        message: '群组不存在'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 验证当前用户是否是管理员
    const currentMember = group.members.find(member => 
      member.userId.equals(currentUser._id)
    );
    
    if (!currentMember || currentMember.role !== 'admin') {
      return new Response(JSON.stringify({
        success: false,
        message: '只有群组管理员才能邀请用户'
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 转换用户ID为ObjectId
    const targetUserIds = userIds.map(id => new ObjectId(id));
    
    // 过滤已经是成员的用户
    const existingMemberIds = group.members.map(member => 
      member.userId.toString()
    );
    
    const newUserIds = targetUserIds.filter(id => 
      !existingMemberIds.includes(id.toString())
    );
    
    if (newUserIds.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: '所有用户已经是群组成员'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 验证用户存在
    const users = await db.collection('users').find(
      { _id: { $in: newUserIds } },
      { projection: { password: 0 } }
    ).toArray();
    
    if (users.length !== newUserIds.length) {
      return new Response(JSON.stringify({
        success: false,
        message: '部分用户不存在'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 添加新成员
    const newMembers = users.map(user => ({
      userId: user._id,
      role: 'member',
      joinedAt: new Date()
    }));
    
    await db.collection('groups').updateOne(
      { _id: targetId },
      { 
        $push: { 
          members: { $each: newMembers } 
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );
    
    // 添加通知
    const notifications = users.map(user => ({
      recipient: user._id,
      sender: currentUser._id,
      type: 'group_invite',
      content: `${currentUser.username} 邀请您加入群组 ${group.name}`,
      groupId: targetId,
      isRead: false,
      createdAt: new Date()
    }));
    
    await db.collection('notifications').insertMany(notifications);
    
    // 获取更新后的群组信息
    const updatedGroup = await db.collection('groups').findOne({ _id: targetId });
    
    return new Response(JSON.stringify({
      success: true,
      message: '用户邀请成功',
      data: {
        group: updatedGroup,
        invitedUsers: users
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('邀请用户加入群组错误:', error);
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
    const path = url.pathname.replace('/api/groups', '');
    
    // 验证用户认证
    const currentUser = await verifyToken(request, env);
    
    // 路由匹配
    if (path === '' && request.method === 'POST') {
      // 创建群组
      return createGroup(request, env, ctx, currentUser);
    } else if ((path === '' || path === '/') && request.method === 'GET') {
      // 获取群组列表
      return getGroupList(request, env, ctx, currentUser);
    } else if (path.match(/^\/[a-f\d]{24}$/) && request.method === 'GET') {
      // 获取群组详情
      const groupId = path.substring(1);
      return getGroupDetail(request, env, ctx, currentUser, groupId);
    } else if (path.match(/^\/[a-f\d]{24}\/messages$/) && request.method === 'POST') {
      // 发送群组消息
      const groupId = path.match(/^\/([a-f\d]{24})\/messages$/)[1];
      return sendGroupMessage(request, env, ctx, currentUser, groupId);
    } else if (path.match(/^\/[a-f\d]{24}\/invite$/) && request.method === 'POST') {
      // 邀请用户加入群组
      const groupId = path.match(/^\/([a-f\d]{24})\/invite$/)[1];
      return inviteToGroup(request, env, ctx, currentUser, groupId);
    }
    
    // 未匹配的路由
    return new Response(JSON.stringify({
      success: false,
      message: '未找到群组API路由'
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