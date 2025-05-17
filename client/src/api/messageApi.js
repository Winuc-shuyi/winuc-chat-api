import axios from 'axios';

// 获取请求头配置
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

// 获取与特定用户的消息历史
export const getMessageHistory = async (userId, limit = 50, skip = 0) => {
  try {
    const response = await axios.get(
      `/api/messages/history/${userId}?limit=${limit}&skip=${skip}`,
      getAuthConfig()
    );
    return response.data.data.messages;
  } catch (error) {
    console.error('获取消息历史失败', error);
    throw error;
  }
};

// 根据时间范围获取与特定用户的消息历史
export const getMessageHistoryByTimeRange = async (userId, startDate, endDate, limit = 50) => {
  try {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    const response = await axios.get(
      `/api/messages/history/${userId}/time-range?startDate=${start}&endDate=${end}&limit=${limit}`,
      getAuthConfig()
    );
    return response.data.data.messages;
  } catch (error) {
    console.error('根据时间范围获取消息历史失败', error);
    throw error;
  }
};

// 加载更多消息历史（用于分页）
export const loadMoreMessages = async (userId, oldestMessageId, limit = 20) => {
  try {
    const response = await axios.get(
      `/api/messages/history/${userId}/before/${oldestMessageId}?limit=${limit}`,
      getAuthConfig()
    );
    return response.data.data.messages;
  } catch (error) {
    console.error('加载更多消息失败', error);
    throw error;
  }
};

// 发送消息给用户
export const sendMessage = async (receiverId, content, type = 'text') => {
  try {
    const response = await axios.post(
      '/api/messages/send',
      { receiverId, content, type },
      getAuthConfig()
    );
    return response.data.data.message;
  } catch (error) {
    console.error('发送消息失败', error);
    throw error;
  }
};

// 发送消息给群组
export const sendGroupMessage = async (groupId, content, type = 'text') => {
  try {
    const response = await axios.post(
      '/api/messages/group/send',
      { groupId, content, type },
      getAuthConfig()
    );
    return response.data.data.message;
  } catch (error) {
    console.error('发送群组消息失败', error);
    throw error;
  }
};

// 获取消息轮询
export const pollMessages = async (sessionId, timeout = 30000) => {
  try {
    const response = await axios.get(
      `/api/poll/messages?sessionId=${sessionId}&timeout=${timeout}`,
      getAuthConfig()
    );
    return response.data.data;
  } catch (error) {
    if (error.response && error.response.status === 204) {
      // 超时，没有新消息
      return { messages: [], systemMessages: [], notifications: [] };
    }
    console.error('轮询消息失败', error);
    throw error;
  }
};

// 注册轮询会话
export const registerPollSession = async () => {
  try {
    const response = await axios.post('/api/poll/register', {}, getAuthConfig());
    return response.data.data;
  } catch (error) {
    console.error('注册轮询会话失败', error);
    throw error;
  }
};

// 注销轮询会话
export const unregisterPollSession = async (sessionId) => {
  try {
    const response = await axios.post(
      '/api/poll/unregister', 
      { sessionId },
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('注销轮询会话失败', error);
    throw error;
  }
};

// 更新用户状态
export const updateUserStatus = async (sessionId, status) => {
  try {
    const response = await axios.post(
      '/api/poll/status',
      { sessionId, status },
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('更新用户状态失败', error);
    throw error;
  }
};

// 心跳检测
export const sendPing = async (sessionId) => {
  try {
    const response = await axios.get(
      `/api/poll/ping?sessionId=${sessionId}`,
      getAuthConfig()
    );
    return response.data;
  } catch (error) {
    console.error('心跳检测失败', error);
    throw error;
  }
};

// 获取群组消息历史
export const getGroupMessageHistory = async (groupId, limit = 50, skip = 0) => {
  try {
    const response = await axios.get(
      `/api/messages/group/history/${groupId}?limit=${limit}&skip=${skip}`,
      getAuthConfig()
    );
    return response.data.data.messages;
  } catch (error) {
    console.error('获取群组消息历史失败', error);
    throw error;
  }
};

// 根据时间范围获取群组的消息历史
export const getGroupMessageHistoryByTimeRange = async (groupId, startDate, endDate, limit = 50) => {
  try {
    const start = startDate.toISOString();
    const end = endDate.toISOString();
    const response = await axios.get(
      `/api/messages/group/history/${groupId}/time-range?startDate=${start}&endDate=${end}&limit=${limit}`,
      getAuthConfig()
    );
    return response.data.data.messages;
  } catch (error) {
    console.error('根据时间范围获取群组消息历史失败', error);
    throw error;
  }
};

// 加载更多群组消息（用于分页）
export const loadMoreGroupMessages = async (groupId, oldestMessageId, limit = 20) => {
  try {
    const response = await axios.get(
      `/api/messages/group/history/${groupId}/before/${oldestMessageId}?limit=${limit}`,
      getAuthConfig()
    );
    return response.data.data.messages;
  } catch (error) {
    console.error('加载更多群组消息失败', error);
    throw error;
  }
}; 